-- =========================================================
-- MEETSYNC
-- Parent-Teacher Meeting Appointment Portal
-- Database schema + demo data
--
-- HOW TO USE:
--   Open phpMyAdmin -> Import -> choose this file -> Go
--   (or in MySQL terminal: SOURCE backend/database.sql)
-- =========================================================

DROP DATABASE IF EXISTS meetsync;

CREATE DATABASE IF NOT EXISTS meetsync
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE meetsync;


-- =========================================================
-- 1. USERS (one table for parents and teachers)
-- =========================================================

CREATE TABLE users (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    email       VARCHAR(150) NOT NULL UNIQUE,
    password    VARCHAR(150) NOT NULL,
    role        ENUM('parent', 'teacher') NOT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- =========================================================
-- 2. STUDENTS (academic info, managed by the teacher)
-- =========================================================

CREATE TABLE students (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    roll_no     VARCHAR(30) NOT NULL UNIQUE,
    name        VARCHAR(100) NOT NULL,
    department  VARCHAR(80) NOT NULL,
    year        ENUM('1','2','3','4') NOT NULL,
    section     VARCHAR(5) NOT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- =========================================================
-- 3. PARENT PROFILES (extends users)
-- =========================================================

CREATE TABLE parents (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    user_id     INT NOT NULL UNIQUE,
    phone       VARCHAR(20),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);


-- =========================================================
-- 4. TEACHER PROFILES (extends users)
-- =========================================================

CREATE TABLE teachers (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    user_id     INT NOT NULL UNIQUE,
    employee_id VARCHAR(30) NOT NULL UNIQUE,
    department  VARCHAR(80) NOT NULL,
    designation VARCHAR(60),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);


-- =========================================================
-- 5. PARENT-STUDENT LINK
-- (teacher connects a parent account to their child)
-- =========================================================

CREATE TABLE parent_students (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    parent_id   INT NOT NULL,
    student_id  INT NOT NULL,
    UNIQUE KEY unique_link (parent_id, student_id),
    FOREIGN KEY (parent_id) REFERENCES parents(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);


-- =========================================================
-- 6. PTM EVENTS (teacher creates these)
-- =========================================================

CREATE TABLE ptm_events (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    title               VARCHAR(150) NOT NULL,
    venue               VARCHAR(150) NOT NULL,
    start_date          DATE NOT NULL,
    end_date            DATE NOT NULL,
    start_time          TIME NOT NULL,
    end_time            TIME NOT NULL,
    slot_duration       INT NOT NULL DEFAULT 15,
    status              ENUM('draft', 'active', 'closed') DEFAULT 'draft',
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- =========================================================
-- 7. SLOTS (teacher makes these available for booking)
--    status: available / booked / blocked
-- =========================================================

CREATE TABLE slots (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    teacher_id  INT NOT NULL,
    event_id    INT NOT NULL,
    date        DATE NOT NULL,
    start_time  TIME NOT NULL,
    end_time    TIME NOT NULL,
    status      ENUM('available', 'booked', 'blocked') DEFAULT 'available',
    UNIQUE KEY unique_slot (teacher_id, event_id, date, start_time),
    FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE,
    FOREIGN KEY (event_id) REFERENCES ptm_events(id) ON DELETE CASCADE
);


-- =========================================================
-- 8. APPOINTMENTS (a parent books one slot)
--    status: booked / completed / cancelled
-- =========================================================

CREATE TABLE appointments (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    slot_id         INT NOT NULL UNIQUE,
    parent_id       INT NOT NULL,
    student_id      INT NOT NULL,
    event_id        INT NOT NULL,
    status          ENUM('booked', 'completed', 'cancelled') DEFAULT 'booked',
    remarks         TEXT,
    cancel_reason   VARCHAR(255),
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (slot_id) REFERENCES slots(id),
    FOREIGN KEY (parent_id) REFERENCES parents(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id),
    FOREIGN KEY (event_id) REFERENCES ptm_events(id)
);


-- =========================================================
-- 9. DEMO DATA
-- 1 teacher, 10 students, 10 parents.
-- Each parent is locked to exactly one child.
-- seed.js adds a few sample appointments.
-- =========================================================

-- Teacher
INSERT INTO users (name, email, password, role) VALUES
('Dr. Anil Kumar', 'anil@meetsync.com', 'teacher123', 'teacher');

INSERT INTO teachers (user_id, employee_id, department, designation) VALUES
(1, 'FAC001', 'Computer Science', 'Class Teacher - CS A');

-- Students
INSERT INTO students (roll_no, name, department, year, section) VALUES
('CS2101', 'Arjun Menon', 'Computer Science', '3', 'A'),
('CS2102', 'Divya Krishnan', 'Computer Science', '3', 'A'),
('CS2103', 'Ravi Verma', 'Computer Science', '3', 'A'),
('CS2104', 'Sneha Reddy', 'Computer Science', '3', 'A'),
('CS2105', 'Karthik Pillai', 'Computer Science', '3', 'A'),
('CS2106', 'Ananya Iyer', 'Computer Science', '3', 'A'),
('CS2107', 'Vikram Rao', 'Computer Science', '3', 'A'),
('CS2108', 'Pooja Sharma', 'Computer Science', '3', 'A'),
('CS2109', 'Aditya Nair', 'Computer Science', '3', 'A'),
('CS2110', 'Ishita Bose', 'Computer Science', '3', 'A');

-- Parents (parent N owns student N)
INSERT INTO users (name, email, password, role) VALUES
('Parent of Arjun', 'parent1@meetsync.com', 'parent123', 'parent'),
('Parent of Divya', 'parent2@meetsync.com', 'parent123', 'parent'),
('Parent of Ravi', 'parent3@meetsync.com', 'parent123', 'parent'),
('Parent of Sneha', 'parent4@meetsync.com', 'parent123', 'parent'),
('Parent of Karthik', 'parent5@meetsync.com', 'parent123', 'parent'),
('Parent of Ananya', 'parent6@meetsync.com', 'parent123', 'parent'),
('Parent of Vikram', 'parent7@meetsync.com', 'parent123', 'parent'),
('Parent of Pooja', 'parent8@meetsync.com', 'parent123', 'parent'),
('Parent of Aditya', 'parent9@meetsync.com', 'parent123', 'parent'),
('Parent of Ishita', 'parent10@meetsync.com', 'parent123', 'parent');

INSERT INTO parents (user_id, phone) VALUES
(2, '9876500001'),
(3, '9876500002'),
(4, '9876500003'),
(5, '9876500004'),
(6, '9876500005'),
(7, '9876500006'),
(8, '9876500007'),
(9, '9876500008'),
(10, '9876500009'),
(11, '9876500010');

-- Lock each child to their parent (1:1)
INSERT INTO parent_students (parent_id, student_id) VALUES
(1, 1), (2, 2), (3, 3), (4, 4), (5, 5),
(6, 6), (7, 7), (8, 8), (9, 9), (10, 10);

-- One active PTM event (next Monday to Friday)
INSERT INTO ptm_events
    (title, venue, start_date, end_date, start_time, end_time, slot_duration, status)
VALUES
    (
        'Semester PTM - odd sem',
        'Main Block, Seminar Hall 1',
        DATE_ADD(CURDATE(), INTERVAL 2 - WEEKDAY(CURDATE()) DAY),
        DATE_ADD(CURDATE(), INTERVAL 6 - WEEKDAY(CURDATE()) DAY),
        '10:00:00', '12:00:00', 30, 'active'
    );

-- Availability for the teacher on the first two days
-- (4 slots x 2 days = 8 slots for the seed to book into)
INSERT INTO slots (teacher_id, event_id, date, start_time, end_time)
SELECT t.id, e.id,
       e.start_date,
       ADDTIME('10:00:00', SEC_TO_TIME((n - 1) * 1800)),
       ADDTIME('10:30:00', SEC_TO_TIME((n - 1) * 1800))
FROM teachers t
JOIN ptm_events e ON e.status = 'active'
JOIN (
    SELECT 1 AS n UNION SELECT 2 UNION SELECT 3 UNION SELECT 4
) nums
WHERE (n - 1) * 30 + 30 <= TIME_TO_SEC(TIMEDIFF(e.end_time, e.start_time)) / 60;

INSERT INTO slots (teacher_id, event_id, date, start_time, end_time)
SELECT t.id, e.id,
       DATE_ADD(e.start_date, INTERVAL 1 DAY),
       ADDTIME('10:00:00', SEC_TO_TIME((n - 1) * 1800)),
       ADDTIME('10:30:00', SEC_TO_TIME((n - 1) * 1800))
FROM teachers t
JOIN ptm_events e ON e.status = 'active'
JOIN (
    SELECT 1 AS n UNION SELECT 2 UNION SELECT 3 UNION SELECT 4
) nums
WHERE (n - 1) * 30 + 30 <= TIME_TO_SEC(TIMEDIFF(e.end_time, e.start_time)) / 60;
