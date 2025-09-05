
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
  `created_at` timestamp DEFAULT (CURRENT_TIMESTAMP),
  `updated_at` timestamp DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP
) COMMENT = 'User accounts with VND balance management';

CREATE TABLE `students` (
  `student_id` varchar(20) PRIMARY KEY COMMENT 'Student ID (MSSV)',
  `full_name` varchar(100) NOT NULL,
  `tuition_amount` decimal(15,2) NOT NULL COMMENT 'Tuition fee amount in VND',
  `is_paid` boolean DEFAULT false COMMENT 'Payment status',
  `created_at` timestamp DEFAULT (CURRENT_TIMESTAMP),
  `updated_at` timestamp DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP
) COMMENT = 'Student records with tuition information';

CREATE TABLE `transactions` (
  `id` integer PRIMARY KEY AUTO_INCREMENT,
  `payer_id` integer NOT NULL,
  `student_id` varchar(20) NOT NULL,
  `amount` decimal(15,2) NOT NULL COMMENT 'Transaction amount in VND',
  `status` enum('pending', 'otp_sent', 'completed', 'failed') NOT NULL DEFAULT 'pending' COMMENT 'Transaction status flow',
  `created_at` timestamp DEFAULT (CURRENT_TIMESTAMP),
  `completed_at` timestamp,
  `updated_at` timestamp DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP
) COMMENT = 'Payment transactions with status tracking';

CREATE TABLE `otp_codes` (
  `id` integer PRIMARY KEY AUTO_INCREMENT,
  `transaction_id` integer NOT NULL,
  `otp_code` varchar(6) NOT NULL COMMENT '6-digit OTP code',
  `expires_at` timestamp NOT NULL COMMENT 'Expires after 5 minutes',
  `is_used` boolean DEFAULT false COMMENT 'Single-use prevention',
  `created_at` timestamp DEFAULT (CURRENT_TIMESTAMP),
  `updated_at` timestamp DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP
) COMMENT = 'OTP codes for transaction verification';

CREATE TABLE `transaction_history` (
  `id` integer PRIMARY KEY AUTO_INCREMENT,
  `user_id` integer NOT NULL,
  `transaction_id` integer NOT NULL,
  `balance_before` decimal(15,2) NOT NULL COMMENT 'Balance before transaction',
  `balance_after` decimal(15,2) NOT NULL COMMENT 'Balance after transaction',
  `created_at` timestamp DEFAULT (CURRENT_TIMESTAMP)
) COMMENT = 'Audit trail for balance changes';

CREATE TABLE `transaction_locks` (
  `id` integer PRIMARY KEY AUTO_INCREMENT,
  `resource_type` enum('user_account', 'student_tuition') NOT NULL COMMENT 'Type of resource being locked',
  `resource_id` varchar(50) NOT NULL COMMENT 'ID of the locked resource',
  `expires_at` timestamp NOT NULL COMMENT 'Auto-unlock after 5 minutes',
  `created_at` timestamp DEFAULT (CURRENT_TIMESTAMP)
) COMMENT = 'Resource locking to prevent concurrent payments';

CREATE INDEX `users_index_0` ON `users` (`username`);

CREATE INDEX `users_index_1` ON `users` (`email`);

CREATE INDEX `students_index_2` ON `students` (`student_id`);

CREATE INDEX `students_index_3` ON `students` (`is_paid`);

CREATE INDEX `transactions_index_4` ON `transactions` (`payer_id`);

CREATE INDEX `transactions_index_5` ON `transactions` (`student_id`);

CREATE INDEX `transactions_index_6` ON `transactions` (`status`);

CREATE INDEX `otp_codes_index_7` ON `otp_codes` (`transaction_id`);

CREATE INDEX `otp_codes_index_8` ON `otp_codes` (`expires_at`);

CREATE INDEX `transaction_history_index_9` ON `transaction_history` (`user_id`);

CREATE INDEX `transaction_history_index_10` ON `transaction_history` (`transaction_id`);

CREATE UNIQUE INDEX `transaction_locks_index_11` ON `transaction_locks` (`resource_type`, `resource_id`);

CREATE INDEX `transaction_locks_index_12` ON `transaction_locks` (`expires_at`);

ALTER TABLE `transaction_locks` COMMENT = 'Xử lý conflict cho MSSV để tránh thanh toán trùng lặp';

ALTER TABLE `transactions` ADD FOREIGN KEY (`payer_id`) REFERENCES `users` (`id`);

ALTER TABLE `transactions` ADD FOREIGN KEY (`student_id`) REFERENCES `students` (`student_id`);

ALTER TABLE `otp_codes` ADD FOREIGN KEY (`transaction_id`) REFERENCES `transactions` (`id`);

ALTER TABLE `transaction_history` ADD FOREIGN KEY (`transaction_id`) REFERENCES `transactions` (`id`);

ALTER TABLE `transaction_history` ADD FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

-- =============================================
-- TEST DATA INSERTION
-- =============================================

-- Insert test user (password: "123456" hashed with bcrypt)
INSERT INTO `users` (`username`, `password`, `full_name`, `phone`, `email`, `balance`) VALUES 
('cuongcfvipss4', '$2b$10$rOZOx4tVJ7nNa9hZ8IwKJeF3xqF1oVW3KnH/7V7fJ8YgbF1dY9Y2y', 'Cuong Ma', '0901234567', 'cuongcfvipss4@gmail.com', 50000000.00);
('mqcuong1603', '$2b$10$rOZOx4tVJ7nNa9hZ8IwKJeF3xqF1oVW3KnH/7V7fJ8YgbF1dY9Y2y', 'William Ma', '0901234567', 'mqcuong1603@gmail.com', 50000000.00);

-- Insert test students with different tuition amounts
INSERT INTO `students` (`student_id`, `full_name`, `tuition_amount`, `is_paid`) VALUES 
('522i0001', 'Tran Van B', 20000000.00, false),
('522i0002', 'Le Thi C', 15000000.00, false),
('522i0003', 'Pham Minh D', 18000000.00, false),
('522i0004', 'Hoang Van E', 22000000.00, false),
('522i0005', 'Vo Thi F', 17000000.00, false);