import { Link } from "react-router-dom";


// ==========================================
// PRIVACY POLICY (public, plain language)
// ==========================================

export default function Privacy() {

    return (

        <div className="privacy-page">

            <div className="privacy-card">

                <Link to="/" className="auth-brand">
                    Meet<span>Sync</span>
                </Link>

                <h1>Privacy Policy</h1>

                <p className="auth-sub">
                    Short version: the college only stores what it needs to
                    schedule your meeting, and only the right people can see it.
                </p>


                <h3>What we store</h3>

                <p>
                    Your name, email, phone number (if given) and password.
                    For students: roll number, name, department, year and
                    section. For meetings: the date, time slot and any remarks
                    the teacher writes.
                </p>


                <h3>Who can see what</h3>

                <p>
                    A parent sees only their own child's details and their own
                    appointments. A teacher sees the students and parents of
                    the meetings they manage. Nobody else can see your data.
                </p>


                <h3>Your child is linked to your account only</h3>

                <p>
                    One parent account is permanently linked to exactly one
                    student. That link is created when the account is made and
                    cannot be changed from inside the app.
                </p>


                <h3>Meeting remarks</h3>

                <p>
                    Remarks written by the teacher after a meeting are private
                    notes for the teacher. Parents cannot read them.
                </p>


                <h3>Data removal</h3>

                <p>
                    To delete your account or your child's data, contact the
                    teacher who manages the portal. Deleting a parent account
                    removes their bookings and frees the child slot.
                </p>


                <div className="btn-row">

                    <Link to="/" className="btn btn-outline">
                        Back to home
                    </Link>

                </div>

            </div>

        </div>

    );

}
