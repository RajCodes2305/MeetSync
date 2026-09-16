const express = require("express");
const router = express.Router();

const db = require("../config/db");


// ======================================
// STUDENT LIST (for the register page -
// parents pick their own child here)
// ======================================

router.get("/students", async (req, res) => {

    try {

        // Only students that no parent has
        // claimed yet (a child belongs to
        // exactly one parent)

        const [students] = await db.query(
            `
            SELECT s.id, s.roll_no, s.name, s.department, s.year, s.section
            FROM students s
            LEFT JOIN parent_students ps ON ps.student_id = s.id
            WHERE ps.id IS NULL
            ORDER BY s.roll_no
            `
        );

        res.json({ success: true, students: students });

    }

    catch (error) {

        console.error("Student list error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to load students."
        });

    }

});


// ======================================
// REGISTER (parents only - teacher
// accounts are created in the database)
// ======================================

router.post("/register", async (req, res) => {

    try {

        const { name, email, password, phone, studentId } = req.body;


        // Check basic fields

        if (!name || !email || !password) {

            return res.status(400).json({
                success: false,
                message: "Name, email and password are required."
            });

        }


        // The parent must pick their child -
        // this is fixed permanently after this

        if (!studentId) {

            return res.status(400).json({
                success: false,
                message: "Please select your child."
            });

        }


        // The child must exist and must not
        // already belong to another parent

        const [claims] = await db.query(
            "SELECT id FROM parent_students WHERE student_id = ?",
            [studentId]
        );

        if (claims.length > 0) {

            return res.status(409).json({
                success: false,
                message: "This student is already linked to a parent account."
            });

        }


        // Check if email already exists

        const [existing] = await db.query(
            "SELECT id FROM users WHERE email = ?",
            [email]
        );

        if (existing.length > 0) {

            return res.status(409).json({
                success: false,
                message: "An account with this email already exists."
            });

        }


        // Create user (role is always parent here)

        const [result] = await db.query(
            "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, 'parent')",
            [name, email, password]
        );

        const userId = result.insertId;


        // Create parent profile

        const [parentResult] = await db.query(
            "INSERT INTO parents (user_id, phone) VALUES (?, ?)",
            [userId, phone || null]
        );


        // Lock the child to this parent forever

        await db.query(
            "INSERT INTO parent_students (parent_id, student_id) VALUES (?, ?)",
            [parentResult.insertId, studentId]
        );


        res.status(201).json({
            success: true,
            message: "Account created successfully. Please log in."
        });

    }

    catch (error) {

        console.error("Register error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to create account."
        });

    }

});


// ======================================
// LOGIN (parent / teacher)
// ======================================

router.post("/login", async (req, res) => {

    try {

        const { email, password } = req.body;


        if (!email || !password) {

            return res.status(400).json({
                success: false,
                message: "Email and password are required."
            });

        }


        // Find user

        const [users] = await db.query(
            "SELECT id, name, email, password, role FROM users WHERE email = ?",
            [email]
        );

        if (users.length === 0) {

            return res.status(401).json({
                success: false,
                message: "Invalid email or password."
            });

        }

        const user = users[0];


        // Check password (plain text, like NullSync)

        if (password !== user.password) {

            return res.status(401).json({
                success: false,
                message: "Invalid email or password."
            });

        }


        // Build the user object to send

        const loggedIn = {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            parent_id: null,
            teacher_id: null
        };


        // Parent -> also send parent profile id

        if (user.role === "parent") {

            const [parents] = await db.query(
                "SELECT id FROM parents WHERE user_id = ?",
                [user.id]
            );

            if (parents.length > 0) {
                loggedIn.parent_id = parents[0].id;
            }

        }


        // Teacher -> also send teacher profile id

        if (user.role === "teacher") {

            const [teachers] = await db.query(
                "SELECT id FROM teachers WHERE user_id = ?",
                [user.id]
            );

            if (teachers.length > 0) {
                loggedIn.teacher_id = teachers[0].id;
            }

        }


        res.json({
            success: true,
            message: "Login successful.",
            user: loggedIn
        });

    }

    catch (error) {

        console.error("Login error:", error);

        res.status(500).json({
            success: false,
            message: "Server error."
        });

    }

});


// ======================================
// PROFILE (basic info)
// ======================================

router.get("/profile/:userId", async (req, res) => {

    try {

        const userId = req.params.userId;

        const [users] = await db.query(
            "SELECT id, name, email, role FROM users WHERE id = ?",
            [userId]
        );

        if (users.length === 0) {

            return res.status(404).json({
                success: false,
                message: "User not found."
            });

        }

        const user = users[0];


        // Parent -> add phone

        if (user.role === "parent") {

            const [parents] = await db.query(
                "SELECT phone FROM parents WHERE user_id = ?",
                [user.id]
            );

            user.phone = parents.length > 0 ? parents[0].phone : null;
        }


        // Teacher -> add employee id, department, designation

        if (user.role === "teacher") {

            const [teachers] = await db.query(
                "SELECT employee_id, department, designation FROM teachers WHERE user_id = ?",
                [user.id]
            );

            user.employee_id = teachers.length > 0 ? teachers[0].employee_id : null;
            user.department = teachers.length > 0 ? teachers[0].department : null;
            user.designation = teachers.length > 0 ? teachers[0].designation : null;
        }


        res.json({
            success: true,
            user: user
        });

    }

    catch (error) {

        console.error("Profile error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to get profile."
        });

    }

});


module.exports = router;
