import { Link } from "react-router-dom";


// ==========================================
// LANDING PAGE (public)
// ==========================================

export default function HomePage() {

    return (

        <div className="landing">

            <nav className="landing-nav">

                <div className="landing-brand">
                    Meet<span>Sync</span>
                </div>

                <div className="landing-links">

                    <Link to="/login" className="btn btn-outline">Login</Link>

                    <Link to="/register" className="btn btn-primary">Register</Link>

                </div>

            </nav>

            <section className="landing-hero">

                <h1>
                    Parent-Teacher Meetings,
                    <br />
                    <span>made simple.</span>
                </h1>

                <p>
                    MeetSync lets parents book meeting slots with teachers online.
                    No queues, no paper slips, no confusion - just pick a date,
                    pick a time and show up.
                </p>

                <div className="landing-actions">

                    <Link to="/register" className="btn btn-primary btn-lg">
                        Book your slot
                    </Link>

                    <Link to="/login" className="btn btn-outline btn-lg">
                        I already have an account
                    </Link>

                </div>

            </section>

            <section className="landing-features">

                <div className="feature-card">

                    <h3>For Parents</h3>
                    <p>
                        See your child's details, browse teachers,
                        and book a time that suits you.
                    </p>

                </div>

                <div className="feature-card">

                    <h3>For Teachers</h3>
                    <p>
                        Create PTM events, open your availability,
                        manage students and see who is coming.
                    </p>

                </div>

            </section>

            <footer className="landing-footer">
                <span>MeetSync - College PTM Appointment Portal</span>
                <Link to="/privacy" className="privacy-pill">Privacy Policy</Link>
            </footer>

        </div>

    );

}
