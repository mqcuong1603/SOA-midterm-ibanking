CREATE TABLE `users` (
  `id` integer PRIMARY KEY AUTO_INCREMENT,
  `username` varchar(50) UNIQUE NOT NULL,
  `password` varchar(255) NOT NULL,
  `full_name` varchar(100) NOT NULL,
  `phone` varchar(20) NOT NULL,
  `email` varchar(100) UNIQUE NOT NULL,
  `balance` decimal(15,2) DEFAULT 0 COMMENT 'Số dư khả dụng (VND)',
  `created_at` timestamp DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE `students` (
  `student_id` varchar(20) PRIMARY KEY COMMENT 'MSSV',
  `full_name` varchar(100) NOT NULL,
  `tuition_amount` decimal(15,2) NOT NULL COMMENT 'Số tiền học phí',
  `is_paid` boolean DEFAULT false COMMENT 'Trạng thái đóng học phí'
);

CREATE TABLE `transactions` (
  `id` integer PRIMARY KEY AUTO_INCREMENT,
  `payer_id` integer NOT NULL,
  `student_id` varchar(20) NOT NULL,
  `amount` decimal(15,2) NOT NULL,
  `status` enum NOT NULL DEFAULT 'pending' COMMENT 'pending, otp_sent, completed, failed',
  `created_at` timestamp DEFAULT (CURRENT_TIMESTAMP),
  `completed_at` timestamp
);

CREATE TABLE `otp_codes` (
  `id` integer PRIMARY KEY AUTO_INCREMENT,
  `transaction_id` integer UNIQUE NOT NULL,
  `otp_code` varchar(6) NOT NULL,
  `expires_at` timestamp NOT NULL COMMENT 'Hết hạn sau 5 phút',
  `is_used` boolean DEFAULT false
);

CREATE TABLE `transaction_history` (
  `id` integer PRIMARY KEY AUTO_INCREMENT,
  `user_id` integer NOT NULL,
  `transaction_id` integer NOT NULL,
  `balance_before` decimal(15,2) NOT NULL,
  `balance_after` decimal(15,2) NOT NULL,
  `created_at` timestamp DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE `transaction_locks` (
  `id` integer PRIMARY KEY AUTO_INCREMENT,
  `resource_type` enum NOT NULL COMMENT 'student_tuition',
  `resource_id` varchar(50) NOT NULL COMMENT 'Student ID to lock',
  `expires_at` timestamp NOT NULL COMMENT 'Tự động mở khóa sau 10 phút'
);

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
