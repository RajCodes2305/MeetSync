"""
MeetSync - every table in one small file.

user          -> one login row for parents AND teachers
student       -> academic info, managed by the teacher
parentstudent -> the PERMANENT one-child-per-parent lock
ptmevent      -> a PTM window (draft -> active -> closed)
slot          -> one meeting time inside an event
appointment   -> a parent books one slot for their own child
"""
from django.contrib.auth.base_user import AbstractBaseUser, BaseUserManager
from django.contrib.auth.models import PermissionsMixin
from django.db import models


class UserManager(BaseUserManager):
    """Tiny manager - create_user works for both roles."""

    def create_user(self, name, email, password, role):
        if role not in ("parent", "teacher"):
            raise ValueError("role must be parent or teacher")
        user = self.model(
            name=name,
            email=self.normalize_email(email),
            role=role,
        )
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password):
        return self.create_user("Admin", email, password, "teacher")


class User(AbstractBaseUser, PermissionsMixin):
    ROLE_PARENT = "parent"
    ROLE_TEACHER = "teacher"

    name = models.CharField(max_length=100)
    email = models.EmailField(max_length=150, unique=True)
    role = models.CharField(
        max_length=10,
        choices=[(ROLE_PARENT, "Parent"), (ROLE_TEACHER, "Teacher")],
    )
    created_at = models.DateTimeField(auto_now_add=True)

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["name"]

    class Meta:
        db_table = "users"

    def __str__(self):
        return f"{self.name} ({self.role})"


class Student(models.Model):
    YEAR_CHOICES = [(str(y), f"Year {y}") for y in range(1, 5)]

    roll_no = models.CharField(max_length=30, unique=True)
    name = models.CharField(max_length=100)
    department = models.CharField(max_length=80)
    year = models.CharField(max_length=1, choices=YEAR_CHOICES)
    section = models.CharField(max_length=5)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "students"
        ordering = ["roll_no"]

    def __str__(self):
        return f"{self.roll_no} {self.name}"


class Parent(models.Model):
    """Extends User - parent profile."""

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="parent_profile")
    phone = models.CharField(max_length=20, blank=True, null=True)

    class Meta:
        db_table = "parents"

    def __str__(self):
        return self.user.name


class Teacher(models.Model):
    """Extends User - teacher profile."""

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="teacher_profile")
    employee_id = models.CharField(max_length=30, unique=True)
    department = models.CharField(max_length=80)
    designation = models.CharField(max_length=60, blank=True, null=True)

    class Meta:
        db_table = "teachers"

    def __str__(self):
        return self.user.name


class ParentStudent(models.Model):
    """
    The PERMANENT one-child-per-parent lock.
    Created once at registration, never touched again.
    """

    parent = models.ForeignKey(Parent, on_delete=models.CASCADE, related_name="links")
    student = models.OneToOneField(
        Student, on_delete=models.CASCADE, related_name="guardian_link"
    )

    class Meta:
        db_table = "parent_students"

    def __str__(self):
        return f"{self.parent} -> {self.student}"


class PtmEvent(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        ACTIVE = "active", "Active"
        CLOSED = "closed", "Closed"

    title = models.CharField(max_length=150)
    venue = models.CharField(max_length=150)
    start_date = models.DateField()
    end_date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    slot_duration = models.PositiveIntegerField(default=15)  # minutes
    status = models.CharField(
        max_length=10, choices=Status.choices, default=Status.DRAFT
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "ptm_events"
        ordering = ["-start_date"]

    def __str__(self):
        return self.title


class Slot(models.Model):
    class Status(models.TextChoices):
        AVAILABLE = "available", "Available"
        BOOKED = "booked", "Booked"
        BLOCKED = "blocked", "Blocked"

    teacher = models.ForeignKey(Teacher, on_delete=models.CASCADE, related_name="slots")
    event = models.ForeignKey(PtmEvent, on_delete=models.CASCADE, related_name="slots")
    date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    status = models.CharField(
        max_length=10, choices=Status.choices, default=Status.AVAILABLE
    )

    class Meta:
        db_table = "slots"
        ordering = ["date", "start_time"]
        constraints = [
            models.UniqueConstraint(
                fields=["teacher", "event", "date", "start_time"],
                name="unique_slot",
            )
        ]

    def __str__(self):
        return f"{self.date} {self.start_time}-{self.end_time}"


class Appointment(models.Model):
    class Status(models.TextChoices):
        BOOKED = "booked", "Booked"
        COMPLETED = "completed", "Completed"
        CANCELLED = "cancelled", "Cancelled"

    # NOT unique on purpose: a cancelled appointment keeps its slot id in
    # history, and the slot can be booked again by someone else. The
    # slot.status flag is what prevents double bookings.
    slot = models.ForeignKey(Slot, on_delete=models.CASCADE, related_name="appointments")
    parent = models.ForeignKey(Parent, on_delete=models.CASCADE, related_name="appointments")
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name="appointments")
    event = models.ForeignKey(PtmEvent, on_delete=models.CASCADE, related_name="appointments")
    status = models.CharField(
        max_length=10, choices=Status.choices, default=Status.BOOKED
    )
    remarks = models.TextField(blank=True, null=True)      # private, teacher only
    cancel_reason = models.CharField(max_length=255, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "appointments"
        ordering = ["-created_at"]

    def __str__(self):
        return f"#{self.id} {self.student} {self.status}"
