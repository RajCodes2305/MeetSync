"""
MeetSync demo data command.

    python manage.py seed_demo

Creates: 1 teacher, 10 students, 10 parents (each locked to their own
child), one active PTM event with auto-generated slots, and 5 sample
appointments (3 booked, 1 completed with remarks, 1 cancelled).

Safe to run again: it wipes the demo tables first (like database.sql did).
"""
import random
from datetime import datetime, time, timedelta

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from portal.models import (
    Appointment,
    Parent,
    ParentStudent,
    PtmEvent,
    Slot,
    Student,
    Teacher,
    User,
)
from portal.services import create_slots_for_event

STUDENTS = [
    ("CS2101", "Arjun Menon"), ("CS2102", "Divya Krishnan"),
    ("CS2103", "Ravi Verma"), ("CS2104", "Sneha Reddy"),
    ("CS2105", "Karthik Pillai"), ("CS2106", "Ananya Iyer"),
    ("CS2107", "Vikram Rao"), ("CS2108", "Pooja Sharma"),
    ("CS2109", "Aditya Nair"), ("CS2110", "Ishita Bose"),
]


class Command(BaseCommand):
    help = "Reset the database to the MeetSync demo dataset"

    @transaction.atomic
    def handle(self, *args, **options):
        # wipe (order matters for FKs)
        Appointment.objects.all().delete()
        Slot.objects.all().delete()
        PtmEvent.objects.all().delete()
        ParentStudent.objects.all().delete()
        Parent.objects.all().delete()
        Student.objects.all().delete()
        User.objects.filter(role=User.ROLE_PARENT).delete()
        Teacher.objects.all().delete()
        User.objects.filter(role=User.ROLE_TEACHER).delete()

        # --- teacher ---
        teacher_user = User.objects.create_user(
            name="Dr. Anil Kumar", email="anil@meetsync.com",
            password="teacher123", role=User.ROLE_TEACHER,
        )
        teacher = Teacher.objects.create(
            user=teacher_user, employee_id="FAC001",
            department="Computer Science", designation="Class Teacher - CS A",
        )

        # --- students + 1:1 parents ---
        parents = []
        for i, (roll, name) in enumerate(STUDENTS, start=1):
            student = Student.objects.create(
                roll_no=roll, name=name,
                department="Computer Science", year="3", section="A",
            )
            pu = User.objects.create_user(
                name=f"Parent of {name.split()[0]}",
                email=f"parent{i}@meetsync.com",
                password="parent123", role=User.ROLE_PARENT,
            )
            parent = Parent.objects.create(user=pu, phone=f"98765{10000 + i}")
            ParentStudent.objects.create(parent=parent, student=student)
            parents.append(parent)
        self.stdout.write("  1 teacher, 10 students, 10 parents (1:1 locked)")

        # --- active PTM event next week + auto slots ---
        today = datetime.now().date()
        monday = today + timedelta(days=(7 - today.weekday()) % 7 or 7)
        event = PtmEvent.objects.create(
            title="Semester PTM - odd sem",
            venue="Main Block, Seminar Hall 1",
            start_date=monday,
            end_date=monday + timedelta(days=4),
            start_time=time(10, 0), end_time=time(12, 0),
            slot_duration=30,
            status=PtmEvent.Status.ACTIVE,
        )
        created = create_slots_for_event(teacher, event)
        self.stdout.write(f"  event '{event.title}' with {created} slots")

        # --- 5 sample appointments: 3 booked, 1 completed, 1 cancelled ---
        free = list(
            Slot.objects.filter(status=Slot.Status.AVAILABLE).order_by("date", "start_time")
        )
        random.seed(42)
        sample = free[:5]
        for i, slot in enumerate(sample):
            slot.status = Slot.Status.BOOKED
            slot.save(update_fields=["status"])
            appointment = Appointment.objects.create(
                slot=slot, parent=parents[i], student=parents[i].links.first().student,
                event=event, status=Appointment.Status.BOOKED,
            )
            if i == 3:
                appointment.status = Appointment.Status.COMPLETED
                appointment.remarks = "Discussed quarterly test scores. Extra practice suggested for math."
                appointment.save(update_fields=["status", "remarks"])
            if i == 4:
                appointment.status = Appointment.Status.CANCELLED
                appointment.cancel_reason = "Parent cannot travel that day."
                slot.status = Slot.Status.AVAILABLE
                slot.save(update_fields=["status"])
                appointment.save(update_fields=["status", "cancel_reason"])

        booked = Appointment.objects.filter(status=Appointment.Status.BOOKED).count()
        self.stdout.write(
            f"  5 sample appointments ({booked} booked, 1 completed, 1 cancelled)"
        )
        self.stdout.write(self.style.SUCCESS("Demo data ready. Logins: anil@meetsync.com/teacher123, parent1@meetsync.com/parent123"))
