const express = require("express");
const cors = require("cors");
require("dotenv").config();

const db = require("./config/db");

const authRoutes = require("./routes/auth");
const parentRoutes = require("./routes/parent");
const teacherRoutes = require("./routes/teacher");

const app = express();


// ======================================
// MIDDLEWARE
// ======================================

app.use(cors());

app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/parent", parentRoutes);
app.use("/api/teacher", teacherRoutes);


// ======================================
// TEST BACKEND ROUTE
// ======================================

app.get("/", (req, res) => {

    res.json({
        message: "MeetSync Backend is running!",
        status: "success"
    });

});


// ======================================
// TEST DATABASE CONNECTION
// ======================================

app.get("/api/test-db", async (req, res) => {

    try {

        const [rows] = await db.query(
            "SELECT COUNT(*) AS users FROM users"
        );

        res.json({
            success: true,
            message: "MySQL connected successfully!",
            users: rows[0].users
        });

    } catch (error) {

        console.error("Database error:", error);

        res.status(500).json({
            success: false,
            message: "Database connection failed."
        });

    }

});


// ======================================
// START SERVER
// ======================================

const PORT = 5000;

app.listen(PORT, () => {

    console.log(
        `MeetSync server running on http://localhost:${PORT}`
    );

});
