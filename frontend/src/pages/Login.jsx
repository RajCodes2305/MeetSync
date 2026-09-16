import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import api, { saveUser, getError } from "../api";


// ==========================================
// LOGIN PAGE
// Redirects each role to its own dashboard.
// ==========================================

export default function Login() {

    const navigate = useNavigate();

    const [form, setForm] = useState({
        email: "",
        password: ""
    });

    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);


    function handleChange(e) {

        setForm({
            ...form,
            [e.target.name]: e.target.value
        });

    }


    async function handleSubmit(e) {

        e.preventDefault();

        setError("");
        setLoading(true);

        try {

            const res = await api.post("/auth/login", form);

            saveUser(res.data.user);


            // Send each role to its own portal

            const role = res.data.user.role;

            navigate(`/${role}`);

        }

        catch (err) {

            setError(getError(err));

        }

        finally {

            setLoading(false);

        }

    }


    return (

        <div className="auth-page">

            <form className="auth-card" onSubmit={handleSubmit}>

                <Link to="/" className="auth-brand">
                    Meet<span>Sync</span>
                </Link>

                <h1>Welcome back</h1>

                <p className="auth-sub">
                    Log in to your parent or teacher account.
                </p>


                {error && (
                    <div className="alert alert-error">{error}</div>
                )}


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
                    Password
                    <input
                        type="password"
                        name="password"
                        value={form.password}
                        onChange={handleChange}
                        placeholder="Your password"
                        required
                    />
                </label>


                <button
                    type="submit"
                    className="btn btn-primary btn-block"
                    disabled={loading}
                >
                    {loading ? "Logging in..." : "Login"}
                </button>


                <p className="auth-switch">
                    New parent here?{" "}
                    <Link to="/register">Create an account</Link>
                </p>


                <div className="demo-box">

                    <strong>Demo logins</strong>

                    <span>Teacher: anil@meetsync.com / teacher123</span>

                    <span>Parent : parent1@meetsync.com / parent123</span>

                </div>

            </form>

        </div>

    );

}
