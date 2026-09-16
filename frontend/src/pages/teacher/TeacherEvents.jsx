import { useEffect, useState } from "react";

import api, { getUser, formatDate, formatTime, getError } from "../../api";


// ==========================================
// PTM EVENTS (teacher)
// Create events, activate / close them.
// Parents can only book on active events.
// ==========================================

export default function TeacherEvents() {

    const user = getUser();

    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");

    const [showForm, setShowForm] = useState(false);

    const empty = {
        title: "",
        venue: "",
        start_date: "",
        end_date: "",
        start_time: "10:00",
        end_time: "13:00",
        slot_duration: "15"
    };

    const [form, setForm] = useState(empty);


    function load() {

        api.get("/teacher/events")
            .then((res) => {
                setEvents(res.data.events);
                setLoading(false);
            })

            .catch(() => {
                setError("Could not load events.");
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

            const res = await api.post("/teacher/events", {
                ...form,
                teacherId: user.teacher_id
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


    async function handleStatus(id, status) {

        try {

            const res = await api.put(`/teacher/events/${id}/status`, { status });

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

                <div>
                    <h1>PTM Events</h1>
                    <p>Each event is one PTM window parents book into.</p>
                </div>

                <button
                    className="btn btn-primary"
                    onClick={() => setShowForm(!showForm)}
                >
                    {showForm ? "Close" : "+ New event"}
                </button>

            </div>


            {error && <div className="alert alert-error">{error}</div>}

            {message && <div className="alert alert-success">{message}</div>}


            {showForm && (

                <div className="panel">

                    <h3>Create PTM event</h3>

                    <p className="muted">
                        Your slots are created automatically for every day,
                        from the daily start to end time. They appear in
                        My Availability right away and become bookable when
                        you activate the event.
                    </p>

                    <form className="form-row" onSubmit={handleSubmit}>

                        <label className="field">
                            Title
                            <input
                                name="title"
                                value={form.title}
                                onChange={handleChange}
                                placeholder="e.g. Semester PTM - Odd 2026"
                                required
                            />
                        </label>

                        <label className="field">
                            Venue
                            <input
                                name="venue"
                                value={form.venue}
                                onChange={handleChange}
                                placeholder="e.g. Main Block"
                                required
                            />
                        </label>

                        <label className="field">
                            Start date
                            <input
                                type="date"
                                name="start_date"
                                value={form.start_date}
                                onChange={handleChange}
                                required
                            />
                        </label>

                        <label className="field">
                            End date
                            <input
                                type="date"
                                name="end_date"
                                value={form.end_date}
                                onChange={handleChange}
                                required
                            />
                        </label>

                        <label className="field">
                            Daily from
                            <input
                                type="time"
                                name="start_time"
                                value={form.start_time}
                                onChange={handleChange}
                                required
                            />
                        </label>

                        <label className="field">
                            Daily to
                            <input
                                type="time"
                                name="end_time"
                                value={form.end_time}
                                onChange={handleChange}
                                required
                            />
                        </label>

                        <label className="field">
                            Slot length (min)
                            <select
                                name="slot_duration"
                                value={form.slot_duration}
                                onChange={handleChange}
                            >
                                <option value="10">10</option>
                                <option value="15">15</option>
                                <option value="20">20</option>
                                <option value="30">30</option>
                            </select>
                        </label>

                        <button type="submit" className="btn btn-primary">
                            Create
                        </button>

                    </form>

                </div>

            )}


            {events.length === 0 ? (

                <div className="empty">
                    <h3>No events yet</h3>
                    <p>Create your first PTM event above.</p>
                </div>

            ) : (

                <table className="data-table">

                    <thead>
                        <tr>
                            <th>Event</th>
                            <th>Dates</th>
                            <th>Daily time</th>
                            <th>Slot</th>
                            <th>Booked</th>
                            <th>Status</th>
                            <th></th>
                        </tr>
                    </thead>

                    <tbody>

                        {events.map((e) => (

                            <tr key={e.id}>
                                <td>
                                    <strong>{e.title}</strong>
                                    <br />
                                    <span className="muted small">{e.venue}</span>
                                </td>
                                <td>
                                    {formatDate(e.start_date)}
                                    <br />
                                    to {formatDate(e.end_date)}
                                </td>
                                <td>
                                    {formatTime(e.start_time)} - {formatTime(e.end_time)}
                                </td>
                                <td>{e.slot_duration} min</td>
                                <td>
                                    {e.booked_slots} / {e.total_slots}
</td>
                                <td>
                                    <span className={`badge ${
                                        e.status === "active" ? "badge-green" :
                                        e.status === "draft" ? "badge-grey" : "badge-red"
                                    }`}>
                                        {e.status}
                                    </span>
                                </td>
                                <td>

                                    <div className="btn-row">

                                        {e.status === "draft" && (
                                            <button
                                                className="btn btn-primary btn-sm"
                                                onClick={() => handleStatus(e.id, "active")}
                                            >
                                                Activate
                                            </button>
                                        )}

                                        {e.status === "active" && (
                                            <button
                                                className="btn btn-outline btn-sm"
                                                onClick={() => handleStatus(e.id, "closed")}
                                            >
                                                Close
                                            </button>
                                        )}

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
