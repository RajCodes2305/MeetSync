const express = require("express");
const router = express.Router();

const db = require("../config/db");


// ======================================
// DIRECTORY (public - for parents to
// browse teachers and see open slots)
// ======================================

router.get("/directory", async (req, res) => {

    try {

        const [teachers] = await db.query(
            `
            SELECT
                t.id AS teacher_id,
                u.name,
                t.department,
                t.designation,
                (SELECT COUNT(*) FROM slots s
                 JOIN ptm_events e ON e.id = s.event_id
                 WHERE s.teacher_id = t.id
                   AND s.status = 'available'
                   AND e.status = 'active') AS slot_count
            FROM teachers t
            JOIN users u ON u.id = t.user_id
            ORDER BY u.name
            `
        );

        res.json({ success: true, teachers: teachers });

    }

    catch (error) {

        console.error("Directory error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to load teachers."
        });

    }

});


// ======================================
// ALL STUDENTS (the teacher manages them)
// ======================================

router.get("/students", async (req, res) => {

    try {

        const [students] = await db.query(
            `
            SELECT s.*,
                   GROUP_CONCAT(pu.name SEPARATOR ', ') AS parents
            FROM students s
            LEFT JOIN parent_students ps ON ps.student_id = s.id
            LEFT JOIN parents p ON p.id = ps.parent_id
            LEFT JOIN users pu ON pu.id = p.user_id
            GROUP BY s.id
            ORDER BY s.roll_no
            `
        );

        res.json({ success: true, students: students });

    }

    catch (error) {

        console.error("Students error:", error);

        res.status(500).json({ success: false, message: "Failed to load students." });

    }

});


router.post("/students", async (req, res) => {

    try {

        const { roll_no, name, department, year, section } = req.body;

        if (!roll_no || !name || !department || !year || !section) {

            return res.status(400).json({ success: false, message: "All fields are required." });

        }

        const [existing] = await db.query(
            "SELECT id FROM students WHERE roll_no = ?",
            [roll_no]
        );

        if (existing.length > 0) {

            return res.status(409).json({ success: false, message: "Roll number already exists." });

        }

        const [result] = await db.query(
            "INSERT INTO students (roll_no, name, department, year, section) VALUES (?, ?, ?, ?, ?)",
            [roll_no, name, department, year, section]
        );

        res.status(201).json({ success: true, message: "Student added.", student_id: result.insertId });

    }

    catch (error) {

        console.error("Add student error:", error);

        res.status(500).json({ success: false, message: "Failed to add student." });

    }

});


router.put("/students/:id", async (req, res) => {

    try {

        const { roll_no, name, department, year, section } = req.body;

        await db.query(
            "UPDATE students SET roll_no = ?, name = ?, department = ?, year = ?, section = ? WHERE id = ?",
            [roll_no, name, department, year, section, req.params.id]
        );

        res.json({ success: true, message: "Student updated." });

    }

    catch (error) {

        console.error("Update student error:", error);

        res.status(500).json({ success: false, message: "Failed to update student." });

    }

});


router.delete("/students/:id", async (req, res) => {

    try {

        await db.query("DELETE FROM students WHERE id = ?", [req.params.id]);

        res.json({ success: true, message: "Student deleted." });

    }

    catch (error) {

        console.error("Delete student error:", error);

        res.status(500).json({ success: false, message: "Failed to delete student." });

    }

});


// ======================================
// PARENTS (list + create with child)
// ======================================

router.get("/parents", async (req, res) => {

    try {

        const [parents] = await db.query(
            `
            SELECT u.id AS user_id, u.name, u.email, p.id AS parent_id, p.phone,
                   GROUP_CONCAT(s.name SEPARATOR ', ') AS children
            FROM users u
            JOIN parents p ON p.user_id = u.id
            LEFT JOIN parent_students ps ON ps.parent_id = p.id
            LEFT JOIN students s ON s.id = ps.student_id
            GROUP BY u.id, p.id, u.name, u.email, p.phone
            ORDER BY u.name
            `
        );

        res.json({ success: true, parents: parents });

    }

    catch (error) {

        console.error("Parents error:", error);

        res.status(500).json({ success: false, message: "Failed to load parents." });

    }

});


router.post("/parents", async (req, res) => {

    try {

        const { name, email, password, phone, studentId } = req.body;

        if (!name || !email || !password || !studentId) {

            return res.status(400).json({ success: false, message: "Name, email, password and child are required." });

        }

        const [existing] = await db.query(
            "SELECT id FROM users WHERE email = ?",
            [email]
        );

        if (existing.length > 0) {

            return res.status(409).json({ success: false, message: "An account with this email already exists." });

        }

        // A child belongs to exactly one parent -
        // check nobody has claimed them yet

        const [claims] = await db.query(
            "SELECT id FROM parent_students WHERE student_id = ?",
            [studentId]
        );

        if (claims.length > 0) {

            return res.status(409).json({ success: false, message: "This student is already linked to a parent account." });

        }

        const [result] = await db.query(
            "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, 'parent')",
            [name, email, password]
        );

        const userId = result.insertId;

        const [parentResult] = await db.query(
            "INSERT INTO parents (user_id, phone) VALUES (?, ?)",
            [userId, phone || null]
        );

        // Lock the child to this parent permanently

        await db.query(
            "INSERT INTO parent_students (parent_id, student_id) VALUES (?, ?)",
            [parentResult.insertId, studentId]
        );

        res.status(201).json({ success: true, message: "Parent account created and child linked." });

    }

    catch (error) {

        console.error("Add parent error:", error);

        res.status(500).json({ success: false, message: "Failed to create parent account." });

    }

});


router.delete("/parents/:id", async (req, res) => {

    try {

        const parentId = req.params.id;

        // Get the linked user id so both rows go

        const [parents] = await db.query(
            "SELECT user_id FROM parents WHERE id = ?",
            [parentId]
        );

        if (parents.length === 0) {

            return res.status(404).json({ success: false, message: "Parent not found." });

        }

        await db.query("DELETE FROM users WHERE id = ?", [parents[0].user_id]);

        res.json({ success: true, message: "Parent deleted." });

    }

    catch (error) {

        console.error("Delete parent error:", error);

        res.status(500).json({ success: false, message: "Failed to delete parent." });

    }

});


// ======================================
// PTM EVENTS CRUD
// ======================================

router.get("/events", async (req, res) => {

    try {

        const [events] = await db.query(
            `
            SELECT e.*,
                   (SELECT COUNT(*) FROM slots s WHERE s.event_id = e.id) AS total_slots,
                   (SELECT COUNT(*) FROM slots s WHERE s.event_id = e.id AND s.status = 'booked') AS booked_slots
            FROM ptm_events e
            ORDER BY e.start_date DESC
            `
        );

        res.json({ success: true, events: events });

    }

    catch (error) {

        console.error("Events error:", error);

        res.status(500).json({ success: false, message: "Failed to load events." });

    }

});


router.post("/events", async (req, res) => {

    try {

        const { title, venue, start_date, end_date, start_time, end_time, slot_duration, teacherId } = req.body;

        if (!title || !venue || !start_date || !end_date || !start_time || !end_time || !teacherId) {

            return res.status(400).json({ success: false, message: "All fields are required." });

        }

        if (end_date < start_date) {

            return res.status(400).json({ success: false, message: "End date must be after start date." });

        }

        if (toMinutes(end_time) <= toMinutes(start_time)) {

            return res.status(400).json({ success: false, message: "End time must be after start time." });

        }

        const [result] = await db.query(
            "INSERT INTO ptm_events (title, venue, start_date, end_date, start_time, end_time, slot_duration, status) VALUES (?, ?, ?, ?, ?, ?, ?, 'draft')",
            [title, venue, start_date, end_date, start_time, end_time, slot_duration || 15]
        );

        const eventId = result.insertId;


        // SLOTS ARE CREATED AUTOMATICALLY
        // Every day of the event, from start_time to
        // end_time, split into slot_duration pieces.
        // They appear in My Availability right away
        // and become bookable when the event is
        // activated. No manual work needed.

        const step = Number(slot_duration) > 0 ? Number(slot_duration) : 30;

        const dayStart = toMinutes(start_time);
        const dayEnd = toMinutes(end_time);

        const cursor = new Date(start_date + "T00:00:00Z");
        const last = new Date(end_date + "T00:00:00Z");

        let created = 0;


        while (cursor <= last && created < 500) {

            const dateStr = cursor.toISOString().slice(0, 10);

            let t = dayStart;

            while (t + step <= dayEnd && created < 500) {

                await db.query(
                    "INSERT INTO slots (teacher_id, event_id, date, start_time, end_time) VALUES (?, ?, ?, ?, ?)",
                    [teacherId, eventId, dateStr, toTime(t), toTime(t + step)]
                );

                created = created + 1;
                t = t + step;

            }

            cursor.setUTCDate(cursor.getUTCDate() + 1);

        }


        res.status(201).json({
            success: true,
            message: `Event created with ${created} slot(s) added to your availability.`,
            event_id: eventId,
            slots_created: created
        });

    }

    catch (error) {

        console.error("Create event error:", error);

        res.status(500).json({ success: false, message: "Failed to create event." });

    }

});


router.put("/events/:id", async (req, res) => {

    try {

        const { title, venue, start_date, end_date, start_time, end_time, slot_duration } = req.body;

        await db.query(
            "UPDATE ptm_events SET title = ?, venue = ?, start_date = ?, end_date = ?, start_time = ?, end_time = ?, slot_duration = ? WHERE id = ?",
            [title, venue, start_date, end_date, start_time, end_time, slot_duration, req.params.id]
        );

        res.json({ success: true, message: "Event updated." });

    }

    catch (error) {

        console.error("Update event error:", error);

        res.status(500).json({ success: false, message: "Failed to update event." });

    }

});


router.put("/events/:id/status", async (req, res) => {

    try {

        const { status } = req.body;

        if (!['draft', 'active', 'closed'].includes(status)) {

            return res.status(400).json({ success: false, message: "Invalid status." });

        }

        await db.query(
            "UPDATE ptm_events SET status = ? WHERE id = ?",
            [status, req.params.id]
        );

        res.json({ success: true, message: "Event status updated." });

    }

    catch (error) {

        console.error("Event status error:", error);

        res.status(500).json({ success: false, message: "Failed to update status." });

    }

});


// ======================================
// PUBLIC SLOTS (available slots of one
// teacher, for the parent booking page)
// ======================================

router.get("/slots-public/:teacherId", async (req, res) => {

    try {

        const teacherId = req.params.teacherId;

        const [slots] = await db.query(
            `
            SELECT s.id, s.date, s.start_time, s.end_time, s.event_id
            FROM slots s
            JOIN ptm_events e ON e.id = s.event_id
            WHERE s.teacher_id = ?
              AND s.status = 'available'
              AND e.status = 'active'
            ORDER BY s.date, s.start_time
            `,
            [teacherId]
        );

        res.json({
            success: true,
            slots: slots
        });

    }

    catch (error) {

        console.error("Public slots error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to load slots."
        });

    }

});


// ======================================
// MY SLOTS (for the availability page)
// ======================================

router.get("/slots/:teacherId", async (req, res) => {

    try {

        const teacherId = req.params.teacherId;

        const [slots] = await db.query(
            `
            SELECT s.id, s.date, s.start_time, s.end_time, s.status,
                   e.title AS event_title
            FROM slots s
            JOIN ptm_events e ON e.id = s.event_id
            WHERE s.teacher_id = ?
            ORDER BY s.date, s.start_time
            `,
            [teacherId]
        );

        res.json({
            success: true,
            slots: slots
        });

    }

    catch (error) {

        console.error("Slots error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to load slots."
        });

    }

});


// ======================================
// CREATE SLOTS (pick a date + time window,
// backend splits it into equal slots)
// ======================================

router.post("/slots", async (req, res) => {

    try {

        const { teacherId, eventId, date, startTime, endTime, duration } = req.body;


        // Basic validation

        if (!teacherId || !eventId || !date || !startTime || !endTime) {

            return res.status(400).json({
                success: false,
                message: "Missing slot information."
            });

        }


        // Event must be active to add slots

        const [events] = await db.query(
            "SELECT status FROM ptm_events WHERE id = ?",
            [eventId]
        );

        if (events.length === 0) {

            return res.status(404).json({
                success: false,
                message: "Event not found."
            });

        }

        if (events[0].status !== "active") {

            return res.status(409).json({
                success: false,
                message: "You can only add slots for active events."
            });

        }


        // Split the window into slots and skip ones
        // that already exist (no duplicate errors)

        const step = Number(duration) > 0 ? Number(duration) : 30;
        let start = toMinutes(startTime);
        const end = toMinutes(endTime);
        let created = 0;


        while (start + step <= end) {

            const startStr = toTime(start);
            const endStr = toTime(start + step);


            // Skip if this exact slot already exists

            const [dupe] = await db.query(
                "SELECT id FROM slots WHERE teacher_id = ? AND event_id = ? AND date = ? AND start_time = ?",
                [teacherId, eventId, date, startStr]
            );

            if (dupe.length === 0) {

                await db.query(
                    "INSERT INTO slots (teacher_id, event_id, date, start_time, end_time) VALUES (?, ?, ?, ?, ?)",
                    [teacherId, eventId, date, startStr, endStr]
                );

                created = created + 1;

            }

            start = start + step;

        }


        res.json({
            success: true,
            message: `${created} slot(s) created.`
        });

    }

    catch (error) {

        console.error("Create slots error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to create slots."
        });

    }

});


// ======================================
// DELETE A FREE SLOT
// (booked ones cannot be deleted)
// ======================================

router.delete("/slots/:slotId", async (req, res) => {

    try {

        const slotId = req.params.slotId;
        const { teacherId } = req.body;


        // Find the slot and make sure it belongs to this teacher

        const [slots] = await db.query(
            "SELECT id, status FROM slots WHERE id = ? AND teacher_id = ?",
            [slotId, teacherId]
        );

        if (slots.length === 0) {

            return res.status(404).json({
                success: false,
                message: "Slot not found."
            });

        }

        if (slots[0].status === "booked") {

            return res.status(409).json({
                success: false,
                message: "This slot is booked - cancel the appointment first."
            });

        }


        await db.query("DELETE FROM slots WHERE id = ?", [slotId]);


        res.json({
            success: true,
            message: "Slot removed."
        });

    }

    catch (error) {

        console.error("Delete slot error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to remove slot."
        });

    }

});


// ======================================
// ALL APPOINTMENTS (monitor + manage)
// ======================================

router.get("/appointments", async (req, res) => {

    try {

        const [appointments] = await db.query(
            `
            SELECT
                a.id,
                a.status,
                a.remarks,
                a.cancel_reason,
                s.date,
                s.start_time,
                s.end_time,
                e.title AS event_title,
                e.venue,
                st.name AS student_name,
                st.roll_no,
                st.department AS student_department,
                st.year AS student_year,
                st.section AS student_section,
                pu.name AS parent_name,
                pu.email AS parent_email,
                tu.name AS teacher_name
            FROM appointments a
            JOIN slots s ON s.id = a.slot_id
            JOIN ptm_events e ON e.id = a.event_id
            JOIN students st ON st.id = a.student_id
            JOIN parents p ON p.id = a.parent_id
            JOIN users pu ON pu.id = p.user_id
            JOIN teachers t ON t.id = s.teacher_id
            JOIN users tu ON tu.id = t.user_id
            ORDER BY s.date DESC, s.start_time DESC
            `
        );

        res.json({ success: true, appointments: appointments });

    }

    catch (error) {

        console.error("Appointments error:", error);

        res.status(500).json({ success: false, message: "Failed to load appointments." });

    }

});


// ======================================
// CANCEL AN APPOINTMENT (frees the slot)
// ======================================

router.post("/appointments/:id/cancel", async (req, res) => {

    try {

        const id = req.params.id;
        const { reason } = req.body;

        const [appointments] = await db.query(
            "SELECT id, status, slot_id FROM appointments WHERE id = ?",
            [id]
        );

        if (appointments.length === 0) {

            return res.status(404).json({ success: false, message: "Appointment not found." });

        }

        if (appointments[0].status !== "booked") {

            return res.status(409).json({ success: false, message: "Only booked appointments can be cancelled." });

        }

        await db.query(
            "UPDATE appointments SET status = 'cancelled', cancel_reason = ? WHERE id = ?",
            [reason || "Cancelled by teacher", id]
        );

        await db.query(
            "UPDATE slots SET status = 'available' WHERE id = ?",
            [appointments[0].slot_id]
        );

        res.json({ success: true, message: "Appointment cancelled." });

    }

    catch (error) {

        console.error("Cancel error:", error);

        res.status(500).json({ success: false, message: "Failed to cancel appointment." });

    }

});


// ======================================
// MARK COMPLETED + PRIVATE REMARKS
// ======================================

router.post("/appointments/:id/complete", async (req, res) => {

    try {

        const id = req.params.id;
        const { remarks } = req.body;

        const [appointments] = await db.query(
            "SELECT id, status FROM appointments WHERE id = ?",
            [id]
        );

        if (appointments.length === 0) {

            return res.status(404).json({ success: false, message: "Appointment not found." });

        }

        if (appointments[0].status !== "booked") {

            return res.status(409).json({ success: false, message: "Only booked appointments can be completed." });

        }

        await db.query(
            "UPDATE appointments SET status = 'completed', remarks = ? WHERE id = ?",
            [remarks || null, id]
        );

        res.json({ success: true, message: "Marked as completed." });

    }

    catch (error) {

        console.error("Complete error:", error);

        res.status(500).json({ success: false, message: "Failed to update appointment." });

    }

});


// ======================================
// STATS FOR DASHBOARD / REPORTS
// ======================================

router.get("/stats", async (req, res) => {

    try {

        // Appointment counts by status

        const [statusCounts] = await db.query(
            `
            SELECT
                (SELECT COUNT(*) FROM appointments WHERE status = 'booked') AS booked,
                (SELECT COUNT(*) FROM appointments WHERE status = 'completed') AS completed,
                (SELECT COUNT(*) FROM appointments WHERE status = 'cancelled') AS cancelled,
                (SELECT COUNT(*) FROM appointments) AS total
            `
        );

        // Table counts

        const [counts] = await db.query(
            `
            SELECT
                (SELECT COUNT(*) FROM students) AS students,
                (SELECT COUNT(*) FROM parents) AS parents,
                (SELECT COUNT(*) FROM ptm_events) AS events
            `
        );

        res.json({
            success: true,
            statusCounts: statusCounts[0],
            counts: counts[0]
        });

    }

    catch (error) {

        console.error("Stats error:", error);

        res.status(500).json({ success: false, message: "Failed to load stats." });

    }

});


// ======================================
// HELPERS
// ======================================

function toMinutes(hhmm) {
    const [h, m] = hhmm.split(":").map(Number);
    return h * 60 + m;
}

function toTime(mins) {
    const h = String(Math.floor(mins / 60)).padStart(2, "0");
    const m = String(mins % 60).padStart(2, "0");
    return `${h}:${m}:00`;
}


module.exports = router;
