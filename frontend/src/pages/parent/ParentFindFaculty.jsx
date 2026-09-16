import { useEffect, useState } from "react";

import api from "../../api";


// ==========================================
// FIND TEACHER (parent)
// Search and filter the teacher directory.
// ==========================================

export default function ParentFindFaculty() {

    const [teachers, setTeachers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [search, setSearch] = useState("");
    const [department, setDepartment] = useState("All");


    useEffect(() => {

        api.get("/teacher/directory")
            .then((res) => {
                setTeachers(res.data.teachers || []);
                setLoading(false);
            })

            .catch(() => {
                setError("Could not load teachers.");
                setLoading(false);
            });

    }, []);


    // Unique department list for the filter

    const departments = ["All"];

    teachers.forEach((f) => {

        if (!departments.includes(f.department)) {
            departments.push(f.department);
        }

    });


    // Apply search + filter

    const filtered = teachers.filter((f) => {

        const matchesSearch = f.name
            .toLowerCase()
            .includes(search.toLowerCase());

        const matchesDept =
            department === "All" || f.department === department;

        return matchesSearch && matchesDept;

    });


    if (loading) {
        return <div className="page"><p className="muted">Loading...</p></div>;
    }


    return (

        <div className="page">

            <div className="page-head">
                <h1>Find Teacher</h1>
                <p>Search teachers and see who has PTM slots.</p>
            </div>


            {error && <div className="alert alert-error">{error}</div>}


            <div className="filter-bar">

                <input
                    type="text"
                    placeholder="Search by name..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />

                <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                >
                    {departments.map((d) => (
                        <option key={d} value={d}>{d}</option>
                    ))}
                </select>

            </div>


            {filtered.length === 0 ? (

                <div className="empty">
                    <h3>No teachers found</h3>
                    <p>Try a different name or department.</p>
                </div>

            ) : (

                <div className="card-grid">

                    {filtered.map((f) => (

                        <div key={f.teacher_id} className="info-card">

                            <h3>{f.name}</h3>

                            <p className="muted">
                                {f.designation ? f.designation + " - " : ""}
                                {f.department}
                            </p>

                            <span className={`badge ${f.slot_count > 0 ? "badge-green" : "badge-grey"}`}>
                                {f.slot_count > 0
                                    ? `${f.slot_count} slot(s) open`
                                    : "No slots yet"}
                            </span>

                        </div>

                    ))}

                </div>

            )}

        </div>

    );

}
