CREATE DATABASE IF NOT EXISTS qingban_demo DEFAULT CHARACTER SET utf8mb4;
USE qingban_demo;

CREATE TABLE IF NOT EXISTS patients (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  phone VARCHAR(20) NOT NULL UNIQUE,
  role ENUM('patient','doctor','admin') NOT NULL DEFAULT 'patient',
  real_name VARCHAR(50),
  nickname VARCHAR(50),
  height_cm DECIMAL(5,2),
  initial_weight_kg DECIMAL(6,2),
  current_weight_kg DECIMAL(6,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS checkins (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  patient_id BIGINT NOT NULL,
  checkin_date DATE NOT NULL,
  weight_kg DECIMAL(6,2),
  sport_minutes INT DEFAULT 0,
  content VARCHAR(500),
  points_earned INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_checkins_patient FOREIGN KEY (patient_id) REFERENCES patients(id)
);

CREATE TABLE IF NOT EXISTS word_library (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  category ENUM('sensitive','illegal') NOT NULL,
  word VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO patients (phone, role, real_name, nickname, height_cm, initial_weight_kg, current_weight_kg)
VALUES
('13800000000', 'doctor', '徐医生', '徐医生', NULL, NULL, NULL),
('13900000000', 'admin', '平台管理员', '总控管理员', NULL, NULL, NULL),
('13700000001', 'patient', '王建国', '自律的胖虎', 178, 85.0, 79.8)
ON DUPLICATE KEY UPDATE phone=VALUES(phone);

INSERT INTO word_library(category, word)
VALUES
('sensitive','减肥药'),('sensitive','代餐'),('illegal','加微信'),('illegal','刷单')
ON DUPLICATE KEY UPDATE word=VALUES(word);
