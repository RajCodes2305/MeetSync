import { useEffect, useState } from "react";

import api, { getUser, formatDate, formatTime, getError } from "../../api";


// ==========================================
// MY AVAILABILITY (teacher)
// - Create many slots at once by picking a
//   date + start time + end time
// - Remove single slots that are not booked
// ==========================================

export default function TeacherAvailability() {

    const user = getUser();

    const [slots, setSlots] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [busy, setBusy] = useState(false);

    // Slot generator form

    const [form, setForm] = useState({
        date: "",
        startTime: "10:00",
        endTime: "13:00",
        duration: "30"
    });


    function load() {

        setLoading(true);

        api.get(`/teacher/slots/${user.teacher_id}`)
            .then((res) => {
                setSlots(res.data.slots);
                setLoading(false);
            })

            .catch(() => {
                setError("Could not load slots.");
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


    async function handleCreate(e) {

        e.preventDefault();

        setError("");
        setMessage("");
        setBusy(true);


        // Which event to add slots for? Use the
        // first active event (simple approach)

        try {

            const eventsRes = await api.get("/teacher/events");
            const active = eventsRes.data.events.find(
                (e) => e.status === "active"
            );

            if (!active) {

                setError("No active PTM event. Create and activate one first.");
                setBusy(false);
                return;

            }


            const res = await api.post("/teacher/slots", {
                teacherId: user.teacher_id,
                eventId: active.id,
                date: form.date,
                startTime: form.startTime,
                endTime: form.endTime,
                duration: form.duration
            });

            setMessage(res.data.message);

            load();

        }

        catch (err) {

            setError(getError(err));

        }

        finally {

            setBusy(false);

        }

    }


    async function handleDelete(slotId) {

        setMessage("");
        setError("");

        try {

            const res = await api.delete(`/teacher/slots/${slotId}`, {
                data: { teacherId: user.teacher_id }
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


    return (

        <div className="page">

            <div className="page-head">
                <h1>My Availability</h1>
                <p>Open time slots for parents to book.</p>
            </div>


            {error && <div className="alert alert-error">{error}</div>}

            {message && <div className="alert alert-success">{message}</div>}


            {/* CREATE SLOTS FORM */}

            <div className="panel">

                <h3>Add slots</h3>

                <p className="muted">
                    Pick a date and a time window - the system
                    creates equal slots automatically.
                </p>

                <form className="form-row" onSubmit={handleCreate}>

                    <label className="field">
                        Date
                        <input
                            type="date"
                            name="date"
                            value={form.date}
                            onChange={handleChange}
                            required
                        />
                    </label>

                    <label className="field">
                        From
                        <input
                            type="time"
                            name="startTime"
                            value={form.startTime}
                            onChange={handleChange}
                            required
                        />
                    </label>

                    <label className="field">
                        To
                        <input
                            type="time"
                            name="endTime"
                            value={form.endTime}
                            onChange={handleChange}
                            required
                        />
                    </label>

                    <label className="field">
                        Slot length (min)
                        <select
                            name="duration"
                            value={form.duration}
                            onChange={handleChange}
                        >
                            <option value="15">15</option>
                            <option value="30">30</option>
                            <option value="45">45</option>
                            <option value="60">60</option>
                        </select>
                    </label>

                    <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={busy}
                    >
                        {busy ? "Creating..." : "Create slots"}
                    </button>

                </form>

            </div>


            {/* SLOT LIST */}

            <h3 className="section-title">My slots ({slots.length})</h3>


            {slots.length === 0 ? (

                <div className="empty">
                    <h3>No slots yet</h3>
                    <p>Use the form above to open your availability.</p>
                </div>

            ) : (

                <table className="data-table">

                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Time</th>
                            <th>Event</th>
                            <th>Status</th>
                            <th></th>
                        </tr>
                    </thead>

                    <tbody>

                        {slots.map((s) => (

                            <tr key={s.id}>

                                <td>{formatDate(s.date)}</td>

                                <td>
                                    {formatTime(s.start_time)} - {formatTime(s.end_time)}
                                </td>

                                <td>{s.event_title}</td>

                                <td>
                                    <span className={`badge ${
                                        s.status === "available" ? "badge-green" :
                                        s.status === "booked" ? "badge-blue" : "badge-grey"
                                    }`}>
                                        {s.status}
                                    </span>
                                </td>

                                <td>

                                    {s.status === "available" && (
                                        <button
                                            className="btn btn-outline btn-sm"
                                            onClick={() => handleDelete(s.id)}
                                        >
                                            Remove
                                        </button>
                                    )}

                                </td>

                            </tr>

                        ))}

                    </tbody>

                </table>

            )}

        </div>

    );

}
