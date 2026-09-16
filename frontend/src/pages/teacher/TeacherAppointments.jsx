import { useEffect, useState } from "react";

import api, { formatDate, formatTime, getError } from "../../api";


// ==========================================
// ALL APPOINTMENTS (teacher)
// Monitor every booking, mark completed
// with private remarks, or cancel.
// ==========================================

export default function TeacherAppointments() {

    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");

    const [statusFilter, setStatusFilter] = useState("All");
    const [search, setSearch] = useState("");

    // Complete dialog state

    const [target, setTarget] = useState(null);
    const [remarks, setRemarks] = useState("");
    const [busy, setBusy] = useState(false);


    function load() {

        api.get("/teacher/appointments")
            .then((res) => {
                setAppointments(res.data.appointments);
                setLoading(false);
            })

            .catch(() => {
                setError("Could not load appointments.");
                setLoading(false);
            });

    }


    useEffect(() => {
        load();
    }, []);


    async function handleComplete() {

        setBusy(true);

        try {

            const res = await api.post(
                `/teacher/appointments/${target.id}/complete`,
                {
                    remarks: remarks
                }
            );

            setMessage(res.data.message);
            setTarget(null);
            setRemarks("");
            load();

        }

        catch (err) {

            setError(getError(err));

        }

        finally {

            setBusy(false);

        }

    }


    async function handleCancel(a) {

        const reason = window.prompt(
            "Reason for cancelling (optional):"
        );

        if (reason === null) return;


        try {

            const res = await api.post(`/teacher/appointments/${a.id}/cancel`, {
                reason: reason
            });

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


    const shown = appointments.filter((a) => {

        const matchesStatus =
            statusFilter === "All" || a.status === statusFilter;

        const text = (
            a.student_name + " " + a.parent_name + " " +
            (a.teacher_name || "") + " " + a.roll_no
        ).toLowerCase();

        const matchesSearch = text.includes(search.toLowerCase());

        return matchesStatus && matchesSearch;

    });


    return (

        <div className="page">

            <div className="page-head">
                <h1>Appointments</h1>
                <p>Every booking across the college.</p>
            </div>


            {error && <div className="alert alert-error">{error}</div>}

            {message && <div className="alert alert-success">{message}</div>}


            <div className="filter-bar">

                <input
                    type="text"
                    placeholder="Search student, parent..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />

                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                >
                    <option>All</option>
                    <option>booked</option>
                    <option>completed</option>
                    <option>cancelled</option>
                </select>

            </div>


            {shown.length === 0 ? (

                <div className="empty">
                    <h3>No appointments</h3>
                    <p>Bookings will appear here once parents start booking.</p>
                </div>

            ) : (

                <table className="data-table">

                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Time</th>
                            <th>Student</th>
                            <th>Parent</th>
                            <th>Event</th>
                            <th>Status</th>
                            <th></th>
                        </tr>
                    </thead>

                    <tbody>

                        {shown.map((a) => (

                            <tr key={a.id}>
                                <td>{formatDate(a.date)}</td>
                                <td>{formatTime(a.start_time)}</td>
                                <td>
                                    {a.student_name}
                                    <br />
                                    <span className="muted small">{a.roll_no}</span>
                                </td>
                                <td>
                                    {a.parent_name}
                                    <br />
                                    <span className="muted small">{a.parent_email}</span>
                                </td>
                                <td>{a.event_title}</td>
                                <td>
                                    <span className={`badge ${
                                        a.status === "booked" ? "badge-blue" :
                                        a.status === "completed" ? "badge-green" : "badge-red"
                                    }`}>
                                        {a.status}
                                    </span>
                                    {a.cancel_reason && (
                                        <>
                                            <br />
                                            <span className="muted small">{a.cancel_reason}</span>
                                        </>
                                    )}
                                </td>
                                <td>

                                    {a.status === "booked" && (

                                        <div className="btn-col">

                                            <button
                                                className="btn btn-primary btn-sm"
                                                onClick={() => {
                                                    setTarget(a);
                                                    setRemarks(a.remarks || "");
                                                }}
                                            >
                                                Complete
                                            </button>

                                            <button
                                                className="btn btn-danger btn-sm"
                                                onClick={() => handleCancel(a)}
                                            >
                                                Cancel
                                            </button>

                                        </div>

                                    )}

                                </td>
                            </tr>

                        ))}

                    </tbody>

                </table>

            )}


            {/* COMPLETE DIALOG */}

            {target && (

                <div className="modal-backdrop">

                    <div className="modal">

                        <h3>Complete meeting</h3>

                        <p className="muted">
                            {target.student_name} ({target.roll_no}) -{" "}
                            {formatDate(target.date)} at {formatTime(target.start_time)}
                        </p>


                        <label className="field">
                            Private remarks (optional)
                            <textarea
                                rows="3"
                                value={remarks}
                                onChange={(e) => setRemarks(e.target.value)}
                                placeholder="Notes about this meeting - only you can see these"
                            />
                        </label>


                        <div className="btn-row">

                            <button
                                className="btn btn-outline"
                                onClick={() => setTarget(null)}
                            >
                                Close
                            </button>

                            <button
                                className="btn btn-primary"
                                disabled={busy}
                                onClick={handleComplete}
                            >
                                {busy ? "Saving..." : "Mark completed"}
                            </button>

                        </div>

                    </div>

                </div>

            )}

        </div>

    );

}
