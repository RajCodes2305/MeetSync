import axios from "axios";


// ==========================================
// AXIOS INSTANCE
// All API calls go through this. The /api
// prefix is proxied to the Express backend.
// ==========================================

const api = axios.create({
    baseURL: "/api",
});


export default api;


// ==========================================
// LOGGED-IN USER (saved in localStorage)
// ==========================================

export function getUser() {

    try {

        return JSON.parse(
            localStorage.getItem("meetsync_user")
        );

    }

    catch {

        return null;

    }

}


export function saveUser(user) {

    localStorage.setItem(
        "meetsync_user",
        JSON.stringify(user)
    );

}


export function clearUser() {

    localStorage.removeItem("meetsync_user");

}


// ==========================================
// FRIENDLY ERROR MESSAGE
// ==========================================

export function getError(error) {

    return (
        error?.response?.data?.message ||
        "Something went wrong. Please try again."
    );

}


// ==========================================
// DATE / TIME FORMATTING
// "2026-09-21"  -> "Mon, 21 Sep 2026"
// "10:30:00"    -> "10:30 AM"
// ==========================================

export function formatDate(dateStr) {

    if (!dateStr) return "";

    const d = new Date(dateStr + "T00:00:00");

    return d.toLocaleDateString("en-GB", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric"
    });

}


export function formatTime(timeStr) {

    if (!timeStr) return "";

    const [h, m] = timeStr.split(":").map(Number);

    const ampm = h >= 12 ? "PM" : "AM";

    const hour12 = h % 12 === 0 ? 12 : h % 12;

    return `${hour12}:${String(m).padStart(2, "0")} ${ampm}`;

}
