"""
MeetSync - business rules, ported 1:1 from the old Express API.

Booking rules (unchanged):
  1. the child comes from the parent's PERMANENT lock, never from the form
  2. the slot must still be "available" (row lock decides who wins)
  3. the event must be "active"
  4. one booked appointment per student per event
  5. reschedule = claim the new slot first, then cancel the old one
"""
from datetime import datetime, timedelta

from django.db import transaction

from .models import (
    Appointment,
    ParentStudent,
    PtmEvent,
    Slot,
)


class BookingError(Exception):
    """Raised with a friendly message the templates show directly."""


def expand_window(date, start_time, end_time, duration):
    """Split one day's time window into (start, end) pairs of `duration` minutes."""
    result = []
    cursor = datetime.combine(date, start_time)
    end_dt = datetime.combine(date, end_time)
    step = timedelta(minutes=duration)
    while cursor + step <= end_dt:
        result.append((cursor.time(), (cursor + step).time()))
        cursor += step
    return result


def create_slots_for_event(teacher, event):
    """
    Auto-create availability: for every day of the event, split the daily
    window into equal slots. Called right after event creation.
    """
    step = event.slot_duration or 30
    day = event.start_date
    created = 0
    rows = []
    while day <= event.end_date and created < 500:
        for start, end in expand_window(day, event.start_time, event.end_time, step):
            rows.append(
                Slot(teacher=teacher, event=event, date=day, start_time=start, end_time=end)
            )
            created += 1
            if created >= 500:
                break
        day += timedelta(days=1)
    Slot.objects.bulk_create(rows, ignore_conflicts=True)
    return created


def add_slots(teacher, event, date, start_time, end_time, duration):
    """Manual top-up slots for one date (duplicates are skipped)."""
    created = 0
    rows = []
    for start, end in expand_window(date, start_time, end_time, duration or 30):
        rows.append(
            Slot(teacher=teacher, event=event, date=date, start_time=start, end_time=end)
        )
        created += 1
    Slot.objects.bulk_create(rows, ignore_conflicts=True)
    return created


def book_slot(parent, slot_id, reschedule_id=None):
    """
    Book a slot for the parent's own child.

    Concurrency: select_for_update locks the slot row. If two parents
    click at the same moment, the second one sees status != available
    and gets a friendly error. The whole thing is one transaction.
    """
    with transaction.atomic():
        # 1. the child comes from the permanent lock, NEVER from the request
        link = ParentStudent.objects.select_related("student").filter(parent=parent).first()
        if link is None:
            raise BookingError("No child is linked to your account. Contact the teacher.")
        student = link.student

        # 2. lock the slot row
        try:
            slot = Slot.objects.select_for_update().select_related("event").get(id=slot_id)
        except Slot.DoesNotExist:
            raise BookingError("Slot not found.")

        if slot.status != Slot.Status.AVAILABLE:
            raise BookingError("Sorry, this slot was just booked by someone else.")

        # 3. the event must be active
        if slot.event.status != PtmEvent.Status.ACTIVE:
            raise BookingError("Booking is closed for this event.")

        # 4. one booked appointment per student per event
        already = (
            Appointment.objects.filter(
                student=student,
                event=slot.event,
                status=Appointment.Status.BOOKED,
            )
            .exclude(id=reschedule_id or 0)
            .exists()
        )
        if already:
            raise BookingError(
                "This student already has an appointment for this event. Cancel it first."
            )

        # 5. claim + create
        slot.status = Slot.Status.BOOKED
        slot.save(update_fields=["status"])
        appointment = Appointment.objects.create(
            slot=slot,
            parent=parent,
            student=student,
            event=slot.event,
            status=Appointment.Status.BOOKED,
        )

        # 6. reschedule: cancel the OLD appointment only after the new one is safe
        if reschedule_id:
            old = (
                Appointment.objects.select_for_update()
                .filter(id=reschedule_id, parent=parent, status=Appointment.Status.BOOKED)
                .first()
            )
            if old:
                old.status = Appointment.Status.CANCELLED
                old.cancel_reason = "Rescheduled"
                old.save(update_fields=["status", "cancel_reason"])
                old.slot.status = Slot.Status.AVAILABLE
                old.slot.save(update_fields=["status"])

    return appointment


def cancel_appointment(appointment, reason=None):
    """Cancel a booked appointment and free its slot immediately."""
    if appointment.status != Appointment.Status.BOOKED:
        raise BookingError("Only booked appointments can be cancelled.")
    with transaction.atomic():
        appointment.status = Appointment.Status.CANCELLED
        appointment.cancel_reason = reason or None
        appointment.save(update_fields=["status", "cancel_reason"])
        appointment.slot.status = Slot.Status.AVAILABLE
        appointment.slot.save(update_fields=["status"])


def reschedule_appointment(appointment, new_slot_id):
    """
    Reschedule: claim the new slot first; if that fails the original
    booking is untouched (same safety as the old API).
    """
    if appointment.status != Appointment.Status.BOOKED:
        raise BookingError("Only booked appointments can be rescheduled.")
    with transaction.atomic():
        try:
            new_slot = Slot.objects.select_for_update().get(id=new_slot_id)
        except Slot.DoesNotExist:
            raise BookingError("New slot not found for this event.")
        if new_slot.event_id != appointment.event_id:
            raise BookingError("New slot not found for this event.")
        if new_slot.status != Slot.Status.AVAILABLE:
            raise BookingError(
                "That slot is no longer available. Your original booking is safe."
            )
        return book_slot(appointment.parent, new_slot_id, reschedule_id=appointment.id)


def complete_appointment(appointment, remarks=None):
    """Teacher marks the meeting done, with optional private remarks."""
    if appointment.status != Appointment.Status.BOOKED:
        raise BookingError("Only booked appointments can be completed.")
    appointment.status = Appointment.Status.COMPLETED
    appointment.remarks = remarks or None
    appointment.save(update_fields=["status", "remarks"])
