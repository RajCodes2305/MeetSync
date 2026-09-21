"""
MeetSync views - teacher portal.

Everything the old admin+faculty routes did, for teacher accounts.
"""
from datetime import datetime

from django.contrib import messages
from django.contrib.auth.hashers import make_password
from django.db.models import Count, Q
from django.shortcuts import get_object_or_404, redirect, render

from .decorators import teacher_required
from .forms import AddSlotsForm, EventForm, ReasonForm, RemarksForm, StudentForm
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
from .services import (
    BookingError,
    add_slots,
    cancel_appointment,
    complete_appointment,
    create_slots_for_event,
)


def _teacher_profile(request):
    """Self-healing: a teacher user without a profile row gets one on the fly
    (seeded/created teachers always have proper values; this just avoids 500s)."""
    profile, _ = Teacher.objects.get_or_create(
        user=request.user,
        defaults={
            "employee_id": f"FAC{request.user.id:04d}",
            "department": "General",
        },
    )
    return profile


@teacher_required
def teacher_dashboard(request):
    teacher = _teacher_profile(request)
    today = datetime.now().date()

    appointments = (
        Appointment.objects.select_related(
            "slot", "slot__event", "parent__user", "student"
        )
        .filter(slot__teacher=teacher)
    )
    upcoming = appointments.filter(status=Appointment.Status.BOOKED).order_by("slot__date", "slot__start_time")
    today_count = upcoming.filter(slot__date=today).count()
    completed = appointments.filter(status=Appointment.Status.COMPLETED).count()

    event = PtmEvent.objects.filter(status=PtmEvent.Status.ACTIVE).first()
    open_slots = Slot.objects.filter(teacher=teacher, status=Slot.Status.AVAILABLE).count()

    return render(request, "portal/teacher/dashboard.html", {
        "upcoming": upcoming[:5],
        "upcoming_count": upcoming.count(),
        "today_count": today_count,
        "completed_count": completed,
        "open_slots": open_slots,
        "active_event": event,
    })


@teacher_required
def teacher_students(request):
    # guardian map built separately: reverse one-to-one cannot be select_related
    students = list(Student.objects.all())
    links = {
        link.student_id: link
        for link in ParentStudent.objects.select_related("parent__user")
    }
    for s in students:
        s.guardian = links.get(s.id)

    if request.method == "POST":
        form = StudentForm(request.POST)
        if form.is_valid():
            try:
                form.save()
                messages.success(request, "Student added.")
                return redirect("teacher_students")
            except Exception:
                form.add_error("roll_no", "Roll number already exists.")
    else:
        form = StudentForm()

    return render(request, "portal/teacher/students.html", {
        "students": students,
        "form": form,
    })


@teacher_required
def teacher_student_edit(request, student_id):
    student = get_object_or_404(Student, id=student_id)
    if request.method == "POST":
        form = StudentForm(request.POST, instance=student)
        if form.is_valid():
            form.save()
            messages.success(request, "Student updated.")
            return redirect("teacher_students")
    else:
        form = StudentForm(instance=student)
    return render(request, "portal/teacher/student_edit.html", {"form": form, "student": student})


@teacher_required
def teacher_student_delete(request, student_id):
    student = get_object_or_404(Student, id=student_id)
    if request.method == "POST":
        try:
            student.delete()
            messages.success(request, "Student deleted.")
        except Exception:
            messages.error(request, "Cannot delete: this student has appointments or a linked parent.")
    return redirect("teacher_students")


@teacher_required
def teacher_parents(request):
    # students with no parent account yet, for the create form
    free_students = Student.objects.filter(guardian_link__isnull=True)

    if request.method == "POST":
        name = (request.POST.get("name") or "").strip()
        email = (request.POST.get("email") or "").strip().lower()
        password = request.POST.get("password") or ""
        phone = (request.POST.get("phone") or "").strip()
        student_id = request.POST.get("student")

        if not (name and email and password and student_id):
            messages.error(request, "Name, email, password and child are required.")
        elif User.objects.filter(email__iexact=email).exists():
            messages.error(request, "An account with this email already exists.")
        else:
            with_parent_link = Student.objects.filter(id=student_id, guardian_link__isnull=True).first()
            if with_parent_link is None:
                messages.error(request, "This student is already linked to a parent account.")
            else:
                user = User.objects.create(
                    name=name, email=email,
                    password=make_password(password),
                    role=User.ROLE_PARENT,
                )
                parent = Parent.objects.create(user=user, phone=phone or None)
                ParentStudent.objects.create(parent=parent, student=with_parent_link)
                messages.success(request, "Parent account created and child linked.")
        return redirect("teacher_parents")

    parents = Parent.objects.select_related("user").prefetch_related("links__student")
    return render(request, "portal/teacher/parents.html", {
        "parents": parents,
        "free_students": free_students,
    })


@teacher_required
def teacher_parent_delete(request, parent_id):
    parent = get_object_or_404(Parent, id=parent_id)
    if request.method == "POST":
        parent.user.delete()  # cascades to Parent profile + lock
        messages.success(request, "Parent deleted. The child can be claimed again.")
    return redirect("teacher_parents")


@teacher_required
def teacher_events(request):
    if request.method == "POST":
        form = EventForm(request.POST)
        if form.is_valid():
            data = form.cleaned_data
            event = PtmEvent.objects.create(
                title=data["title"],
                venue=data["venue"],
                start_date=data["start_date"],
                end_date=data["end_date"],
                start_time=data["start_time"],
                end_time=data["end_time"],
                slot_duration=data["slot_duration"],
                status=PtmEvent.Status.DRAFT,
            )
            created = create_slots_for_event(_teacher_profile(request), event)
            messages.success(
                request,
                f"Event created with {created} slot(s) added to your availability. "
                "Activate it when you are ready for bookings.",
            )
            return redirect("teacher_events")
    else:
        form = EventForm()

    events = PtmEvent.objects.annotate(
        total_slots=Count("slots", distinct=True),
        booked_slots=Count("slots", filter=Q(slots__status=Slot.Status.BOOKED), distinct=True),
    )
    return render(request, "portal/teacher/events.html", {"events": events, "form": form})


@teacher_required
def teacher_event_status(request, event_id):
    event = get_object_or_404(PtmEvent, id=event_id)
    if request.method == "POST":
        status = request.POST.get("status")
        if status in (PtmEvent.Status.DRAFT, PtmEvent.Status.ACTIVE, PtmEvent.Status.CLOSED):
            event.status = status
            event.save(update_fields=["status"])
            messages.success(request, f"Event is now {event.get_status_display()}.")
    return redirect("teacher_events")


@teacher_required
def teacher_event_delete(request, event_id):
    event = get_object_or_404(PtmEvent, id=event_id)
    if request.method == "POST":
        if event.slots.filter(status=Slot.Status.BOOKED).exists():
            messages.error(request, "Cannot delete: this event has booked slots. Cancel those appointments first.")
        else:
            event.delete()
            messages.success(request, "Event deleted.")
    return redirect("teacher_events")


@teacher_required
def teacher_availability(request):
    teacher = _teacher_profile(request)

    if request.method == "POST":
        form = AddSlotsForm(request.POST)
        if form.is_valid():
            data = form.cleaned_data
            event = data["event"]
            created = add_slots(
                teacher, event, data["date"],
                data["start_time"], data["end_time"], data["duration"],
            )
            messages.success(request, f"{created} slot(s) created (duplicates skipped).")
            return redirect("teacher_availability")
    else:
        form = AddSlotsForm()

    slots = Slot.objects.filter(teacher=teacher).select_related("event")
    by_date = {}
    for s in slots:
        by_date.setdefault(s.date, []).append(s)
    days = sorted(by_date.items(), reverse=True)

    return render(request, "portal/teacher/availability.html", {
        "days": days,
        "form": form,
    })


@teacher_required
def teacher_slot_delete(request, slot_id):
    slot = get_object_or_404(Slot, id=slot_id, teacher=_teacher_profile(request))
    if request.method == "POST":
        if slot.status == Slot.Status.BOOKED:
            messages.error(request, "This slot is booked - cancel the appointment first.")
        else:
            slot.delete()
            messages.success(request, "Slot removed.")
    return redirect("teacher_availability")


@teacher_required
def teacher_appointments(request):
    teacher = _teacher_profile(request)
    filter_status = request.GET.get("status", "")

    appointments = (
        Appointment.objects.select_related(
            "slot", "slot__event", "parent__user", "student"
        )
        .filter(slot__teacher=teacher)
        .order_by("-slot__date", "-slot__start_time")
    )
    if filter_status in (Appointment.Status.BOOKED, Appointment.Status.COMPLETED, Appointment.Status.CANCELLED):
        appointments = appointments.filter(status=filter_status)

    return render(request, "portal/teacher/appointments.html", {
        "appointments": appointments,
        "filter_status": filter_status,
    })


@teacher_required
def teacher_appointment(request, appointment_id):
    appointment = get_object_or_404(
        Appointment, id=appointment_id, slot__teacher=_teacher_profile(request)
    )
    return render(request, "portal/teacher/appointment_detail.html", {"appointment": appointment})


@teacher_required
def teacher_appointment_complete(request, appointment_id):
    appointment = get_object_or_404(
        Appointment, id=appointment_id, slot__teacher=_teacher_profile(request)
    )
    if request.method == "POST":
        form = RemarksForm(request.POST)
        if form.is_valid():
            try:
                complete_appointment(appointment, form.cleaned_data["remarks"])
                messages.success(request, "Marked as completed.")
            except BookingError as e:
                messages.error(request, str(e))
    return redirect("teacher_appointment", appointment_id=appointment.id)


@teacher_required
def teacher_appointment_cancel(request, appointment_id):
    appointment = get_object_or_404(
        Appointment, id=appointment_id, slot__teacher=_teacher_profile(request)
    )
    if request.method == "POST":
        form = ReasonForm(request.POST)
        if form.is_valid():
            try:
                cancel_appointment(appointment, form.cleaned_data["reason"] or "Cancelled by teacher")
                messages.success(request, "Appointment cancelled. The slot is free again.")
            except BookingError as e:
                messages.error(request, str(e))
    return redirect("teacher_appointments")


@teacher_required
def teacher_reports(request):
    status_counts = Appointment.objects.aggregate(
        booked=Count("id", filter=Q(status=Appointment.Status.BOOKED)),
        completed=Count("id", filter=Q(status=Appointment.Status.COMPLETED)),
        cancelled=Count("id", filter=Q(status=Appointment.Status.CANCELLED)),
        total=Count("id"),
    )
    counts = {
        "students": Student.objects.count(),
        "parents": Parent.objects.count(),
        "events": PtmEvent.objects.count(),
        "open_slots": Slot.objects.filter(status=Slot.Status.AVAILABLE).count(),
    }
    per_event = (
        PtmEvent.objects.annotate(
            total=Count("slots", distinct=True),
            booked=Count("slots", filter=Q(slots__status=Slot.Status.BOOKED), distinct=True),
        )
    )
    return render(request, "portal/teacher/reports.html", {
        "status_counts": status_counts,
        "counts": counts,
        "per_event": per_event,
    })
