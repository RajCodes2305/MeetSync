// =====================================
// MEETSYNC PROJECT REPORT GENERATOR
// Run:  node scripts/generate-report.js
// Creates: MeetSync-Project-Report.pdf
// =====================================

const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");


const OUT = path.join(__dirname, "..", "MeetSync-Project-Report.pdf");

const doc = new PDFDocument({
    size: "A4",
    margins: { top: 60, bottom: 60, left: 60, right: 60 },
    info: { Title: "MeetSync Project Report", Author: "Raj" }
});


doc.pipe(fs.createWriteStream(OUT));


// =====================================
// STYLES
// =====================================

const BLUE = "#2563eb";
const DARK = "#172033";
const GREY = "#475569";

const pageBottom = doc.page.height - 60;


// =====================================
// HELPERS
// =====================================

function ensureSpace(needed) {
    if (doc.y + needed > pageBottom) {
        doc.addPage();
    }
}

function h1(text) {
    ensureSpace(60);
    doc.moveDown(0.6);
    doc.font("Helvetica-Bold").fontSize(20).fillColor(BLUE).text(text);
    doc.moveDown(0.3);
}

function h2(text) {
    ensureSpace(45);
    doc.moveDown(0.5);
    doc.font("Helvetica-Bold").fontSize(13).fillColor(DARK).text(text);
    doc.moveDown(0.15);
}

function p(text) {
    ensureSpace(30);
    doc.font("Helvetica").fontSize(10.5).fillColor(GREY).text(text, {
        lineGap: 2.5
    });
}

function bullets(items) {
    items.forEach((item) => {
        ensureSpace(24);
        doc.font("Helvetica").fontSize(10.5).fillColor(GREY);
        doc.text("-  " + item, {
            indent: 10,
            lineGap: 2.5
        });
    });
}

function kv(rows) {
    rows.forEach(([k, v]) => {
        ensureSpace(22);
        doc.font("Helvetica-Bold").fontSize(10.5).fillColor(DARK).text(k + ":  ", {
            continued: true
        });
        doc.font("Helvetica").fillColor(GREY).text(v);
    });
}


// =====================================
// COVER
// =====================================

doc.font("Helvetica-Bold").fontSize(34).fillColor(DARK).text("MeetSync", {
    align: "center"
});

doc.moveDown(0.2);

doc.font("Helvetica").fontSize(14).fillColor(GREY).text(
    "College Parent-Teacher Meeting Appointment Portal",
    { align: "center" }
);

doc.moveDown(0.4);

doc.font("Helvetica").fontSize(10.5).fillColor(GREY).text(
    "Project Report - features, technology stack, and future scope",
    { align: "center" }
);

doc.moveDown(2.2);

kv([
    ["Type", "Two-portal web application (Parent + Teacher)"],
    ["Backend", "Node.js, Express, MySQL, plain JavaScript"],
    ["Frontend", "React (Vite), React Router, Axios, plain CSS"],
    ["Source", "Every file editable in Notepad, no frameworks to learn"],
    ["Date", new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })]
]);


// =====================================
// SECTION 1 - THINGS IN THE APP
// =====================================

doc.addPage();
h1("1. Things in this web app");


h2("Public pages (no login)");
bullets([
    "Landing page with a clear explanation of the portal",
    "Login for parents and teachers, with role-based redirect",
    "Parent self-registration: name, email, phone, password, and a mandatory one-time choice of their child",
    "Privacy policy page written in plain language",
    "Site favicon and privacy pill in the footer"
]);


h2("Parent portal");
bullets([
    "Dashboard with quick actions (book, view appointments, find teacher)",
    "My Student page showing the child permanently linked to the account",
    "Find Teacher page: search by name and filter by department, open-slot counts",
    "Book Appointment: 3-step wizard (teacher, date + time slot, confirm) with a success confirmation screen",
    "The child is locked server-side: a parent can only ever book for their own child",
    "My Appointments: Upcoming and Past tabs, status badges, cancel with reason dialog, reschedule via the wizard",
    "Cancelled slots become bookable again immediately"
]);


h2("Teacher portal (single teacher manages everything)");
bullets([
    "Dashboard with quick actions",
    "Students: add, edit, delete, search students (roll no, name, department, year, section)",
    "Parents: create parent accounts with their child chosen at creation, delete accounts (frees the child for re-claiming)",
    "PTM Events: create events with venue, date range, daily time window, slot length; activate and close events",
    "Automatic slot generation: creating an event instantly creates all the teacher's slots for every day, split by the slot length; no manual work",
    "My Availability: view all slots with status, remove only unbooked slots, manually add extra slots any time",
    "Appointments: search and status filter, complete a meeting with private remarks, cancel with reason",
    "Reports: totals by status (booked, completed, cancelled), counts of students, parents and events"
]);


h2("System behaviour");
bullets([
    "Double-booking protection: a slot is claimed with a conditional database update, so two parents clicking the same slot cannot both win",
    "One active booking per student per PTM event",
    "Booking is only possible while the event is active",
    "Role separation: parents and teachers see only their own portal",
    "Cancel frees the slot instantly; reschedule claims the new slot before releasing the old one"
]);


h2("Demo data included");
bullets([
    "1 teacher, 10 students (CS2101 to CS2110), 10 parents with one child each",
    "One active PTM event with slots on two days",
    "5 sample appointments: 3 booked, 1 completed with remarks, 1 cancelled with reason",
    "Re-runnable seeder script that resets the sample appointments"
]);


// =====================================
// SECTION 2 - WHAT IS USED
// =====================================

doc.addPage();
h1("2. What is used in the web app");


h2("Backend");
kv([
    ["Runtime", "Node.js (v18 or newer)"],
    ["Framework", "Express 5, with one route file per role (auth, parent, teacher)"],
    ["Database", "MySQL 8, accessed with mysql2/promise connection pool"],
    ["Schema", "8 tables: users, students, parents, teachers, parent_students, ptm_events, slots, appointments"],
    ["Data rules", "MySQL ENUMs for roles and statuses; unique keys prevent duplicate slots and double-claimed links"],
    ["Config", "backend/.env holds the database credentials (kept out of git)"],
    ["Database setup", "Single database.sql file that creates and fills everything, safe to re-run"]
]);


h2("Frontend");
kv([
    ["Build tool", "Vite 7 with the official React plugin"],
    ["UI library", "React 19 with function components and hooks only"],
    ["Routing", "React Router 7: public routes plus protected parent and teacher portals"],
    ["HTTP client", "Axios instance pointed at /api, proxied by Vite to the Express backend in development"],
    ["Styling", "One plain CSS file (style.css) with numbered sections; no CSS framework"],
    ["State", "Logged-in user stored in localStorage; each page loads its own data"]
]);


h2("Developer experience");
kv([
    ["Editing", "Any text editor (Notepad works); no special IDE needed"],
    ["Checks", "node --check for backend syntax, vite build for the frontend"],
    ["Testing", "The whole flow was verified end-to-end against a real MySQL database: logins, booking, double-booking rejection, cancel, reschedule, complete, auto-slot creation"]
]);


h2("Why these choices");
bullets([
    "Plain Express and mysql2 keep the code readable in one sitting, like the NullSync project style",
    "No ORM means every query is visible, which makes debugging simple",
    "Plain-text passwords were kept for coursework simplicity; bcrypt hashing is a documented next step",
    "No TypeScript, no Tailwind, no extra layers: fewer tools, fewer failure points"
]);


// =====================================
// SECTION 3 - FUTURE SCOPE
// =====================================

doc.addPage();
h1("3. What more can be done, and what cannot");


h2("Can be added (natural next steps)");
bullets([
    "Password hashing with bcryptjs so plain text is never stored",
    "Session tokens (JWT) instead of trusting localStorage alone",
    "Email or SMS notifications on booking, cancellation and reminders",
    "QR code check-in at the venue on the meeting day",
    "Parent feedback and rating after each completed meeting",
    "PDF or printable appointment sheet for the teacher",
    "Per-day booking overview for the teacher during an event",
    "Multi-teacher support with a subject-teacher directory and class-teacher roles",
    "Skip weekends or holidays when generating event slots",
    "Academic performance summary shown to parents before the meeting",
    "Online video meeting links for remote PTMs",
    "Deployment: frontend on Vercel or Netlify, backend on Render or Railway, MySQL on PlanetScale or a VPS"
]);


h2("Can be added (needs more design work)");
bullets([
    "Multiple children per guardian with teacher-approved access requests",
    "Deputy or admin role for office staff without teacher powers",
    "Slot length overriding per teacher, waitlists for popular slots",
    "Bilingual interface for parents less comfortable with English"
]);


h2("Cannot be done (current limits by design)");
bullets([
    "A parent cannot book for another parent's child: the child comes from the permanent account lock, not from the request",
    "A parent cannot book two appointments for their child in the same event",
    "Nobody can book into a draft or closed event, only active ones",
    "Teachers cannot delete booked slots; the appointment must be cancelled first",
    "A claimed child cannot be claimed by a second parent account",
    "Parents cannot see the teacher's private meeting remarks",
    "Parents cannot create events or manage other users: role separation is enforced on every route"
]);


h2("Known simplifications for a coursework build");
bullets([
    "Passwords are plain text in the database (deliberate, matching the reference project style)",
    "Login identity is kept in localStorage rather than HttpOnly cookies",
    "No server-side rate limiting or captcha on login and registration",
    "Single-college assumption: no multi-tenant support"
]);


// =====================================
// FOOTER ON EVERY PAGE
// =====================================

const range = doc.bufferedPageRange();

for (let i = range.start; i < range.start + range.count; i++) {

    doc.switchToPage(i);

    doc.font("Helvetica").fontSize(8.5).fillColor("#94a3b8").text(
        "MeetSync Project Report  -  page " + (i + 1) + " of " + range.count,
        60,
        doc.page.height - 45,
        { align: "center", width: doc.page.width - 120 }
    );

}


doc.end();

console.log("PDF created: " + OUT);
