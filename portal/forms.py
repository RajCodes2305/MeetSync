"""
MeetSync - forms.

Plain Django Forms + Bootstrap classes. No crispy, no extras.
"""
from django import forms
from django.contrib.auth import authenticate

from .models import Slot, Student, User


class LoginForm(forms.Form):
    email = forms.EmailField(
        widget=forms.EmailInput(attrs={"class": "form-control", "placeholder": "you@example.com"})
    )
    password = forms.CharField(
        widget=forms.PasswordInput(attrs={"class": "form-control", "placeholder": "Password"})
    )

    def clean(self):
        cleaned = super().clean()
        email = cleaned.get("email")
        password = cleaned.get("password")
        if email and password:
            user = authenticate(username=email, password=password)
            if user is None:
                raise forms.ValidationError("Invalid email or password.")
            cleaned["user"] = user
        return cleaned


class RegisterForm(forms.Form):
    """Parent registration - includes the one-time child choice."""

    name = forms.CharField(
        max_length=100,
        widget=forms.TextInput(attrs={"class": "form-control", "placeholder": "Your full name"}),
    )
    email = forms.EmailField(
        widget=forms.EmailInput(attrs={"class": "form-control", "placeholder": "you@example.com"})
    )
    phone = forms.CharField(
        max_length=20,
        required=False,
        widget=forms.TextInput(attrs={"class": "form-control", "placeholder": "Optional"}),
    )
    password = forms.CharField(
        widget=forms.PasswordInput(attrs={"class": "form-control", "placeholder": "Choose a password"})
    )
    confirm = forms.CharField(
        label="Confirm password",
        widget=forms.PasswordInput(attrs={"class": "form-control", "placeholder": "Repeat password"}),
    )
    student = forms.ModelChoiceField(
        label="Your child",
        queryset=Student.objects.none(),
        empty_label="Select your child (this cannot be changed later)",
        widget=forms.Select(attrs={"class": "form-select"}),
    )

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Only students no parent has claimed yet
        self.fields["student"].queryset = Student.objects.filter(guardian_link__isnull=True)

    def clean_email(self):
        email = self.cleaned_data["email"].lower()
        if User.objects.filter(email__iexact=email).exists():
            raise forms.ValidationError("An account with this email already exists.")
        return email

    def clean_student(self):
        student = self.cleaned_data["student"]
        from .models import ParentStudent

        if ParentStudent.objects.filter(student=student).exists():
            raise forms.ValidationError("This student is already linked to a parent account.")
        return student

    def clean(self):
        cleaned = super().clean()
        if cleaned.get("password") != cleaned.get("confirm"):
            raise forms.ValidationError("Passwords do not match.")
        return cleaned


# ---------------------------------------------------------
# Teacher forms
# ---------------------------------------------------------

class StudentForm(forms.ModelForm):
    class Meta:
        model = Student
        fields = ["roll_no", "name", "department", "year", "section"]
        widgets = {k: forms.TextInput(attrs={"class": "form-control"}) for k in fields}
        widgets["year"] = forms.Select(attrs={"class": "form-select"}, choices=Student.YEAR_CHOICES)


class EventForm(forms.Form):
    title = forms.CharField(max_length=150, widget=forms.TextInput(attrs={"class": "form-control"}))
    venue = forms.CharField(max_length=150, widget=forms.TextInput(attrs={"class": "form-control"}))
    start_date = forms.DateField(widget=forms.DateInput(attrs={"class": "form-control", "type": "date"}))
    end_date = forms.DateField(widget=forms.DateInput(attrs={"class": "form-control", "type": "date"}))
    start_time = forms.TimeField(widget=forms.TimeInput(attrs={"class": "form-control", "type": "time"}))
    end_time = forms.TimeField(widget=forms.TimeInput(attrs={"class": "form-control", "type": "time"}))
    slot_duration = forms.IntegerField(
        min_value=5, max_value=120, initial=30,
        widget=forms.NumberInput(attrs={"class": "form-control"}),
    )

    def clean(self):
        cleaned = super().clean()
        if cleaned.get("end_date") and cleaned.get("start_date") and cleaned["end_date"] < cleaned["start_date"]:
            raise forms.ValidationError("End date must be after start date.")
        if cleaned.get("end_time") and cleaned.get("start_time") and cleaned["end_time"] <= cleaned["start_time"]:
            raise forms.ValidationError("End time must be after start time.")
        return cleaned


class AddSlotsForm(forms.Form):
    """Manual top-up slots for one day."""

    event = forms.ModelChoiceField(
        queryset=None, empty_label=None,
        widget=forms.Select(attrs={"class": "form-select"}),
    )
    date = forms.DateField(widget=forms.DateInput(attrs={"class": "form-control", "type": "date"}))
    start_time = forms.TimeField(widget=forms.TimeInput(attrs={"class": "form-control", "type": "time"}))
    end_time = forms.TimeField(widget=forms.TimeInput(attrs={"class": "form-control", "type": "time"}))
    duration = forms.IntegerField(min_value=5, max_value=120, initial=30,
                                  widget=forms.NumberInput(attrs={"class": "form-control"}))

    def __init__(self, *args, **kwargs):
        from .models import PtmEvent

        super().__init__(*args, **kwargs)
        self.fields["event"].queryset = PtmEvent.objects.filter(status=PtmEvent.Status.ACTIVE)

    def clean(self):
        cleaned = super().clean()
        if cleaned.get("end_time") and cleaned.get("start_time") and cleaned["end_time"] <= cleaned["start_time"]:
            raise forms.ValidationError("End time must be after start time.")
        return cleaned


class RemarksForm(forms.Form):
    remarks = forms.CharField(
        required=False, widget=forms.Textarea(attrs={"class": "form-control", "rows": 3})
    )


class ReasonForm(forms.Form):
    reason = forms.CharField(max_length=255, required=False,
                             widget=forms.TextInput(attrs={"class": "form-control"}))


class CancelForm(forms.Form):
    reason = forms.CharField(max_length=255, required=False,
                             widget=forms.TextInput(attrs={"class": "form-control",
                                                           "placeholder": "Optional reason"}))
