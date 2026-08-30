const connection = require('./db');

const sql = `
    CREATE TABLE IF NOT EXISTS drivers (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    name VARCHAR(100) NOT NULL,

    phone VARCHAR(20) NOT NULL UNIQUE,
    phone_verified_at TIMESTAMP NULL,

    email VARCHAR(150) NULL UNIQUE,
    password_hash VARCHAR(255) NULL,

    profile_photo VARCHAR(500) NULL,

    date_of_birth DATE NULL,
    address TEXT NULL,
    city VARCHAR(100) NULL,

    driving_license_number VARCHAR(50) NOT NULL UNIQUE,
    license_expiry_date DATE NULL,
    license_document VARCHAR(500) NULL,

    status ENUM(
      'pending',
      'approved',
      'rejected',
      'suspended'
    ) NOT NULL DEFAULT 'pending',

    availability_status ENUM(
      'offline',
      'online',
      'busy'
    ) NOT NULL DEFAULT 'offline',

    current_latitude DECIMAL(10, 7) NULL,
    current_longitude DECIMAL(10, 7) NULL,
    last_location_at TIMESTAMP NULL,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_drivers_status (status),
    INDEX idx_drivers_availability (availability_status),
    INDEX idx_drivers_location (
      current_latitude,
      current_longitude
    )
  )
`;

connection.query(sql, (error) => {
    if (error) {
        console.error('❌ Table creation failed:', error.message);
        return;
    }

    console.log('✅ drivers table created successfully!');
    connection.end();
});