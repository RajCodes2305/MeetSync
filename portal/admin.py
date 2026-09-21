from django.contrib import admin

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


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "email", "role")
    search_fields = ("name", "email")
    list_filter = ("role",)


@admin.register(Student)
class StudentAdmin(admin.ModelAdmin):
    list_display = ("roll_no", "name", "department", "year", "section")
    search_fields = ("roll_no", "name")


@admin.register(Parent)
class ParentAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "phone")


@admin.register(Teacher)
class TeacherAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "employee_id", "department", "designation")


@admin.register(ParentStudent)
class ParentStudentAdmin(admin.ModelAdmin):
    list_display = ("id", "parent", "student")


@admin.register(PtmEvent)
class PtmEventAdmin(admin.ModelAdmin):
    list_display = (
        "id", "title", "venue", "start_date", "end_date",
        "slot_duration", "status",
    )
    list_filter = ("status",)


@admin.register(Slot)
class SlotAdmin(admin.ModelAdmin):
    list_display = ("id", "teacher", "event", "date", "start_time", "end_time", "status")
    list_filter = ("status", "event")


@admin.register(Appointment)
class AppointmentAdmin(admin.ModelAdmin):
    list_display = ("id", "slot", "parent", "student", "event", "status")
    list_filter = ("status", "event")
