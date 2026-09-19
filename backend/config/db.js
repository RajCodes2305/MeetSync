const mysql = require("mysql2/promise");
require("dotenv").config();

// Create MySQL connection pool
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,

    // Aiven requires SSL
    ssl: {
        rejectUnauthorized: false
    },

    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,

    // Return dates as "2026-09-15" strings
    // instead of JS Date objects
    dateStrings: true
});

module.exports = pool;