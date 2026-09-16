import { useEffect, useState } from "react";

import api, { getError } from "../../api";


// ==========================================
// STUDENTS (teacher)
// Add, edit, delete students.
// ==========================================

export default function TeacherStudents() {

    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");

    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState(null);

    const empty = {
        roll_no: "",
        name: "",
        department: "Computer Science",
        year: "1",
        section: "A"
    };

    const [form, setForm] = useState(empty);

    const [search, setSearch] = useState("");


    function load() {

        setLoading(true);

        api.get("/teacher/students")
            .then((res) => {
                setStudents(res.data.students);
                setLoading(false);
            })

            .catch(() => {
                setError("Could not load students.");
                setLoading(false);
            });

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

        try {

            if (editing) {

                const res = await api.put(`/teacher/students/${editing}`, form);

                setMessage(res.data.message);

            } else {

                const res = await api.post("/teacher/students", form);

                setMessage(res.data.message);

            }

            setShowForm(false);
            setEditing(null);
            setForm(empty);

            load();

        }

        catch (err) {

            setError(getError(err));

        }

    }


    async function handleDelete(id) {

        if (!window.confirm("Delete this student?")) return;

        try {

            const res = await api.delete(`/teacher/students/${id}`);

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


    const shown = students.filter((s) =>
        (s.name + " " + s.roll_no)
            .toLowerCase()
            .includes(search.toLowerCase())
    );


    return (

        <div className="page">

            <div className="page-head">

                <div>
                    <h1>Students</h1>
                    <p>Add students and keep their details current.</p>
                </div>

                <button
                    className="btn btn-primary"
                    onClick={() => {
                        setShowForm(!showForm);
                        setEditing(null);
                        setForm(empty);
                    }}
                >
                    {showForm ? "Close" : "+ Add student"}
                </button>

            </div>


            {error && <div className="alert alert-error">{error}</div>}

            {message && <div className="alert alert-success">{message}</div>}


            {/* ADD / EDIT FORM */}

            {showForm && (

                <div className="panel">

                    <h3>{editing ? "Edit student" : "Add student"}</h3>

                    <form className="form-row" onSubmit={handleSubmit}>

                        <label className="field">
                            Roll no
                            <input
                                name="roll_no"
                                value={form.roll_no}
                                onChange={handleChange}
                                required
                            />
                        </label>

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
                            Department
                            <input
                                name="department"
                                value={form.department}
                                onChange={handleChange}
                                required
                            />
                        </label>

                        <label className="field">
                            Year
                            <select
                                name="year"
                                value={form.year}
                                onChange={handleChange}
                            >
                                <option value="1">1</option>
                                <option value="2">2</option>
                                <option value="3">3</option>
                                <option value="4">4</option>
                            </select>
                        </label>

                        <label className="field">
                            Section
                            <select
                                name="section"
                                value={form.section}
                                onChange={handleChange}
                            >
                                <option value="A">A</option>
                                <option value="B">B</option>
                                <option value="C">C</option>
                            </select>
                        </label>

                        <button type="submit" className="btn btn-primary">
                            {editing ? "Update" : "Add"}
                        </button>

                    </form>

                </div>

            )}


            {/* SEARCH */}

            <div className="filter-bar">
                <input
                    type="text"
                    placeholder="Search by name or roll no..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>


            {/* TABLE */}

            {shown.length === 0 ? (

                <div className="empty">
                    <h3>No students</h3>
                    <p>Add your first student above.</p>
                </div>

            ) : (

                <table className="data-table">

                    <thead>
                        <tr>
                            <th>Roll No</th>
                            <th>Name</th>
                            <th>Department</th>
                            <th>Year</th>
                            <th>Section</th>
                            <th>Parent(s)</th>
                            <th></th>
                        </tr>
                    </thead>

                    <tbody>

                        {shown.map((s) => (

                            <tr key={s.id}>
                                <td>{s.roll_no}</td>
                                <td>{s.name}</td>
                                <td>{s.department}</td>
                                <td>{s.year}</td>
                                <td>{s.section}</td>
                                <td>{s.parents || "-"}</td>
                                <td>

                                    <div className="btn-row">

                                        <button
                                            className="btn btn-outline btn-sm"
                                            onClick={() => {
                                                setEditing(s.id);
                                                setForm({
                                                    roll_no: s.roll_no,
                                                    name: s.name,
                                                    department: s.department,
                                                    year: s.year,
                                                    section: s.section
                                                });
                                                setShowForm(true);
                                            }}
                                        >
                                            Edit
                                        </button>

                                        <button
                                            className="btn btn-danger btn-sm"
                                            onClick={() => handleDelete(s.id)}
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
