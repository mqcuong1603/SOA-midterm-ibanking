-- =============================================
-- DROP EXISTING TABLES (if needed for fresh start)
-- =============================================

DROP TABLE IF EXISTS `transaction_locks`;
DROP TABLE IF EXISTS `transaction_history`;
DROP TABLE IF EXISTS `otp_codes`;
DROP TABLE IF EXISTS `transactions`;
DROP TABLE IF EXISTS `student_tuition`;
DROP TABLE IF EXISTS `students`;
DROP TABLE IF EXISTS `users`;

-- =============================================
-- TABLE DEFINITIONS
-- =============================================

CREATE TABLE `users` (
  `id` integer PRIMARY KEY AUTO_INCREMENT,
  `username` varchar(50) UNIQUE NOT NULL,
  `password` varchar(255) NOT NULL COMMENT 'Bcrypt hashed password',
  `full_name` varchar(100) NOT NULL,
  `phone` varchar(20) NOT NULL,
  `email` varchar(100) UNIQUE NOT NULL,
  `balance` decimal(15,2) DEFAULT 0 COMMENT 'Available balance in VND',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) COMMENT = 'User accounts with VND balance management';

CREATE TABLE `students` (
  `student_id` varchar(20) PRIMARY KEY COMMENT 'Student ID (MSSV)',
  `full_name` varchar(100) NOT NULL,
  `major` varchar(100) COMMENT 'Student major/program',
  `enrollment_year` integer COMMENT 'Year student enrolled',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) COMMENT = 'Student records with basic information';

CREATE TABLE `student_tuition` (
  `id` integer PRIMARY KEY AUTO_INCREMENT,
  `student_id` varchar(20) NOT NULL,
  `semester` varchar(20) NOT NULL COMMENT 'e.g., "2024-1", "2024-2", "2024-Summer"',
  `academic_year` varchar(10) NOT NULL COMMENT 'e.g., "2024-2025"',
  `tuition_amount` decimal(15,2) NOT NULL COMMENT 'Tuition fee for this semester in VND',
  `is_paid` boolean DEFAULT false COMMENT 'Payment status for this semester',
  `paid_at` timestamp NULL COMMENT 'When the tuition was paid',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`student_id`) REFERENCES `students` (`student_id`)
) COMMENT = 'Semester-specific tuition records for each student';

CREATE TABLE `transactions` (
  `id` integer PRIMARY KEY AUTO_INCREMENT,
  `payer_id` integer NOT NULL,
  `student_id` varchar(20) NOT NULL,
  `tuition_id` integer NOT NULL COMMENT 'References student_tuition.id',
  `amount` decimal(15,2) NOT NULL COMMENT 'Transaction amount in VND',
  `status` enum('pending', 'otp_sent', 'completed', 'failed') NOT NULL DEFAULT 'pending' COMMENT 'Transaction status flow',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `completed_at` timestamp NULL,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`payer_id`) REFERENCES `users` (`id`),
  FOREIGN KEY (`student_id`) REFERENCES `students` (`student_id`),
  FOREIGN KEY (`tuition_id`) REFERENCES `student_tuition` (`id`)
) COMMENT = 'Payment transactions with status tracking';

CREATE TABLE `otp_codes` (
  `id` integer PRIMARY KEY AUTO_INCREMENT,
  `transaction_id` integer NOT NULL,
  `otp_code` varchar(6) NOT NULL COMMENT '6-digit OTP code',
  `expires_at` timestamp NOT NULL COMMENT 'Expires after 5 minutes',
  `is_used` boolean DEFAULT false COMMENT 'Single-use prevention',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`transaction_id`) REFERENCES `transactions` (`id`)
) COMMENT = 'OTP codes for transaction verification';

CREATE TABLE `transaction_history` (
  `id` integer PRIMARY KEY AUTO_INCREMENT,
  `user_id` integer NOT NULL,
  `transaction_id` integer NOT NULL,
  `balance_before` decimal(15,2) NOT NULL COMMENT 'Balance before transaction',
  `balance_after` decimal(15,2) NOT NULL COMMENT 'Balance after transaction',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  FOREIGN KEY (`transaction_id`) REFERENCES `transactions` (`id`)
) COMMENT = 'Audit trail for balance changes';

CREATE TABLE `transaction_locks` (
  `id` integer PRIMARY KEY AUTO_INCREMENT,
  `resource_type` enum('user_account', 'student_tuition', 'semester_tuition') NOT NULL COMMENT 'Type of resource being locked',
  `resource_id` varchar(50) NOT NULL COMMENT 'ID of the locked resource',
  `expires_at` timestamp NOT NULL COMMENT 'Auto-unlock after 5 minutes',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP
) COMMENT = 'Resource locking to prevent concurrent payments';

-- =============================================
-- INDEXES
-- =============================================

-- Users indexes
CREATE INDEX `idx_users_username` ON `users` (`username`);
CREATE INDEX `idx_users_email` ON `users` (`email`);

-- Students indexes
CREATE INDEX `idx_students_student_id` ON `students` (`student_id`);

-- Student tuition indexes
CREATE INDEX `idx_student_tuition_student_id` ON `student_tuition` (`student_id`);
CREATE INDEX `idx_student_tuition_semester` ON `student_tuition` (`semester`);
CREATE INDEX `idx_student_tuition_is_paid` ON `student_tuition` (`is_paid`);
CREATE UNIQUE INDEX `idx_student_tuition_unique` ON `student_tuition` (`student_id`, `semester`, `academic_year`);

-- Transactions indexes
CREATE INDEX `idx_transactions_payer_id` ON `transactions` (`payer_id`);
CREATE INDEX `idx_transactions_student_id` ON `transactions` (`student_id`);
CREATE INDEX `idx_transactions_tuition_id` ON `transactions` (`tuition_id`);
CREATE INDEX `idx_transactions_status` ON `transactions` (`status`);

-- OTP codes indexes
CREATE INDEX `idx_otp_codes_transaction_id` ON `otp_codes` (`transaction_id`);
CREATE INDEX `idx_otp_codes_expires_at` ON `otp_codes` (`expires_at`);

-- Transaction history indexes
CREATE INDEX `idx_transaction_history_user_id` ON `transaction_history` (`user_id`);
CREATE INDEX `idx_transaction_history_transaction_id` ON `transaction_history` (`transaction_id`);

-- Transaction locks indexes
CREATE UNIQUE INDEX `idx_transaction_locks_resource` ON `transaction_locks` (`resource_type`, `resource_id`);
CREATE INDEX `idx_transaction_locks_expires_at` ON `transaction_locks` (`expires_at`);

-- =============================================
-- TEST DATA INSERTION
-- =============================================

-- Insert test users (password: "123456" hashed with bcrypt)
INSERT INTO `users` (`username`, `password`, `full_name`, `phone`, `email`, `balance`) VALUES 
('cuongcfvipss5', '$2a$10$1gIvd4Hq2tUq8HqbqHZgI.Hc7jRUymaVsgilasFkmTdJkiGsWBqcW', 'Cuong Ma', '0901234567', 'cuongcfvipss5@gmail.com', 50000000.00),
('mqcuong1603', '$2a$10$1gIvd4Hq2tUq8HqbqHZgI.Hc7jRUymaVsgilasFkmTdJkiGsWBqcW', 'William Ma', '0901234568', 'mqcuong1603@gmail.com', 50000000.00);

-- Insert test students (without tuition info - now in separate table)
INSERT INTO `students` (`student_id`, `full_name`, `major`, `enrollment_year`) VALUES 
('522i0001', 'Tran Van B', 'Computer Science', 2022),
('522i0002', 'Le Thi C', 'Information Technology', 2022),
('522i0003', 'Pham Minh D', 'Software Engineering', 2022),
('522i0004', 'Hoang Van E', 'Business Administration', 2022),
('522i0005', 'Vo Thi F', 'Data Science', 2022);

-- Insert semester tuition records
INSERT INTO `student_tuition` (`student_id`, `semester`, `academic_year`, `tuition_amount`, `is_paid`) VALUES 
-- Student 522i0001 - 3 semesters
('522i0001', '2024-1', '2024-2025', 20000000.00, false),
('522i0001', '2024-2', '2024-2025', 20000000.00, false),
('522i0001', '2025-1', '2024-2025', 20000000.00, false),

-- Student 522i0002 - 2 semesters (one already paid)
('522i0002', '2024-1', '2024-2025', 15000000.00, true),
('522i0002', '2024-2', '2024-2025', 15000000.00, false),

-- Student 522i0003 - 2 semesters
('522i0003', '2024-1', '2024-2025', 18000000.00, false),
('522i0003', '2024-2', '2024-2025', 18000000.00, false),

-- Student 522i0004 - 2 semesters
('522i0004', '2024-1', '2024-2025', 22000000.00, false),
('522i0004', '2024-2', '2024-2025', 22000000.00, false),

-- Student 522i0005 - 2 semesters
('522i0005', '2024-1', '2024-2025', 17000000.00, false),
('522i0005', '2024-2', '2024-2025', 17000000.00, false);

-- =============================================
-- USEFUL QUERIES
-- =============================================

-- Get all unpaid tuition for a specific student
-- SELECT st.*, s.full_name 
-- FROM student_tuition st
-- JOIN students s ON st.student_id = s.student_id
-- WHERE st.student_id = '522i0001' AND st.is_paid = false
-- ORDER BY st.semester;

-- Get all students with unpaid tuition
-- SELECT s.student_id, s.full_name, COUNT(*) as unpaid_semesters, SUM(st.tuition_amount) as total_unpaid
-- FROM students s
-- JOIN student_tuition st ON s.student_id = st.student_id
-- WHERE st.is_paid = false
-- GROUP BY s.student_id, s.full_name;

-- Get payment history for a user
-- SELECT t.*, s.full_name as student_name, st.semester, st.academic_year
-- FROM transactions t
-- JOIN students s ON t.student_id = s.student_id
-- JOIN student_tuition st ON t.tuition_id = st.id
-- WHERE t.payer_id = 1
-- ORDER BY t.created_at DESC;