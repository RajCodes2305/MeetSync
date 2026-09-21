"""
MeetSync - Django settings (plain and short on purpose)
"""
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent

# .env sits in the project root
load_dotenv(BASE_DIR / ".env")

import os
import sys  # noqa: E402  (after load_dotenv so os.getenv sees the file)

SECRET_KEY = os.getenv("SECRET_KEY", "meetsync-dev-secret-key")

DEBUG = True

ALLOWED_HOSTS = ["*"]

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "portal",
]

MIDDLEWARE = [
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
]

ROOT_URLCONF = "meetsync.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "portal" / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "meetsync.wsgi.application"


# ---------------------------------------------------------
# Database.
# If DB_PASSWORD in .env is still empty or "CHANGE_ME", the
# app automatically uses a local SQLite file (db.sqlite3) so
# you can run it immediately with zero MySQL setup. Fill in
# the MySQL password and it switches to MySQL on the next run.
# ---------------------------------------------------------

DB_PASSWORD = os.getenv("DB_PASSWORD", "")
USE_MYSQL = DB_PASSWORD not in ("", "CHANGE_ME")

if "test" in sys.argv or not USE_MYSQL:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.mysql",
            "NAME": os.getenv("DB_NAME", "meetsync"),
            "USER": os.getenv("DB_USER", "meetsync"),
            "PASSWORD": DB_PASSWORD,
            "HOST": os.getenv("DB_HOST", "127.0.0.1"),
            "PORT": os.getenv("DB_PORT", "3306"),
            "OPTIONS": {
                "charset": "utf8mb4",
                "init_command": "SET sql_mode='STRICT_TRANS_TABLES'",
            },
        }
    }


AUTH_USER_MODEL = "portal.User"

AUTH_PASSWORD_VALIDATORS = []

LANGUAGE_CODE = "en-us"
TIME_ZONE = "Asia/Kolkata"
USE_I18N = True
USE_TZ = False

STATIC_URL = "static/"
STATICFILES_DIRS = [BASE_DIR / "portal" / "static"]

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# Where to go after login/logout (handled in views, these are fallbacks)
LOGIN_URL = "login"
LOGIN_REDIRECT_URL = "home"
LOGOUT_REDIRECT_URL = "home"

# Plain-text demo passwords on purpose (college project).
# To hash passwords instead, uncomment:
# PASSWORD_HASHERS = ["django.contrib.auth.hashers.PBKDF2PasswordHasher"]
