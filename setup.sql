-- =========================================================
-- MEETSYNC - one-time MySQL setup (run as root)
-- In MySQL terminal:  SOURCE setup.sql
-- =========================================================

CREATE DATABASE IF NOT EXISTS meetsync
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

-- The user the Django app logs in as.
-- CHANGE 'meetsync123' to any password you like,
-- then put the same password in the .env file.
CREATE USER IF NOT EXISTS 'meetsync'@'localhost' IDENTIFIED BY 'meetsync123';
ALTER USER 'meetsync'@'localhost' IDENTIFIED BY 'meetsync123';

-- Rights for the app database
GRANT ALL PRIVILEGES ON meetsync.* TO 'meetsync'@'localhost';
-- Rights for the test database Django creates when running tests
GRANT ALL PRIVILEGES ON `test_meetsync`.* TO 'meetsync'@'localhost';
FLUSH PRIVILEGES;
