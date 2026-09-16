import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

import api, { getUser, formatDate, formatTime, getError } from "../../api";


// ==========================================
// BOOK APPOINTMENT (parent)
// The child is locked to this account, so
// only 3 steps are needed:
//   1. Choose teacher
//   2. Choose date + time slot
//   3. Confirm
// ==========================================

export default function ParentBook() {

    const user = getUser();

    // ?reschedule=ID means we are rescheduling
    // an existing appointment instead of booking

    const [searchParams] = useSearchParams();
    const rescheduleId = searchParams.get("reschedule");

    const [step, setStep] = useState(1);

    const [child, setChild] = useState(null);
    const [teachers, setTeachers] = useState([]);
    const [slots, setSlots] = useState([]);

    const [teacherId, setTeacherId] = useState(null);
    const [slot, setSlot] = useState(null);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [done, setDone] = useState(false);


    // Load this parent's (locked) child and
    // the teacher directory once

    useEffect(() => {

        api.get(`/parent/students/${user.parent_id}`)
            .then((res) => setChild(res.data.students[0] || null))
            .catch(() => setError("Could not load your child's profile."));

        api.get("/teacher/directory")
            .then((res) => setTeachers(res.data.teachers))
            .catch(() => setError("Could not load teachers."));

    }, []);


    // Load open slots when a teacher is picked

    function chooseTeacher(id) {

        setTeacherId(id);
        setSlot(null);

        setLoading(true);

        api.get(`/teacher/slots-public/${id}`)
            .then((res) => {
                setSlots(res.data.slots);
                setLoading(false);
            })

            .catch(() => {
                setError("Could not load slots.");
                setLoading(false);
            });

    }


    // Group the slots by date for the date tabs

    const dates = [];

    slots.forEach((s) => {

        if (!dates.includes(s.date)) {
            dates.push(s.date);
        }

    });

    const [activeDate, setActiveDate] = useState(null);

    const slotsForDate = activeDate
        ? slots.filter((s) => s.date === activeDate)
        : [];


    async function confirmBooking() {

        setLoading(true);
        setError("");

        try {

            await api.post("/parent/book", {
                parentId: user.parent_id,
                slotId: slot.id,
                rescheduleId: rescheduleId ? Number(rescheduleId) : null
            });

            setDone(true);

        }

        catch (err) {

            setError(getError(err));

        }

        finally {

            setLoading(false);

        }

    }


    // ---------- SUCCESS SCREEN ----------

    if (done) {

        return (

            <div className="page">

                <div className="success-box">

                    <h1>{rescheduleId ? "Appointment rescheduled!" : "Appointment booked!"}</h1>

                    <p>
                        {child ? child.name : "Your child"} will meet{" "}
                        <strong>{teacherObjName(teachers, teacherId)}</strong> on{" "}
                        <strong>{formatDate(slot.date)}</strong> at{" "}
                        <strong>{formatTime(slot.start_time)}</strong>.
                    </p>

                    <button
                        className="btn btn-primary"
                        onClick={() => window.location.assign("/parent/appointments")}
                    >
                        View my appointments
                    </button>

                </div>

            </div>

        );

    }


    // ---------- NO CHILD LINKED ----------

    if (!child) {

        return (

            <div className="page">

                <div className="page-head">
                    <h1>Book Appointment</h1>
                </div>

                <div className="empty">
                    <h3>No child linked to your account</h3>
                    <p>
                        Every parent account is permanently linked to one child.
                        If you have not registered your child yet, log out and
                        create an account selecting your child. Otherwise contact
                        the teacher.
                    </p>
                </div>

            </div>

        );

    }


    // ---------- WIZARD ----------

    return (

        <div className="page">

            <div className="page-head">
                <h1>Book Appointment</h1>
                <p>
                    Booking for <strong>{child.name}</strong> ({child.roll_no}) -
                    follow the steps, it takes less than a minute.
                </p>
            </div>


            {error && <div className="alert alert-error">{error}</div>}


            <div className="steps">

                <span className={step >= 1 ? "step active" : "step"}>1. Teacher</span>

                <span className={step >= 2 ? "step active" : "step"}>2. Time</span>

                <span className={step >= 3 ? "step active" : "step"}>3. Confirm</span>

            </div>


            {/* STEP 1 - TEACHER */}

            {step === 1 && (

                <div className="step-body">

                    <div className="card-grid">

                        {teachers.map((f) => (

                            <button
                                key={f.teacher_id}
                                className={"pick-card" + (teacherId === f.teacher_id ? " picked" : "")}
                                onClick={() => {
                                    chooseTeacher(f.teacher_id);
                                    setStep(2);
                                }}
                            >

                                <h3>{f.name}</h3>
                                <p className="muted">{f.department}</p>

                                <span className={`badge ${f.slot_count > 0 ? "badge-green" : "badge-grey"}`}>
                                    {f.slot_count > 0 ? `${f.slot_count} slots open` : "no slots"}
                                </span>

                            </button>

                        ))}

                    </div>

                </div>

            )}


            {/* STEP 2 - DATE + SLOT */}

            {step === 2 && (

                <div className="step-body">

                    {loading ? (
                        <p className="muted">Loading slots...</p>
                    ) : dates.length === 0 ? (

                        <div className="empty">
                            <h3>No open slots</h3>
                            <p>This teacher has no available PTM slots right now.</p>
                        </div>

                    ) : (

                        <>

                            <div className="date-tabs">

                                {dates.map((d) => (

                                    <button
                                        key={d}
                                        className={"date-tab" + (activeDate === d ? " active" : "")}
                                        onClick={() => setActiveDate(d)}
                                    >
                                        {formatDate(d)}
                                    </button>

                                ))}

                            </div>


                            <div className="slot-grid">

                                {slotsForDate.map((s) => (

                                    <button
                                        key={s.id}
                                        className={"slot-card" + (slot && slot.id === s.id ? " picked" : "")}
                                        onClick={() => setSlot(s)}
                                    >
                                        {formatTime(s.start_time)} - {formatTime(s.end_time)}
                                    </button>

                                ))}

                            </div>

                        </>

                    )}


                    <div className="btn-row">

                        <button className="btn btn-outline" onClick={() => setStep(1)}>
                            Back
                        </button>

                        <button
                            className="btn btn-primary"
                            disabled={!slot || !activeDate}
                            onClick={() => setStep(3)}
                        >
                            Next
                        </button>

                    </div>

                </div>

            )}


            {/* STEP 3 - CONFIRM */}

            {step === 3 && slot && (

                <div className="step-body">

                    <div className="confirm-card">

                        <h3>Check the details</h3>

                        <div className="info-rows">

                            <div className="info-row">
                                <span>Student</span>
                                <strong>{child.name} ({child.roll_no})</strong>
                            </div>

                            <div className="info-row">
                                <span>Teacher</span>
                                <strong>{teacherObjName(teachers, teacherId)}</strong>
                            </div>

                            <div className="info-row">
                                <span>Date</span>
                                <strong>{formatDate(slot.date)}</strong>
                            </div>

                            <div className="info-row">
                                <span>Time</span>
                                <strong>
                                    {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                                </strong>
                            </div>

                        </div>

                        <div className="btn-row">

                            <button className="btn btn-outline" onClick={() => setStep(2)}>
                                Back
                            </button>

                            <button
                                className="btn btn-primary"
                                disabled={loading}
                                onClick={confirmBooking}
                            >
                                {loading ? "Booking..." : "Confirm booking"}
                            </button>

                        </div>

                    </div>

                </div>

            )}

        </div>

    );


}


// ==========================================
// SMALL HELPERS
// ==========================================

function teacherObjName(teachers, id) {

    const f = teachers.find((x) => x.teacher_id === id);

    return f ? f.name : "";

}
