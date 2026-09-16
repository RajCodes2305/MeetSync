// =====================================
// MEETSYNC SEED SCRIPT
// database.sql already creates 1 teacher,
// 10 students and 10 parents. This script
// books a few sample appointments so the
// dashboards have data on first run.
//
// Run:  node backend/seed.js
// =====================================

require("dotenv").config({ path: require("path").join(__dirname, ".env") });

const mysql = require("mysql2/promise");


async function main() {

    const db = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        dateStrings: true
    });


    // Clear previous sample appointments

    await db.query("DELETE FROM appointments");
    await db.query("UPDATE slots SET status = 'available'");


    // Which active event to book into

    const [events] = await db.query(
        "SELECT id FROM ptm_events WHERE status = 'active' LIMIT 1"
    );

    if (events.length === 0) {

        console.log("No active PTM event found. Nothing to book into.");

        await db.end();
        return;

    }

    const eventId = events[0].id;


    // First 5 open slots of the event, oldest first

    const [slots] = await db.query(
        "SELECT id FROM slots WHERE event_id = ? AND status = 'available' ORDER BY date, start_time LIMIT 5",
        [eventId]
    );

    if (slots.length < 5) {

        console.log("Not enough open slots. Expected at least 5.");

        await db.end();
        return;

    }


    // Parents 1..5 book the first 5 slots.
    // The child comes from the parent lock.

    const plans = [
        { parentId: 1, slotIdx: 0, status: "booked" },
        { parentId: 2, slotIdx: 1, status: "booked" },
        { parentId: 3, slotIdx: 2, status: "booked" },
        { parentId: 4, slotIdx: 3, status: "completed", remarks: "Discussed internal marks. Good progress overall." },
        { parentId: 5, slotIdx: 4, status: "cancelled", reason: "Not available that day" }
    ];


    for (const plan of plans) {

        const slotId = slots[plan.slotIdx].id;


        // The locked child of this parent

        const [locked] = await db.query(
            "SELECT student_id FROM parent_students WHERE parent_id = ?",
            [plan.parentId]
        );

        if (locked.length === 0) continue;


        // Claim the slot

        const [claim] = await db.query(
            "UPDATE slots SET status = 'booked' WHERE id = ? AND status = 'available'",
            [slotId]
        );

        if (claim.affectedRows === 0) continue;


        await db.query(
            "INSERT INTO appointments (slot_id, parent_id, student_id, event_id, status, remarks, cancel_reason) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [
                slotId,
                plan.parentId,
                locked[0].student_id,
                eventId,
                plan.status,
                plan.remarks || null,
                plan.reason || null
            ]
        );


        // A cancelled appointment frees its slot

        if (plan.status === "cancelled") {

            await db.query(
                "UPDATE slots SET status = 'available' WHERE id = ?",
                [slotId]
            );

        }

    }


    console.log("Sample appointments created: 3 booked, 1 completed, 1 cancelled.");

    await db.end();

}


main().catch((err) => {

    console.error("Seed failed:", err.message);

    process.exit(1);

});
