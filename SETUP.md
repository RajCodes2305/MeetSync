# MeetSync - Setup Guide (Django + MySQL)

A Parent-Teacher Meeting booking app built with **Django, HTML, CSS, Bootstrap, JavaScript and MySQL** only. No Node.js, no npm, no build step.

---

## What you need

1. **Python 3.10+** - check with `python --version`
2. **MySQL** running locally (you already have the MySQL267 service)

Install the two Python packages once:

```cmd
pip install -r requirements.txt
```

---

## STEP 1 - Create the MySQL database and user (one time)

Open Command Prompt and log in to MySQL as root:

```cmd
mysql -u root -p
```

Then run the setup script (creates the `meetsync` database and a `meetsync` user with password `meetsync123`):

```sql
SOURCE setup.sql;
```

If you prefer a different password, edit `setup.sql` first, then use the same password in `.env`.

## STEP 2 - Point the app at MySQL

Open the `.env` file in Notepad and set:

```
DB_PASSWORD=meetsync123
```

That is the only line you normally need to change.

> Note: while `DB_PASSWORD` is empty or `CHANGE_ME`, the app automatically
> uses a local SQLite file (`db.sqlite3`) so you can try it with zero MySQL
> setup. It switches to MySQL as soon as you fill the password in.

## STEP 3 - Create the tables and demo data

```cmd
python manage.py migrate
python manage.py seed_demo
```

This creates 1 teacher, 10 students, 10 parents (each locked to their own child), one active PTM event with auto-generated slots, and 5 sample appointments.

## STEP 4 - Run the app

```cmd
python manage.py runserver
```

Open **http://127.0.0.1:8000**

### Demo logins

| Role    | Email                 | Password   |
|---------|-----------------------|------------|
| Teacher | anil@meetsync.com     | teacher123 |
| Parent  | parent1@meetsync.com  | parent123  |
| Parent  | parent2@meetsync.com  | parent123  |

(all parents use `parent123`; parent N is linked to student N)

---

## Running tests (optional)

```cmd
python manage.py test
```

18 tests cover booking rules, double-booking, child locking, cancel/reschedule and page access. Tests run on SQLite automatically, no MySQL needed.

## Django admin (optional)

```cmd
python manage.py createsuperuser
```

Then visit http://127.0.0.1:8000/admin/ to inspect all data.

---

## Project structure

```
manage.py            Django entry point
setup.sql            one-time MySQL user/database setup
meetsync/            settings + urls
portal/
  models.py          users, students, parents, teachers, events, slots, appointments
  services.py        booking rules (locks, one-per-event, reschedule safety)
  views.py           public + parent pages
  views_teacher.py   teacher pages
  forms.py           all forms
  templates/         HTML templates (Bootstrap)
  static/            style.css + favicon
  management/commands/seed_demo.py   demo data
.env                 database settings (git-ignored)
```

## Troubleshooting

- **Access denied for user 'meetsync'** - run `setup.sql` as root (Step 1), and make sure the password matches `.env`.
- **Unknown database 'meetsync'** - same fix.
- **Port 8000 already in use** - run `python manage.py runserver 8001` instead.
