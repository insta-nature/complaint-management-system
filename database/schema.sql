-- =========================================================
-- ResolveDesk — Complaint Management System
-- MySQL Schema + Seed Data
-- =========================================================

CREATE DATABASE IF NOT EXISTS cms_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE cms_db;

-- ---------------------------------------------------------
-- employees
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS employees (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  mobile VARCHAR(15) NOT NULL,
  email VARCHAR(120) DEFAULT NULL,
  department VARCHAR(80) NOT NULL,
  designation VARCHAR(100) NOT NULL,
  address VARCHAR(255) DEFAULT NULL,
  status ENUM('Active','Inactive') NOT NULL DEFAULT 'Active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- users (login accounts for admin & employee roles)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(60) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin','employee') NOT NULL,
  employee_id INT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- complaints
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS complaints (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  mobile VARCHAR(15) NOT NULL,
  email VARCHAR(120) DEFAULT NULL,
  subject VARCHAR(200) NOT NULL,
  category VARCHAR(80) NOT NULL,
  description TEXT NOT NULL,
  complaint_date DATE NOT NULL,
  status ENUM('Pending','Assigned','In Progress','Completed','Closed','Rejected') NOT NULL DEFAULT 'Pending',
  priority ENUM('High','Medium','Low') NOT NULL DEFAULT 'Medium',
  assigned_to INT DEFAULT NULL,
  expected_completion_date DATE DEFAULT NULL,
  remark TEXT DEFAULT NULL,
  completion_date DATE DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (assigned_to) REFERENCES employees(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- complaint_files (attachments at registration + before/after work photos)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS complaint_files (
  id INT AUTO_INCREMENT PRIMARY KEY,
  complaint_id INT NOT NULL,
  kind ENUM('attachment','before','after') NOT NULL DEFAULT 'attachment',
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(255) NOT NULL,
  file_type VARCHAR(100) DEFAULT NULL,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- complaint_logs (status history / timeline audit trail)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS complaint_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  complaint_id INT NOT NULL,
  status VARCHAR(30) NOT NULL,
  remark TEXT DEFAULT NULL,
  changed_by VARCHAR(60) DEFAULT NULL,
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- categories (kept as a table so admin can manage them)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(80) NOT NULL UNIQUE
) ENGINE=InnoDB;

INSERT INTO categories (name) VALUES
  ('Water Supply'),('Electricity'),('Road & Infrastructure'),('Sanitation'),
  ('Noise Pollution'),('Public Property Damage'),('Street Lighting'),('Other');

-- =========================================================
-- SEED DATA
-- =========================================================

INSERT INTO employees (name, mobile, email, department, designation, address, status) VALUES
('Rohit Kadam','9876543210','rohit.kadam@resolvedesk.in','Public Works','Field Technician','Pune, MH','Active'),
('Sunita More','9823456712','sunita.more@resolvedesk.in','Electrical','Lineman Supervisor','Pune, MH','Active'),
('Imran Shaikh','9765123480','imran.shaikh@resolvedesk.in','Water Board','Plumbing Engineer','Pimpri, MH','Active'),
('Aarti Deshmukh','9911223344','aarti.d@resolvedesk.in','Sanitation','Sanitation Officer','Pune, MH','Inactive');

-- Default admin login -> username: admin  / password: admin123
-- Default employee logins -> username: <mobile number> / password: emp123
-- (password hashes below are bcrypt hashes generated with PHP password_hash)
INSERT INTO users (username, password_hash, role, employee_id) VALUES
('admin', '$2y$10$Oqy57A9ZLVfvHlUIdyMUfelgZOPmkbIJBsodSOv3DwsqThKOSwWZ2', 'admin', NULL);

-- Employee user accounts (password: emp123 for all four)
INSERT INTO users (username, password_hash, role, employee_id) VALUES
('9876543210', '$2y$10$NpD.GoUNtxBqep216Eji9.btDJJgoMkz5pn1QJuocZUJ/imStafiG', 'employee', 1),
('9823456712', '$2y$10$NpD.GoUNtxBqep216Eji9.btDJJgoMkz5pn1QJuocZUJ/imStafiG', 'employee', 2),
('9765123480', '$2y$10$NpD.GoUNtxBqep216Eji9.btDJJgoMkz5pn1QJuocZUJ/imStafiG', 'employee', 3),
('9911223344', '$2y$10$NpD.GoUNtxBqep216Eji9.btDJJgoMkz5pn1QJuocZUJ/imStafiG', 'employee', 4);

INSERT INTO complaints (name, mobile, email, subject, category, description, complaint_date, status, priority, assigned_to, remark, completion_date, created_at) VALUES
('Vikram Patil','9898989898','vikram.p@gmail.com','Frequent power cuts in Sector 7','Electricity','Power supply has been cutting off every evening for the past week, sometimes for 3-4 hours.','2026-06-25','Closed','High',2,'Transformer fuse replaced and load balanced.','2026-06-29','2026-06-25 09:12:00'),
('Sneha Kulkarni','9822011223','sneha.k@gmail.com','Water leakage near main road','Water Supply','There is continuous water leakage from an underground pipe near the bus stop, wasting a lot of water.','2026-07-01','In Progress','Medium',3,'Pipe joint identified, parts ordered.',NULL,'2026-07-01 14:40:00'),
('Ganesh Jadhav','9765432190',NULL,'Garbage not collected for 5 days','Sanitation','Garbage collection truck has not come to our lane in over 5 days, waste is piling up.','2026-07-03','Assigned','High',4,NULL,NULL,'2026-07-03 08:05:00'),
('Priya Nair','9090909090','priya.nair@gmail.com','Broken streetlight on MG Road','Street Lighting','Streetlight pole no. 14 has been non-functional for two weeks making the area unsafe at night.','2026-07-04','Pending','Medium',NULL,NULL,NULL,'2026-07-04 19:22:00'),
('Rahul Deshpande','9765098123','rahul.d@gmail.com','Pothole causing accidents','Road & Infrastructure','Large pothole near the school gate has caused two two-wheeler accidents this month.','2026-07-05','Pending','High',NULL,NULL,NULL,'2026-07-05 11:15:00');

INSERT INTO complaint_logs (complaint_id, status, remark, changed_by) VALUES
(1,'Pending',NULL,'system'),(1,'Assigned',NULL,'admin'),(1,'In Progress',NULL,'Sunita More'),(1,'Completed','Transformer fuse replaced and load balanced.','Sunita More'),(1,'Closed','Verified by admin.','admin'),
(2,'Pending',NULL,'system'),(2,'Assigned',NULL,'admin'),(2,'In Progress','Pipe joint identified, parts ordered.','Imran Shaikh'),
(3,'Pending',NULL,'system'),(3,'Assigned',NULL,'admin'),
(4,'Pending',NULL,'system'),
(5,'Pending',NULL,'system');
