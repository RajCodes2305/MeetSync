"""
MeetSync - access decorators.

role_required("parent")      -> parent accounts only
role_required("teacher")     -> teacher accounts only (Django superusers too,
                                so /admin/ staff can inspect the portal)
login_not_required           -> nothing, listed for readability
"""
from django.contrib.auth.decorators import login_required
from django.shortcuts import redirect


def role_required(*roles):
    def wrap(view):
        def wrapped(request, *args, **kwargs):
            if not request.user.is_authenticated:
                return redirect("login")
            if request.user.role not in roles and not request.user.is_superuser:
                return redirect("home")
            return view(request, *args, **kwargs)
        return wrapped
    return wrap


def parent_required(view):
    return login_required(role_required("parent")(view))


def teacher_required(view):
    return login_required(role_required("teacher")(view))
