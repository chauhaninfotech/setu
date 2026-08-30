CREATE TABLE IF NOT EXISTS vehicles (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    driver_id BIGINT UNSIGNED NULL,

    vehicle_type ENUM(
        'car',
        'bike',
        'auto',
        'van',
        'bus',
        'truck',
        'other'
    ) NOT NULL DEFAULT 'car',

    make VARCHAR(100) NULL,
    model VARCHAR(100) NULL,
    variant VARCHAR(100) NULL,

    registration_number VARCHAR(50) NOT NULL UNIQUE,

    color VARCHAR(50) NULL,
    manufacturing_year YEAR NULL,

    fuel_type ENUM(
        'petrol',
        'diesel',
        'cng',
        'electric',
        'hybrid',
        'other'
    ) NULL,

    seating_capacity TINYINT UNSIGNED NULL,

    vehicle_photo VARCHAR(500) NULL,
    registration_document VARCHAR(500) NULL,
    insurance_document VARCHAR(500) NULL,
    permit_document VARCHAR(500) NULL,

    registration_expiry_date DATE NULL,
    insurance_expiry_date DATE NULL,
    permit_expiry_date DATE NULL,

    status ENUM(
        'pending',
        'approved',
        'rejected',
        'suspended'
    ) NOT NULL DEFAULT 'pending',

    availability_status ENUM(
        'available',
        'unavailable',
        'busy'
    ) NOT NULL DEFAULT 'available',

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_vehicles_driver (driver_id),
    INDEX idx_vehicles_status (status),
    INDEX idx_vehicles_availability (availability_status),

    CONSTRAINT fk_vehicles_driver
        FOREIGN KEY (driver_id)
        REFERENCES drivers(id)
        ON DELETE SET NULL
        ON UPDATE CASCADE
);