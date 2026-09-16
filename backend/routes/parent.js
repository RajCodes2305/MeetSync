const express = require("express");
const router = express.Router();

const db = require("../config/db");


// ======================================
// MY STUDENTS
// (students linked to this parent by the teacher)
// ======================================

router.get("/students/:parentId", async (req, res) => {

    try {

        const parentId = req.params.parentId;

        const [students] = await db.query(
            `
            SELECT s.id, s.roll_no, s.name, s.department, s.year, s.section
            FROM parent_students ps
            JOIN students s ON s.id = ps.student_id
            WHERE ps.parent_id = ?
            ORDER BY s.name
            `,
            [parentId]
        );

        res.json({
            success: true,
            students: students
        });

    }

    catch (error) {

        console.error("Students error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to load students."
        });

    }

});


// ======================================
// MY APPOINTMENTS (upcoming + past)
// ======================================

router.get("/appointments/:parentId", async (req, res) => {

    try {

        const parentId = req.params.parentId;

        const [appointments] = await db.query(
            `
            SELECT
                a.id,
                a.status,
                a.cancel_reason,
                s.date,
                s.start_time,
                s.end_time,
                u.name AS teacher_name,
                t.id AS teacher_id,
                t.department,
                e.title AS event_title,
                e.venue,
                st.name AS student_name,
                st.roll_no
            FROM appointments a
            JOIN slots s ON s.id = a.slot_id
            JOIN teachers t ON t.id = s.teacher_id
            JOIN users u ON u.id = t.user_id
            JOIN ptm_events e ON e.id = a.event_id
            JOIN students st ON st.id = a.student_id
            WHERE a.parent_id = ?
            ORDER BY s.date DESC, s.start_time DESC
            `,
            [parentId]
        );

        res.json({
            success: true,
            appointments: appointments
        });

    }

    catch (error) {

        console.error("Appointments error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to load appointments."
        });

    }

});


// ======================================
// BOOK AN APPOINTMENT
// (the important one - checks the slot
// is still available before booking)
// ======================================

router.post("/book", async (req, res) => {

    try {

        const { parentId, slotId, rescheduleId } = req.body;


        if (!parentId || !slotId) {

            return res.status(400).json({
                success: false,
                message: "Missing booking information."
            });

        }


        // The child is NOT taken from the request -
        // it is looked up from this parent's permanent
        // lock, so a parent can only ever book for
        // their own child

        const [locked] = await db.query(
            "SELECT student_id FROM parent_students WHERE parent_id = ?",
            [parentId]
        );

        if (locked.length === 0) {

            return res.status(403).json({
                success: false,
                message: "No child is linked to your account. Contact the teacher."
            });

        }

        const studentId = locked[0].student_id;


        // 1. Get the slot and check it

        const [slots] = await db.query(
            `
            SELECT s.id, s.date, s.status, e.id AS event_id
            FROM slots s
            JOIN ptm_events e ON e.id = s.event_id
            WHERE s.id = ?
            `,
            [slotId]
        );

        if (slots.length === 0) {

            return res.status(404).json({
                success: false,
                message: "Slot not found."
            });

        }

        const slot = slots[0];


        if (slot.status !== "available") {

            return res.status(409).json({
                success: false,
                message: "Sorry, this slot was just booked by someone else."
            });

        }


        // Event must be active

        const [events] = await db.query(
            "SELECT status FROM ptm_events WHERE id = ?",
            [slot.event_id]
        );

        if (events.length === 0 || events[0].status !== "active") {

            return res.status(409).json({
                success: false,
                message: "Booking is closed for this event."
            });

        }


        // 2. One active booking per student per event
        //    (the old appointment does not count when rescheduling)

        const [existingBookings] = await db.query(
            `
            SELECT a.id
            FROM appointments a
            JOIN slots s ON s.id = a.slot_id
            WHERE a.student_id = ?
              AND a.event_id = ?
              AND a.status = 'booked'
              AND a.id != ?
            `,
            [studentId, slot.event_id, rescheduleId || 0]
        );

        if (existingBookings.length > 0) {

            return res.status(409).json({
                success: false,
                message: "This student already has an appointment for this event. Cancel it first."
            });

        }


        // 4. Claim the slot - only works if it is still 'available'.
        //    If two parents click at the same time, only one wins.

        const [claim] = await db.query(
            "UPDATE slots SET status = 'booked' WHERE id = ? AND status = 'available'",
            [slotId]
        );

        if (claim.affectedRows === 0) {

            return res.status(409).json({
                success: false,
                message: "Sorry, this slot was just booked by someone else."
            });

        }


        // 5. Create the appointment

        const [result] = await db.query(
            `
            INSERT INTO appointments (slot_id, parent_id, student_id, event_id, status)
            VALUES (?, ?, ?, ?, 'booked')
            `,
            [slotId, parentId, studentId, slot.event_id]
        );


        // 6. If this was a reschedule, cancel the
        //    old appointment and free its slot

        if (rescheduleId) {

            const [old] = await db.query(
                "SELECT id, status, slot_id FROM appointments WHERE id = ? AND parent_id = ?",
                [rescheduleId, parentId]
            );

            if (
                old.length > 0 &&
                old[0].status === "booked"
            ) {

                await db.query(
                    "UPDATE appointments SET status = 'cancelled', cancel_reason = 'Rescheduled' WHERE id = ?",
                    [rescheduleId]
                );

                await db.query(
                    "UPDATE slots SET status = 'available' WHERE id = ?",
                    [old[0].slot_id]
                );

            }

        }


        res.status(201).json({
            success: true,
            message: rescheduleId
                ? "Appointment rescheduled successfully!"
                : "Appointment booked successfully!",
            appointment_id: result.insertId
        });

    }

    catch (error) {

        console.error("Booking error:", error);

        res.status(500).json({
            success: false,
            message: "Booking failed. Please try again."
        });

    }

});


// ======================================
// CANCEL AN APPOINTMENT
// (frees the slot immediately)
// ======================================

router.post("/appointments/:id/cancel", async (req, res) => {

    try {

        const id = req.params.id;
        const { parentId, reason } = req.body;


        // Check it belongs to this parent and is still booked

        const [appointments] = await db.query(
            "SELECT id, status, slot_id FROM appointments WHERE id = ? AND parent_id = ?",
            [id, parentId]
        );

        if (appointments.length === 0) {

            return res.status(404).json({
                success: false,
                message: "Appointment not found."
            });

        }

        if (appointments[0].status !== "booked") {

            return res.status(409).json({
                success: false,
                message: "Only booked appointments can be cancelled."
            });

        }


        // Cancel + free the slot

        await db.query(
            "UPDATE appointments SET status = 'cancelled', cancel_reason = ? WHERE id = ?",
            [reason || null, id]
        );

        await db.query(
            "UPDATE slots SET status = 'available' WHERE id = ?",
            [appointments[0].slot_id]
        );


        res.json({
            success: true,
            message: "Appointment cancelled."
        });

    }

    catch (error) {

        console.error("Cancel error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to cancel appointment."
        });

    }

});


// ======================================
// RESCHEDULE = cancel old + book new slot
// ======================================

router.post("/appointments/:id/reschedule", async (req, res) => {

    try {

        const id = req.params.id;
        const { parentId, newSlotId } = req.body;


        // Find the old appointment + its locked child

        const [appointments] = await db.query(
            `
            SELECT a.id, a.status, a.slot_id, a.parent_id, a.student_id, a.event_id
            FROM appointments a
            WHERE a.id = ? AND a.parent_id = ?
            `,
            [id, parentId]
        );

        if (appointments.length === 0) {

            return res.status(404).json({
                success: false,
                message: "Appointment not found."
            });

        }

        const old = appointments[0];

        if (old.status !== "booked") {

            return res.status(409).json({
                success: false,
                message: "Only booked appointments can be rescheduled."
            });

        }


        // Check the new slot

        const [newSlots] = await db.query(
            "SELECT id, status, event_id FROM slots WHERE id = ?",
            [newSlotId]
        );

        if (newSlots.length === 0 || newSlots[0].event_id !== old.event_id) {

            return res.status(400).json({
                success: false,
                message: "New slot not found for this event."
            });

        }

        if (newSlots[0].status !== "available") {

            return res.status(409).json({
                success: false,
                message: "That slot is no longer available."
            });

        }


        // Do the swap

        await db.query(
            "UPDATE appointments SET status = 'cancelled', cancel_reason = 'Rescheduled' WHERE id = ?",
            [id]
        );

        await db.query(
            "UPDATE slots SET status = 'available' WHERE id = ?",
            [old.slot_id]
        );

        const [claim] = await db.query(
            "UPDATE slots SET status = 'booked' WHERE id = ? AND status = 'available'",
            [newSlotId]
        );

        if (claim.affectedRows === 0) {

            // New slot got taken while we worked - put the old one back

            await db.query(
                "UPDATE slots SET status = 'booked' WHERE id = ?",
                [old.slot_id]
            );

            await db.query(
                "UPDATE appointments SET status = 'booked', cancel_reason = NULL WHERE id = ?",
                [id]
            );

            return res.status(409).json({
                success: false,
                message: "That slot is no longer available. Your original booking is safe."
            });

        }


        const [result] = await db.query(
            `
            INSERT INTO appointments (slot_id, parent_id, student_id, event_id, status)
            VALUES (?, ?, ?, ?, 'booked')
            `,
            [newSlotId, old.parent_id, old.student_id, old.event_id]
        );


        res.json({
            success: true,
            message: "Appointment rescheduled.",
            appointment_id: result.insertId
        });

    }

    catch (error) {

        console.error("Reschedule error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to reschedule."
        });

    }

});


module.exports = router;
