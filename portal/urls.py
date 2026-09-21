"""
MeetSync URL map.
"""
from django.urls import path

from . import views, views_teacher

urlpatterns = [
    # public
    path("", views.home, name="home"),
    path("privacy/", views.privacy, name="privacy"),
    path("login/", views.login_view, name="login"),
    path("register/", views.register_view, name="register"),
    path("logout/", views.logout_view, name="logout"),
    path("directory/", views.directory, name="directory"),

    # parent
    path("parent/", views.parent_dashboard, name="parent_dashboard"),
    path("parent/student/", views.parent_student_page, name="parent_student"),
    path("parent/find-teacher/", views.parent_directory, name="parent_directory"),
    path("parent/book/<int:teacher_id>/", views.parent_book, name="parent_book"),
    path("parent/appointments/", views.parent_appointments, name="parent_appointments"),
    path("parent/appointments/<int:appointment_id>/cancel/", views.parent_cancel, name="parent_cancel"),
    path("parent/appointments/<int:appointment_id>/reschedule/", views.parent_reschedule, name="parent_reschedule"),

    # teacher
    path("teacher/", views_teacher.teacher_dashboard, name="teacher_dashboard"),
    path("teacher/students/", views_teacher.teacher_students, name="teacher_students"),
    path("teacher/students/<int:student_id>/edit/", views_teacher.teacher_student_edit, name="teacher_student_edit"),
    path("teacher/students/<int:student_id>/delete/", views_teacher.teacher_student_delete, name="teacher_student_delete"),
    path("teacher/parents/", views_teacher.teacher_parents, name="teacher_parents"),
    path("teacher/parents/<int:parent_id>/delete/", views_teacher.teacher_parent_delete, name="teacher_parent_delete"),
    path("teacher/events/", views_teacher.teacher_events, name="teacher_events"),
    path("teacher/events/<int:event_id>/status/", views_teacher.teacher_event_status, name="teacher_event_status"),
    path("teacher/events/<int:event_id>/delete/", views_teacher.teacher_event_delete, name="teacher_event_delete"),
    path("teacher/availability/", views_teacher.teacher_availability, name="teacher_availability"),
    path("teacher/slots/<int:slot_id>/delete/", views_teacher.teacher_slot_delete, name="teacher_slot_delete"),
    path("teacher/appointments/", views_teacher.teacher_appointments, name="teacher_appointments"),
    path("teacher/appointments/<int:appointment_id>/", views_teacher.teacher_appointment, name="teacher_appointment"),
    path("teacher/appointments/<int:appointment_id>/complete/", views_teacher.teacher_appointment_complete, name="teacher_appointment_complete"),
    path("teacher/appointments/<int:appointment_id>/cancel/", views_teacher.teacher_appointment_cancel, name="teacher_appointment_cancel"),
    path("teacher/reports/", views_teacher.teacher_reports, name="teacher_reports"),
]
