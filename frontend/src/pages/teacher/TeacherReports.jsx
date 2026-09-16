import { useEffect, useState } from "react";

import api from "../../api";


// ==========================================
// REPORTS (teacher)
// Simple statistics: totals by status
// ==========================================

export default function TeacherReports() {

    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");


    useEffect(() => {

        api.get("/teacher/stats")
            .then((res) => {
                setStats(res.data);
                setLoading(false);
            })

            .catch(() => {
                setError("Could not load statistics.");
                setLoading(false);
            });

    }, []);


    if (loading) {
        return <div className="page"><p className="muted">Loading...</p></div>;
    }


    return (

        <div className="page">

            <div className="page-head">
                <h1>Reports</h1>
                <p>Appointment statistics.</p>
            </div>


            {error && <div className="alert alert-error">{error}</div>}


            {stats && (

                <>

                    {/* HEADLINE NUMBERS */}

                    <div className="card-grid">

                        <div className="stat-box">
                            <h2>{stats.statusCounts.total}</h2>
                            <p>Total appointments</p>
                        </div>

                        <div className="stat-box">
                            <h2>{stats.statusCounts.booked}</h2>
                            <p>Upcoming (booked)</p>
                        </div>

                        <div className="stat-box">
                            <h2>{stats.statusCounts.completed}</h2>
                            <p>Completed</p>
                        </div>

                        <div className="stat-box">
                            <h2>{stats.statusCounts.cancelled}</h2>
                            <p>Cancelled</p>
                        </div>

                    </div>


                    <div className="card-grid">

                        <div className="stat-box">
                            <h2>{stats.counts.students}</h2>
                            <p>Students</p>
                        </div>

                        <div className="stat-box">
                            <h2>{stats.counts.parents}</h2>
                            <p>Parent accounts</p>
                        </div>

                        <div className="stat-box">
                            <h2>{stats.counts.events}</h2>
                            <p>PTM events</p>
                        </div>

                        <div className="stat-box">
                            <h2>{stats.counts.events ? "Yes" : "No"}</h2>
                            <p>Active PTM running</p>
                        </div>

                    </div>

                </>

            )}

        </div>

    );

}
