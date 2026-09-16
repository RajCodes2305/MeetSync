import React, { useState } from "react";
import { Navigate, Route, Routes, Link } from "react-router-dom";

import HomePage from "./pages/HomePage.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Privacy from "./pages/Privacy.jsx";

import ParentStudents from "./pages/parent/ParentStudents.jsx";
import ParentFindFaculty from "./pages/parent/ParentFindFaculty.jsx";
import ParentBook from "./pages/parent/ParentBook.jsx";
import ParentAppointments from "./pages/parent/ParentAppointments.jsx";

import TeacherStudents from "./pages/teacher/TeacherStudents.jsx";
import TeacherParents from "./pages/teacher/TeacherParents.jsx";
import TeacherEvents from "./pages/teacher/TeacherEvents.jsx";
import TeacherAvailability from "./pages/teacher/TeacherAvailability.jsx";
import TeacherAppointments from "./pages/teacher/TeacherAppointments.jsx";
import TeacherReports from "./pages/teacher/TeacherReports.jsx";

import RoleLayout from "./pages/RoleLayout.jsx";


// ==========================================
// GET LOGGED-IN USER
// ==========================================

function getUser() {

    try {

        return JSON.parse(
            localStorage.getItem("meetsync_user")
        );

    }

    catch {

        return null;

    }

}


// ==========================================
// PROTECTED ROUTE
// ==========================================

function ProtectedRoute({ role, children }) {

    const user = getUser();


    // User not logged in

    if (!user) {

        return (
            <Navigate
                to="/login"
                replace
            />
        );

    }


    // Wrong role -> send to own dashboard

    if (
        role &&
        user.role !== role
    ) {

        return (
            <Navigate
                to={`/${user.role}`}
                replace
            />
        );

    }

    return children;

}


// ==========================================
// DASHBOARD PAGES (home of each role)
// ==========================================

function ParentHome() {

    return (

        <div className="page">

            <div className="page-head">
                <h1>Parent Dashboard</h1>
                <p>Book and manage your PTM appointments.</p>
            </div>

            <div className="card-grid">

                <Link to="/parent/book" className="stat-card">
                    <h3>Book Appointment</h3>
                    <p>Pick a teacher, date and time slot.</p>
                </Link>

                <Link to="/parent/appointments" className="stat-card">
                    <h3>My Appointments</h3>
                    <p>See upcoming and past meetings.</p>
                </Link>

                <Link to="/parent/teachers" className="stat-card">
                    <h3>Find Teacher</h3>
                    <p>Browse teachers by department.</p>
                </Link>

            </div>

        </div>

    );

}


function TeacherHome() {

    return (

        <div className="page">

            <div className="page-head">
                <h1>Teacher Dashboard</h1>
                <p>Arrange PTM events and manage your meetings.</p>
            </div>

            <div className="card-grid">

                <Link to="/teacher/events" className="stat-card">
                    <h3>PTM Events</h3>
                    <p>Create and activate meeting events.</p>
                </Link>

                <Link to="/teacher/availability" className="stat-card">
                    <h3>My Availability</h3>
                    <p>Open time slots for parents to book.</p>
                </Link>

                <Link to="/teacher/appointments" className="stat-card">
                    <h3>Appointments</h3>
                    <p>See bookings and mark meetings done.</p>
                </Link>

                <Link to="/teacher/students" className="stat-card">
                    <h3>Students</h3>
                    <p>Add students and link parents.</p>
                </Link>

            </div>

        </div>

    );

}


// ==========================================
// APP (all routes)
// ==========================================

export default function App() {

    return (

        <Routes>

            {/* Public pages */}

            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/privacy" element={<Privacy />} />


            {/* Parent portal */}

            <Route
                path="/parent"
                element={
                    <ProtectedRoute role="parent">
                        <RoleLayout
                            role="parent"
                            links={[
                                { to: "/parent", label: "Dashboard", end: true },
                                { to: "/parent/students", label: "My Student" },
                                { to: "/parent/teachers", label: "Find Teacher" },
                                { to: "/parent/book", label: "Book Appointment" },
                                { to: "/parent/appointments", label: "My Appointments" }
                            ]}
                        />
                    </ProtectedRoute>
                }
            >
                <Route index element={<ParentHome />} />
                <Route path="students" element={<ParentStudents />} />
                <Route path="teachers" element={<ParentFindFaculty />} />
                <Route path="book" element={<ParentBook />} />
                <Route path="appointments" element={<ParentAppointments />} />
            </Route>


            {/* Teacher portal */}

            <Route
                path="/teacher"
                element={
                    <ProtectedRoute role="teacher">
                        <RoleLayout
                            role="teacher"
                            links={[
                                { to: "/teacher", label: "Dashboard", end: true },
                                { to: "/teacher/students", label: "Students" },
                                { to: "/teacher/parents", label: "Parents" },
                                { to: "/teacher/events", label: "PTM Events" },
                                { to: "/teacher/availability", label: "My Availability" },
                                { to: "/teacher/appointments", label: "Appointments" },
                                { to: "/teacher/reports", label: "Reports" }
                            ]}
                        />
                    </ProtectedRoute>
                }
            >
                <Route index element={<TeacherHome />} />
                <Route path="students" element={<TeacherStudents />} />
                <Route path="parents" element={<TeacherParents />} />
                <Route path="events" element={<TeacherEvents />} />
                <Route path="availability" element={<TeacherAvailability />} />
                <Route path="appointments" element={<TeacherAppointments />} />
                <Route path="reports" element={<TeacherReports />} />
            </Route>


            {/* Anything else -> home */}

            <Route path="*" element={<Navigate to="/" replace />} />

        </Routes>

    );

}
