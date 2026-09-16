import { useEffect, useState } from "react";

import api, { getUser, formatDate, formatTime, getError } from "../../api";


// ==========================================
// MY APPOINTMENTS (parent)
// Upcoming and past, with cancel and
// reschedule actions.
// ==========================================

export default function ParentAppointments() {

    const user = getUser();

    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");

    const [tab, setTab] = useState("upcoming");

    // Cancel dialog state

    const [cancelTarget, setCancelTarget] = useState(null);
    const [cancelReason, setCancelReason] = useState("");
    const [busy, setBusy] = useState(false);


    function load() {

        setLoading(true);

        api.get(`/parent/appointments/${user.parent_id}`)
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


    // Split into upcoming / past

    const today = new Date().toISOString().slice(0, 10);

    const upcoming = appointments.filter(
        (a) => a.status === "booked" && a.date >= today
    );

    const past = appointments.filter(
        (a) => a.status !== "booked" || a.date < today
    );

    const shown = tab === "upcoming" ? upcoming : past;


    async function handleCancel() {

        setBusy(true);

        try {

            const res = await api.post(
                `/parent/appointments/${cancelTarget.id}/cancel`,
                {
                    parentId: user.parent_id,
                    reason: cancelReason
                }
            );

            setMessage(res.data.message);
            setCancelTarget(null);
            setCancelReason("");
            load();

        }

        catch (err) {

            setError(getError(err));

        }

        finally {

            setBusy(false);

        }

    }


    function handleReschedule(appt) {

        // Reschedule = book a new slot; the old
        // appointment is cancelled only after the
        // new one is confirmed (backend handles it)

        window.location.assign(`/parent/book?reschedule=${appt.id}`);

    }


    if (loading) {
        return <div className="page"><p className="muted">Loading...</p></div>;
    }


    return (

        <div className="page">

            <div className="page-head">
                <h1>My Appointments</h1>
                <p>All your PTM bookings in one place.</p>
            </div>


            {error && <div className="alert alert-error">{error}</div>}

            {message && <div className="alert alert-success">{message}</div>}


            <div className="tabs">

                <button
                    className={"tab" + (tab === "upcoming" ? " active" : "")}
                    onClick={() => setTab("upcoming")}
                >
                    Upcoming ({upcoming.length})
                </button>

                <button
                    className={"tab" + (tab === "past" ? " active" : "")}
                    onClick={() => setTab("past")}
                >
                    Past ({past.length})
                </button>

            </div>


            {shown.length === 0 ? (

                <div className="empty">
                    <h3>Nothing here yet</h3>
                    <p>Book an appointment from the Book Appointment page.</p>
                </div>

            ) : (

                <div className="appt-list">

                    {shown.map((a) => (

                        <div key={a.id} className="appt-card">

                            <div className="appt-when">

                                <strong>{formatDate(a.date)}</strong>

                                <span>
                                    {formatTime(a.start_time)} - {formatTime(a.end_time)}
                                </span>

                            </div>

                            <div className="appt-info">

                                <h3>{a.student_name} ({a.roll_no})</h3>

                                <p className="muted">
                                    with {a.teacher_name} - {a.department}
                                </p>

                                <p className="muted">
                                    {a.event_title} - {a.venue}
                                </p>

                            </div>

                            <div className="appt-side">

                                <StatusBadge status={a.status} />

                                {a.status === "cancelled" && a.cancel_reason && (
                                    <p className="muted small">
                                        Reason: {a.cancel_reason}
                                    </p>
                                )}

                                {a.status === "booked" && a.date >= today && (

                                    <div className="btn-col">

                                        <button
                                            className="btn btn-outline btn-sm"
                                            onClick={() => setCancelTarget(a)}
                                        >
                                            Cancel
                                        </button>

                                        <button
                                            className="btn btn-outline btn-sm"
                                            onClick={() => handleReschedule(a)}
                                        >
                                            Reschedule
                                        </button>

                                    </div>

                                )}

                            </div>

                        </div>

                    ))}

                </div>

            )}


            {/* CANCEL CONFIRMATION DIALOG */}

            {cancelTarget && (

                <div className="modal-backdrop">

                    <div className="modal">

                        <h3>Cancel this appointment?</h3>

                        <p className="muted">
                            {formatDate(cancelTarget.date)} at{" "}
                            {formatTime(cancelTarget.start_time)} with{" "}
                            {cancelTarget.teacher_name}
                        </p>


                        <label className="field">
                            Reason (optional)
                            <input
                                type="text"
                                value={cancelReason}
                                onChange={(e) => setCancelReason(e.target.value)}
                                placeholder="e.g. Not available that day"
                            />
                        </label>


                        <div className="btn-row">

                            <button
                                className="btn btn-outline"
                                onClick={() => setCancelTarget(null)}
                            >
                                Keep appointment
                            </button>

                            <button
                                className="btn btn-danger"
                                disabled={busy}
                                onClick={handleCancel}
                            >
                                {busy ? "Cancelling..." : "Yes, cancel it"}
                            </button>

                        </div>

                    </div>

                </div>

            )}

        </div>

    );

}


// ==========================================
// STATUS BADGE
// ==========================================

function StatusBadge({ status }) {

    const colors = {
        booked: "badge-blue",
        completed: "badge-green",
        cancelled: "badge-red"
    };

    return (
        <span className={`badge ${colors[status] || "badge-grey"}`}>
            {status}
        </span>
    );

}
