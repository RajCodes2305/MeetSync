import { useEffect, useState } from "react";

import api, { getError } from "../../api";


// ==========================================
// PARENTS (teacher)
// Create parent accounts. Every parent is
// permanently linked to exactly one child,
// chosen when the account is created.
// ==========================================

export default function TeacherParents() {

    const [parents, setParents] = useState([]);
    const [students, setStudents] = useState([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");

    const [showForm, setShowForm] = useState(false);

    const empty = { name: "", email: "", password: "", phone: "", studentId: "" };

    const [form, setForm] = useState(empty);


    function load() {

        api.get("/teacher/parents")
            .then((res) => {
                setParents(res.data.parents);
                setLoading(false);
            })

            .catch(() => {
                setError("Could not load parents.");
                setLoading(false);
            });

        api.get("/teacher/students")
            .then((res) => setStudents(res.data.students))
            .catch(() => {});

    }


    useEffect(() => {
        load();
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
        setMessage("");

        if (!form.studentId) {

            setError("Please choose the child for this parent.");

            return;

        }

        try {

            const res = await api.post("/teacher/parents", {
                ...form,
                studentId: Number(form.studentId)
            });

            setMessage(res.data.message);
            setShowForm(false);
            setForm(empty);

            load();

        }

        catch (err) {

            setError(getError(err));

        }

    }


    async function handleDelete(id) {

        if (!window.confirm("Delete this parent account? Their child becomes claimable again.")) return;

        try {

            const res = await api.delete(`/teacher/parents/${id}`);

            setMessage(res.data.message);

            load();

        }

        catch (err) {

            setError(getError(err));

        }

    }


    if (loading) {
        return <div className="page"><p className="muted">Loading...</p></div>;
    }


    // Students without a parent account yet -
    // these are the ones that can be claimed

    const unclaimed = students.filter((s) => !s.parents);


    return (

        <div className="page">

            <div className="page-head">

                <div>
                    <h1>Parents</h1>
                    <p>Each parent account is permanently linked to one child.</p>
                </div>

                <button
                    className="btn btn-primary"
                    onClick={() => setShowForm(!showForm)}
                >
                    {showForm ? "Close" : "+ Add parent"}
                </button>

            </div>


            {error && <div className="alert alert-error">{error}</div>}

            {message && <div className="alert alert-success">{message}</div>}


            {/* CREATE FORM */}

            {showForm && (

                <div className="panel">

                    <h3>Add parent account</h3>

                    <form className="form-row" onSubmit={handleSubmit}>

                        <label className="field">
                            Name
                            <input
                                name="name"
                                value={form.name}
                                onChange={handleChange}
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
                                required
                            />
                        </label>

                        <label className="field">
                            Password
                            <input
                                name="password"
                                value={form.password}
                                onChange={handleChange}
                                required
                            />
                        </label>

                        <label className="field">
                            Phone
                            <input
                                name="phone"
                                value={form.phone}
                                onChange={handleChange}
                            />
                        </label>

                        <label className="field">
                            Their child
                            <select
                                name="studentId"
                                value={form.studentId}
                                onChange={handleChange}
                                required
                            >
                                <option value="">- select child -</option>

                                {unclaimed.map((s) => (
                                    <option key={s.id} value={s.id}>
                                        {s.roll_no} - {s.name}
                                    </option>
                                ))}

                            </select>
                        </label>

                        <button type="submit" className="btn btn-primary">
                            Add
                        </button>

                    </form>

                    {unclaimed.length === 0 && (
                        <p className="muted small">
                            No unclaimed students. Add students on the Students
                            page first - a child can only belong to one parent.
                        </p>
                    )}

                </div>

            )}


            {/* TABLE */}

            {parents.length === 0 ? (

                <div className="empty">
                    <h3>No parents yet</h3>
                    <p>Add a parent account above.</p>
                </div>

            ) : (

                <table className="data-table">

                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Phone</th>
                            <th>Child</th>
                            <th></th>
                        </tr>
                    </thead>

                    <tbody>

                        {parents.map((p) => (

                            <tr key={p.parent_id}>
                                <td>{p.name}</td>
                                <td>{p.email}</td>
                                <td>{p.phone || "-"}</td>
                                <td>{p.children || "-"}</td>
                                <td>

                                    <div className="btn-row">

                                        <button
                                            className="btn btn-danger btn-sm"
                                            onClick={() => handleDelete(p.parent_id)}
                                        >
                                            Delete
                                        </button>

                                    </div>

                                </td>
                            </tr>

                        ))}

                    </tbody>

                </table>

            )}

        </div>

    );

}
