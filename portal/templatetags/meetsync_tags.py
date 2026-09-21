"""
MeetSync - small template filters for nicer display.
"""
from django import template

register = template.Library()


@register.filter
def t12(value):
    """"14:30:00" -> "2:30 PM" for templates."""
    if not value:
        return ""
    s = str(value)
    if len(s) > 5:
        s = s[:5]
    try:
        h, m = map(int, s.split(":"))
    except ValueError:
        return s
    ampm = "AM" if h < 12 else "PM"
    h12 = h % 12 or 12
    return f"{h12}:{m:02d} {ampm}"


@register.filter
def status_badge(value):
    """Bootstrap badge class for appointment/slot/event status."""
    return {
        "booked": "bg-warning text-dark",
        "completed": "bg-success",
        "cancelled": "bg-secondary",
        "available": "bg-success",
        "blocked": "bg-secondary",
        "draft": "bg-secondary",
        "active": "bg-success",
        "closed": "bg-dark",
    }.get(value, "bg-primary")
