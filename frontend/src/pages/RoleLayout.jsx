import { NavLink, Outlet, useNavigate } from "react-router-dom";

import { getUser, clearUser } from "../api";


// ==========================================
// SHARED DASHBOARD LAYOUT
// Sidebar on the left, page content on the
// right. Every role passes its own links.
// ==========================================

export default function RoleLayout({ role, links }) {

    const user = getUser();

    const navigate = useNavigate();


    function handleLogout() {

        clearUser();

        navigate("/login");

    }


    return (

        <div className="app-shell">

            <aside className="sidebar">

                <div className="sidebar-brand">
                    Meet<span>Sync</span>
                </div>

                <div className="sidebar-role">{role} portal</div>

                <nav className="sidebar-nav">

                    {links.map((link) => (

                        <NavLink
                            key={link.to}
                            to={link.to}
                            end={link.end}
                            className={({ isActive }) =>
                                "sidebar-link" + (isActive ? " active" : "")
                            }
                        >
                            {link.label}
                        </NavLink>

                    ))}

                </nav>

                <button className="sidebar-logout" onClick={handleLogout}>
                    Logout
                </button>

            </aside>

            <main className="main">

                <header className="topbar">

                    <div>
                        <h2>Welcome, {user ? user.name : ""}</h2>
                        <p className="topbar-sub">
                            {user ? user.email : ""}
                        </p>
                    </div>

                    <span className={`role-chip role-${user ? user.role : ""}`}>
                        {user ? user.role.toUpperCase() : ""}
                    </span>

                </header>

                <div className="content">
                    <Outlet />
                </div>

            </main>

        </div>

    );

}
