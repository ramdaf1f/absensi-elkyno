-- ============================================================
-- Absensi - MySQL schema
-- Run this on your cloud MySQL (PlanetScale, Railway, Aiven, RDS, etc.)
-- then set DATABASE_URL in your environment variables.
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  name VARCHAR(191) NOT NULL,
  email VARCHAR(191) NOT NULL UNIQUE,
  password_hash VARCHAR(191) NOT NULL,
  role ENUM('employee', 'admin') NOT NULL DEFAULT 'employee',
  position VARCHAR(191) NULL,
  phone VARCHAR(20) NULL,
  employee_id VARCHAR(191) UNIQUE NULL,
  salary DECIMAL(10, 2) NULL,
  status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
-- Single-row settings table (id is always 1)
CREATE TABLE IF NOT EXISTS office_settings (
  id INT NOT NULL PRIMARY KEY DEFAULT 1,
  name VARCHAR(191) NOT NULL DEFAULT 'Kantor Pusat',
  latitude DECIMAL(10, 7) NOT NULL,
  longitude DECIMAL(10, 7) NOT NULL,
  radius_m INT NOT NULL DEFAULT 5,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
CREATE TABLE IF NOT EXISTS attendance (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  type ENUM('check_in', 'check_out') NOT NULL,
  photo LONGTEXT NOT NULL,
  -- base64 data URL of the captured photo
  latitude DECIMAL(10, 7) NOT NULL,
  longitude DECIMAL(10, 7) NOT NULL,
  accuracy_m DECIMAL(10, 2) NULL,
  distance_m DECIMAL(10, 2) NOT NULL,
  -- distance from office at submit time
  within_radius TINYINT(1) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_attendance_user (user_id),
  INDEX idx_attendance_created (created_at),
  CONSTRAINT fk_attendance_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
-- Seed default office location (change to your real office coordinates)
INSERT INTO office_settings (id, name, latitude, longitude, radius_m)
VALUES (1, 'Kantor Pusat', -6.2087600, 106.8456000, 5) ON DUPLICATE KEY
UPDATE id = id;