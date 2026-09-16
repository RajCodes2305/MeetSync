import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import api, { getError } from "../api";


// ==========================================
// PARENT REGISTRATION PAGE
// ==========================================

export default function Register() {

    const navigate = useNavigate();

    const [form, setForm] = useState({
        name: "",
        email: "",
        phone: "",
        password: "",
        studentId: ""
    });

    const [students, setStudents] = useState([]);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [loading, setLoading] = useState(false);


    // Load the students that are still
    // unclaimed (no parent account yet)

    useEffect(() => {

        api.get("/auth/students")
            .then((res) => setStudents(res.data.students))
            .catch(() => {});

    }, []);


    function handleChange(e) {

        setForm({
            ...form,
            [e.target.name]: e.target.value
        });

    }


    async function handleSubmit(e) {

        e.preventDefault();

        setError("");
        setSuccess("");

        if (form.password.length < 6) {

            setError("Password must be at least 6 characters.");

            return;

        }

        if (!form.studentId) {

            setError("Please select your child.");

            return;

        }

        setLoading(true);

        try {

            const res = await api.post("/auth/register", form);

            setSuccess(res.data.message);


            // Small delay so the user sees the
            // success message before redirect

            setTimeout(() => {
                navigate("/login");
            }, 1200);

        }

        catch (err) {

            setError(getError(err));

            setLoading(false);

        }

    }


    return (

        <div className="auth-page">

            <form className="auth-card" onSubmit={handleSubmit}>

                <Link to="/" className="auth-brand">
                    Meet<span>Sync</span>
                </Link>

                <h1>Create parent account</h1>

                <p className="auth-sub">
                    Select your child once - your account is
                    permanently linked to them.
                </p>


                {error && (
                    <div className="alert alert-error">{error}</div>
                )}

                {success && (
                    <div className="alert alert-success">{success}</div>
                )}


                <label className="field">
                    Full name
                    <input
                        type="text"
                        name="name"
                        value={form.name}
                        onChange={handleChange}
                        placeholder="e.g. Suresh Menon"
                        required
                    />
                </label>


                <label className="field">
                    Email
                    <input
                        type="email"
                        name="email"
                        value={form.email}
                        onChange={handleChange}
                        placeholder="you@example.com"
                        required
                    />
                </label>


                <label className="field">
                    Your child
                    <select
                        name="studentId"
                        value={form.studentId}
                        onChange={handleChange}
                        required
                    >
                        <option value="">- select your child -</option>

                        {students.map((s) => (
                            <option key={s.id} value={s.id}>
                                {s.roll_no} - {s.name}
                            </option>
                        ))}

                    </select>
                </label>

                {students.length === 0 && (
                    <p className="muted small">
                        No unclaimed students right now - the teacher
                        adds students from their account first.
                    </p>
                )}


                <label className="field">
                    Phone (optional)
                    <input
                        type="tel"
                        name="phone"
                        value={form.phone}
                        onChange={handleChange}
                        placeholder="10 digit mobile number"
                    />
                </label>


                <label className="field">
                    Password
                    <input
                        type="password"
                        name="password"
                        value={form.password}
                        onChange={handleChange}
                        placeholder="At least 6 characters"
                        required
                    />
                </label>


                <button
                    type="submit"
                    className="btn btn-primary btn-block"
                    disabled={loading}
                >
                    {loading ? "Creating account..." : "Create account"}
                </button>


                <p className="auth-switch">
                    Already registered?{" "}
                    <Link to="/login">Log in</Link>
                </p>

            </form>

        </div>

    );

}
