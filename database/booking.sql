CREATE TABLE IF NOT EXISTS bookings (

    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    booking_number VARCHAR(50) UNIQUE NOT NULL,

    driver_id BIGINT UNSIGNED NOT NULL,

    vehicle_id BIGINT UNSIGNED NULL,

    ride_type VARCHAR(50) DEFAULT 'ride',

    pickup_address TEXT NOT NULL,
    pickup_city VARCHAR(100) NULL,
    pickup_latitude DECIMAL(10,7) NULL,
    pickup_longitude DECIMAL(10,7) NULL,

    drop_address TEXT NOT NULL,
    drop_city VARCHAR(100) NULL,
    drop_latitude DECIMAL(10,7) NULL,
    drop_longitude DECIMAL(10,7) NULL,

    distance_km DECIMAL(10,2) NULL,
    estimated_duration_minutes INT NULL,

    fare DECIMAL(10,2) DEFAULT 0.00,
    discount DECIMAL(10,2) DEFAULT 0.00,
    tax DECIMAL(10,2) DEFAULT 0.00,
    total_fare DECIMAL(10,2) DEFAULT 0.00,

    payment_method VARCHAR(50) DEFAULT 'cash',
    payment_status VARCHAR(50) DEFAULT 'pending',

    booking_status VARCHAR(50) DEFAULT 'pending',

    scheduled_at DATETIME NULL,

    driver_assigned_at DATETIME NULL,
    driver_arrived_at DATETIME NULL,
    ride_started_at DATETIME NULL,
    ride_completed_at DATETIME NULL,

    cancelled_at DATETIME NULL,
    cancellation_reason TEXT NULL,

    driver_notes TEXT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP
);