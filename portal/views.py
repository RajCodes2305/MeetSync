"""
MeetSync views - public pages + parent portal.

Thin functions over the services layer.
"""
from django.contrib import messages
from django.contrib.auth import login, logout
from django.db import transaction
from django.db.models import Count, Q
from django.shortcuts import get_object_or_404, redirect, render
from datetime import datetime

from .decorators import parent_required
from .forms import CancelForm, LoginForm, RegisterForm
from .models import (
    Appointment,
    Parent,
    ParentStudent,
    PtmEvent,
    Slot,
    Student,
    Teacher,
    User,
)
from .services import BookingError, book_slot, cancel_appointment, reschedule_appointment


# =========================================================
# PUBLIC
# =========================================================

def home(request):
    return render(request, "portal/public/home.html")


def privacy(request):
    return render(request, "portal/public/privacy.html")


def login_view(request):
    if request.user.is_authenticated:
        return redirect("home")
    if request.method == "POST":
        form = LoginForm(request.POST)
        if form.is_valid():
            user = form.cleaned_data["user"]
            login(request, user)
            if user.role == User.ROLE_TEACHER:
                return redirect("teacher_dashboard")
            return redirect("parent_dashboard")
    else:
        form = LoginForm()
    return render(request, "portal/public/login.html", {"form": form})


def register_view(request):
    if request.method == "POST":
        form = RegisterForm(request.POST)
        if form.is_valid():
            data = form.cleaned_data
            with transaction.atomic():
                user = User.objects.create_user(
                    name=data["name"],
                    email=data["email"].lower(),
                    password=data["password"],
                    role=User.ROLE_PARENT,
                )
                parent = Parent.objects.create(user=user, phone=data.get("phone") or None)
                # the PERMANENT lock - chosen once, never changeable
                ParentStudent.objects.create(parent=parent, student=data["student"])
            messages.success(request, "Account created. Please log in.")
            return redirect("login")
    else:
        form = RegisterForm()
    return render(request, "portal/public/register.html", {"form": form})


def logout_view(request):
    """POST-friendly logout (also accepts GET for the navbar link)."""
    logout(request)
    return redirect("home")


def directory(request):
    """Public teacher directory with open slot counts."""
    teachers = Teacher.objects.select_related("user").annotate(
        open_slots=Count(
            "slots",
            filter=Q(
                slots__status=Slot.Status.AVAILABLE,
                slots__event__status=PtmEvent.Status.ACTIVE,
            ),
        )
    )
    return render(request, "portal/public/directory.html", {"teachers": teachers})


# =========================================================
# PARENT PORTAL
# =========================================================

def _parent_profile(request):
    profile, _ = Parent.objects.get_or_create(user=request.user)
    return profile


def _my_student(parent):
    link = ParentStudent.objects.select_related("student").filter(parent=parent).first()
    return link.student if link else None


@parent_required
def parent_dashboard(request):
    parent = _parent_profile(request)
    appointments = (
        Appointment.objects.select_related(
            "slot", "slot__event", "slot__teacher__user", "student"
        )
        .filter(parent=parent)
        .order_by("-slot__date", "-slot__start_time")
    )
    upcoming = appointments.filter(status=Appointment.Status.BOOKED)
    past = appointments.exclude(status=Appointment.Status.BOOKED)
    return render(request, "portal/parent/dashboard.html", {
        "student": _my_student(parent),
        "upcoming": upcoming,
        "past": past,
    })


@parent_required
def parent_student_page(request):
    parent = _parent_profile(request)
    return render(request, "portal/parent/student.html", {"student": _my_student(parent)})


@parent_required
def parent_directory(request):
    parent = _parent_profile(request)
    teachers = Teacher.objects.select_related("user").annotate(
        open_slots=Count(
            "slots",
            filter=Q(
                slots__status=Slot.Status.AVAILABLE,
                slots__event__status=PtmEvent.Status.ACTIVE,
            ),
        )
    )
    already = Appointment.objects.filter(
        parent=parent, status=Appointment.Status.BOOKED
    ).values_list("event_id", flat=True)
    return render(request, "portal/parent/directory.html", {
        "teachers": teachers,
        "booked_event_ids": set(already),
    })


@parent_required
def parent_book(request, teacher_id):
    """
    3-step wizard: pick date -> pick slot -> confirm.
    The child is fixed, so no student step exists.
    """
    parent = _parent_profile(request)
    teacher = get_object_or_404(Teacher, id=teacher_id)
    student = _my_student(parent)

    slots = (
        Slot.objects.filter(
            teacher=teacher,
            status=Slot.Status.AVAILABLE,
            event__status=PtmEvent.Status.ACTIVE,
        )
        .select_related("event")
        .order_by("date", "start_time")
    )

    # group slots by date for the day cards
    by_date = {}
    for s in slots:
        by_date.setdefault(s.date, []).append(s)
    days = sorted(by_date.items())

    selected_date = request.GET.get("date")
    day_slots = None
    if selected_date:
        try:
            day_slots = by_date.get(datetime.strptime(selected_date, "%Y-%m-%d").date(), [])
        except ValueError:
            day_slots = []

    error = None
    if request.method == "POST":
        slot_id = request.POST.get("slot_id")
        try:
            appointment = book_slot(parent, slot_id)
            messages.success(
                request,
                f"Appointment booked for {student.name if student else 'your child'} "
                f"on {appointment.slot.date} at {appointment.slot.start_time}.",
            )
            return redirect("parent_appointments")
        except BookingError as e:
            error = str(e)

    return render(request, "portal/parent/book.html", {
        "teacher": teacher,
        "student": student,
        "days": days,
        "selected_date": selected_date,
        "day_slots": day_slots,
        "error": error,
        "has_booking": student is not None and Appointment.objects.filter(
            student=student, status=Appointment.Status.BOOKED,
            event__status=PtmEvent.Status.ACTIVE,
        ).exists(),
    })


@parent_required
def parent_appointments(request):
    parent = _parent_profile(request)
    appointments = (
        Appointment.objects.select_related(
            "slot", "slot__event", "slot__teacher__user", "student"
        )
        .filter(parent=parent)
        .order_by("-slot__date", "-slot__start_time")
    )
    upcoming = appointments.filter(status=Appointment.Status.BOOKED)
    past = appointments.exclude(status=Appointment.Status.BOOKED)
    return render(request, "portal/parent/appointments.html", {
        "upcoming": upcoming,
        "past": past,
    })


@parent_required
def parent_cancel(request, appointment_id):
    parent = _parent_profile(request)
    appointment = get_appointment(parent, appointment_id)
    if appointment is None:
        messages.error(request, "Appointment not found.")
        return redirect("parent_appointments")

    if request.method == "POST":
        form = CancelForm(request.POST)
        if form.is_valid():
            try:
                cancel_appointment(appointment, form.cleaned_data["reason"])
                messages.success(request, "Appointment cancelled. The slot is free again.")
            except BookingError as e:
                messages.error(request, str(e))
            return redirect("parent_appointments")
    return redirect("parent_appointments")


@parent_required
def parent_reschedule(request, appointment_id):
    """Pick a new slot - the old booking stays safe until the new one is claimed."""
    parent = _parent_profile(request)
    appointment = get_appointment(parent, appointment_id)
    if appointment is None:
        messages.error(request, "Appointment not found.")
        return redirect("parent_appointments")

    slots = (
        Slot.objects.filter(
            event=appointment.event,
            status=Slot.Status.AVAILABLE,
        )
        .exclude(id=appointment.slot_id)
        .order_by("date", "start_time")
    )

    if request.method == "POST":
        try:
            reschedule_appointment(appointment, request.POST.get("slot_id"))
            messages.success(request, "Appointment rescheduled.")
            return redirect("parent_appointments")
        except BookingError as e:
            messages.error(request, str(e))
            return redirect("parent_appointments")

    return render(request, "portal/parent/reschedule.html", {
        "appointment": appointment,
        "slots": slots,
    })


def get_appointment(parent, appointment_id):
    return (
        Appointment.objects.select_related("slot", "event", "student")
        .filter(id=appointment_id, parent=parent)
        .first()
    )
