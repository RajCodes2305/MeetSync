import { useEffect, useState } from "react";

import api, { getUser } from "../../api";


// ==========================================
// MY STUDENT (parent)
// Shows the child permanently linked
// to this parent account.
// ==========================================

export default function ParentStudents() {

    const user = getUser();

    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");


    useEffect(() => {

        api.get(`/parent/students/${user.parent_id}`)
            .then((res) => {
                setStudents(res.data.students);
                setLoading(false);
            })

            .catch(() => {
                setError("Could not load students.");
                setLoading(false);
            });

    }, []);


    if (loading) {
        return <div className="page"><p className="muted">Loading...</p></div>;
    }


    return (

        <div className="page">

            <div className="page-head">
                <h1>My Student</h1>
                <p>Your child - permanently linked to this account.</p>
            </div>


            {error && <div className="alert alert-error">{error}</div>}


            {students.length === 0 ? (

                <div className="empty">
                    <h3>No child linked yet</h3>
                    <p>
                        A parent account is linked to exactly one child.
                        If you just registered, the teacher may still need
                        to add your child to the system.
                    </p>
                </div>

            ) : (

                <div className="card-grid">

                    {students.map((s) => (

                        <div key={s.id} className="info-card">

                            <h3>{s.name}</h3>

                            <div className="info-rows">

                                <div className="info-row">
                                    <span>Roll number</span>
                                    <strong>{s.roll_no}</strong>
                                </div>

                                <div className="info-row">
                                    <span>Department</span>
                                    <strong>{s.department}</strong>
                                </div>

                                <div className="info-row">
                                    <span>Year</span>
                                    <strong>{s.year}</strong>
                                </div>

                                <div className="info-row">
                                    <span>Section</span>
                                    <strong>{s.section}</strong>
                                </div>

                            </div>

                        </div>

                    ))}

                </div>

            )}

        </div>

    );

}
