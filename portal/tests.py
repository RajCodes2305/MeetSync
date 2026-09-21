"""
MeetSync tests.

Run with:  python manage.py test
(The test runner uses a temporary SQLite database automatically via
MS_TEST_SQLITE in settings, so MySQL is not needed for tests.)
"""
from datetime import date, time, timedelta

from django.test import Client, TestCase
from django.urls import reverse
from django.utils import timezone

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
    book_slot,
    cancel_appointment,
    complete_appointment,
    create_slots_for_event,
    expand_window,
    reschedule_appointment,
)


def make_world():
    """1 teacher, 1 student, a helper to create extra parents."""
    teacher_user = User.objects.create_user("T", "t@x.com", "pw", "teacher")
    teacher = Teacher.objects.create(
        user=teacher_user, employee_id="F1", department="CS"
    )
    student = Student.objects.create(
        roll_no="CS1", name="Kid", department="CS", year="3", section="A"
    )

    def make_parent(email):
        u = User.objects.create_user("P", email, "pw", "parent")
        return Parent.objects.create(user=u)

    return teacher, student, make_parent


def make_event_and_slots(teacher, status=PtmEvent.Status.ACTIVE):
    event = PtmEvent.objects.create(
        title="PTM", venue="Hall",
        start_date=date(2030, 1, 1), end_date=date(2030, 1, 1),
        start_time=time(10, 0), end_time=time(11, 0),
        slot_duration=30, status=status,
    )
    create_slots_for_event(teacher, event)
    return event


class ServiceTests(TestCase):
    def test_expand_window(self):
        pairs = expand_window(date(2030, 1, 1), time(10, 0), time(11, 0), 30)
        self.assertEqual(pairs, [(time(10, 0), time(10, 30)), (time(10, 30), time(11, 0))])

    def test_expand_window_ignores_leftover(self):
        # 70 minutes with 30-minute slots -> only 2 slots, 10 minutes dropped
        pairs = expand_window(date(2030, 1, 1), time(10, 0), time(11, 10), 30)
        self.assertEqual(len(pairs), 2)

    def test_create_slots_multi_day(self):
        teacher, _, _ = make_world()
        event = PtmEvent.objects.create(
            title="PTM", venue="Hall",
            start_date=date(2030, 1, 1), end_date=date(2030, 1, 3),
            start_time=time(10, 0), end_time=time(11, 0),
            slot_duration=30, status=PtmEvent.Status.DRAFT,
        )
        n = create_slots_for_event(teacher, event)
        self.assertEqual(n, 6)  # 3 days x 2 slots
        self.assertEqual(Slot.objects.filter(event=event).count(), 6)

    def test_book_success_locks_child(self):
        teacher, student, make_parent = make_world()
        event = make_event_and_slots(teacher)
        parent = make_parent("p1@x.com")
        ParentStudent.objects.create(parent=parent, student=student)

        slot = Slot.objects.filter(status=Slot.Status.AVAILABLE).first()
        appointment = book_slot(parent, slot.id)

        self.assertEqual(appointment.student, student)  # forced to own child
        slot.refresh_from_db()
        self.assertEqual(slot.status, Slot.Status.BOOKED)

    def test_book_requires_child_lock(self):
        teacher, _, make_parent = make_world()
        make_event_and_slots(teacher)
        stranger = make_parent("nochild@x.com")
        slot = Slot.objects.first()
        with self.assertRaises(BookingError):
            book_slot(stranger, slot.id)

    def test_two_parents_cannot_share_one_child(self):
        """The schema itself (OneToOne) prevents two parents claiming the same child.
        The service still checks the lock via a fresh query, so it must not crash."""
        teacher, student, make_parent = make_world()
        make_event_and_slots(teacher)
        p1 = make_parent("p1@x.com")
        p2 = make_parent("p2@x.com")
        ParentStudent.objects.create(parent=p1, student=student)

        slot = Slot.objects.first()
        book_slot(p1, slot.id)
        # p2 has no lock at all -> friendly error, not a crash
        with self.assertRaises(BookingError):
            book_slot(p2, slot.id)

    def test_draft_event_not_bookable(self):
        teacher, student, make_parent = make_world()
        make_event_and_slots(teacher, status=PtmEvent.Status.DRAFT)
        parent = make_parent("p1@x.com")
        ParentStudent.objects.create(parent=parent, student=student)
        with self.assertRaises(BookingError):
            book_slot(parent, Slot.objects.first().id)

    def test_one_booking_per_student_per_event(self):
        teacher, student, make_parent = make_world()
        event = make_event_and_slots(teacher)
        parent = make_parent("p1@x.com")
        ParentStudent.objects.create(parent=parent, student=student)

        slots = list(Slot.objects.order_by("start_time"))
        book_slot(parent, slots[0].id)
        with self.assertRaises(BookingError):
            book_slot(parent, slots[1].id)

    def test_cancel_frees_slot(self):
        teacher, student, make_parent = make_world()
        event = make_event_and_slots(teacher)
        parent = make_parent("p1@x.com")
        ParentStudent.objects.create(parent=parent, student=student)

        appointment = book_slot(parent, Slot.objects.first().id)
        cancel_appointment(appointment, "cannot come")
        slot = Slot.objects.first()
        slot.refresh_from_db()
        self.assertEqual(slot.status, Slot.Status.AVAILABLE)
        self.assertEqual(appointment.status, Appointment.Status.CANCELLED)

    def test_reschedule_moves_and_frees_old(self):
        teacher, student, make_parent = make_world()
        event = make_event_and_slots(teacher)
        parent = make_parent("p1@x.com")
        ParentStudent.objects.create(parent=parent, student=student)

        slots = list(Slot.objects.order_by("start_time"))
        first = book_slot(parent, slots[0].id)
        second = reschedule_appointment(first, slots[1].id)

        slots[0].refresh_from_db()
        slots[1].refresh_from_db()
        self.assertEqual(slots[0].status, Slot.Status.AVAILABLE)
        self.assertEqual(slots[1].status, Slot.Status.BOOKED)
        self.assertEqual(second.student, student)

    def test_freed_slot_can_be_booked_again(self):
        """Regression: a slot with a cancelled appointment must be bookable
        again (the old Express schema made this impossible)."""
        teacher, student, make_parent = make_world()
        event = make_event_and_slots(teacher)
        p1 = make_parent("p1@x.com")
        p2 = make_parent("p2@x.com")
        s1 = Student.objects.create(roll_no="CS2", name="Kid2", department="CS", year="3", section="A")
        ParentStudent.objects.create(parent=p1, student=student)
        ParentStudent.objects.create(parent=p2, student=s1)

        slot = Slot.objects.first()
        first = book_slot(p1, slot.id)
        cancel_appointment(first, "cannot come")

        second = book_slot(p2, slot.id)  # must not raise
        slot.refresh_from_db()
        self.assertEqual(slot.status, Slot.Status.BOOKED)
        self.assertEqual(second.student, s1)

    def test_complete_sets_remarks(self):
        teacher, student, make_parent = make_world()
        event = make_event_and_slots(teacher)
        parent = make_parent("p1@x.com")
        ParentStudent.objects.create(parent=parent, student=student)

        appointment = book_slot(parent, Slot.objects.first().id)
        complete_appointment(appointment, "good progress")
        self.assertEqual(appointment.status, Appointment.Status.COMPLETED)
        self.assertEqual(appointment.remarks, "good progress")


class ViewTests(TestCase):
    def setUp(self):
        self.client = Client()

    def test_register_creates_permanent_lock(self):
        _, student, _ = make_world()
        response = self.client.post(reverse("register"), {
            "name": "New Parent", "email": "np@x.com",
            "phone": "", "password": "pw12345", "confirm": "pw12345",
            "student": student.id,
        })
        self.assertRedirects(response, reverse("login"))
        parent = Parent.objects.get(user__email="np@x.com")
        self.assertTrue(ParentStudent.objects.filter(parent=parent, student=student).exists())

    def test_register_cannot_claim_taken_child(self):
        teacher, student, make_parent = make_world()
        p = make_parent("taken@x.com")
        ParentStudent.objects.create(parent=p, student=student)
        response = self.client.post(reverse("register"), {
            "name": "X", "email": "x@x.com", "phone": "",
            "password": "pw", "confirm": "pw", "student": student.id,
        })
        self.assertEqual(response.status_code, 200)
        self.assertFalse(User.objects.filter(email="x@x.com").exists())

    def test_login_redirects_by_role(self):
        User.objects.create_user("T", "t@x.com", "pw", "teacher")
        response = self.client.post(reverse("login"), {
            "email": "t@x.com", "password": "pw",
        })
        self.assertRedirects(response, reverse("teacher_dashboard"))

        User.objects.create_user("P", "p@x.com", "pw", "parent")
        self.client.logout()
        response = self.client.post(reverse("login"), {
            "email": "p@x.com", "password": "pw",
        })
        self.assertRedirects(response, reverse("parent_dashboard"))

    def test_parent_pages_require_login(self):
        for url in ["parent_dashboard", "parent_appointments", "parent_directory"]:
            response = self.client.get(reverse(url))
            self.assertEqual(response.status_code, 302)

    def test_booking_flow_through_views(self):
        teacher, student, _ = make_world()
        event = make_event_and_slots(teacher)
        # parent registers through the form and books through the form
        self.client.post(reverse("register"), {
            "name": "Flow Parent", "email": "flow@x.com", "phone": "",
            "password": "pw12345", "confirm": "pw12345", "student": student.id,
        })
        self.assertTrue(User.objects.filter(email="flow@x.com").exists())
        self.client.post(reverse("login"), {"email": "flow@x.com", "password": "pw12345"})

        slot = Slot.objects.first()
        response = self.client.post(
            reverse("parent_book", args=[teacher.id]), {"slot_id": slot.id}
        )
        self.assertRedirects(response, reverse("parent_appointments"))
        self.assertTrue(Appointment.objects.filter(slot=slot, student=student).exists())

        # the appointment shows up on their list
        response = self.client.get(reverse("parent_appointments"))
        self.assertContains(response, student.name)

    def test_teacher_pages_reject_parents(self):
        _, _, make_parent = make_world()
        p = make_parent("p@x.com")
        self.client.force_login(p.user)
        response = self.client.get(reverse("teacher_students"))
        self.assertEqual(response.status_code, 302)  # bounced home
