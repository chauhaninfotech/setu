const express = require("express");
const pool = require("../config/db");
const authenticateToken = require("../middleware/auth");
const router = express.Router();


// =====================================================
// POST - Create Booking
// =====================================================

router.post("/bookings", authenticateToken, async (req, res) => {
    try {
        const {
            booking_number,
            driver_id,
            vehicle_id,
            ride_type,
            pickup_address,
            pickup_city,
            pickup_latitude,
            pickup_longitude,
            drop_address,
            drop_city,
            drop_latitude,
            drop_longitude,
            distance_km,
            estimated_duration_minutes,
            fare,
            discount,
            tax,
            total_fare,
            payment_method,
            payment_status,
            booking_status,
            scheduled_at,
            driver_assigned_at,
            driver_arrived_at,
            ride_started_at,
            ride_completed_at,
            cancelled_at,
            cancellation_reason,
            driver_notes
        } = req.body;

        // Required fields
        if (!driver_id || !pickup_address || !drop_address) {
            return res.status(400).json({
                success: false,
                message: "driver_id, pickup_address and drop_address are required"
            });
        }

        // Generate booking number
        const bookingNumber =
            booking_number || `BK${Date.now()}`;

        // Check driver
        const [driver] = await pool.execute(
            `SELECT id FROM drivers WHERE id = ? LIMIT 1`,
            [driver_id]
        );

        if (driver.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Driver not found"
            });
        }

        // Check vehicle if supplied
        if (vehicle_id) {
            const [vehicle] = await pool.execute(
                `SELECT id FROM vehicles WHERE id = ? LIMIT 1`,
                [vehicle_id]
            );

            if (vehicle.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Vehicle not found"
                });
            }
        }

        // Insert booking
        const [result] = await pool.execute(
            `INSERT INTO bookings (
                booking_number,
                driver_id,
                vehicle_id,
                ride_type,

                pickup_address,
                pickup_city,
                pickup_latitude,
                pickup_longitude,

                drop_address,
                drop_city,
                drop_latitude,
                drop_longitude,

                distance_km,
                estimated_duration_minutes,

                fare,
                discount,
                tax,
                total_fare,

                payment_method,
                payment_status,
                booking_status,

                scheduled_at,

                driver_assigned_at,
                driver_arrived_at,
                ride_started_at,
                ride_completed_at,

                cancelled_at,
                cancellation_reason,

                driver_notes
            )
            VALUES (
                ?, ?, ?, ?,
                ?, ?, ?, ?,
                ?, ?, ?, ?,
                ?, ?,
                ?, ?, ?, ?,
                ?, ?, ?,
                ?,
                ?, ?, ?, ?,
                ?, ?,
                ?
            )`,
            [
                bookingNumber,
                driver_id,
                vehicle_id ?? null,
                ride_type ?? "ride",

                pickup_address,
                pickup_city ?? null,
                pickup_latitude ?? null,
                pickup_longitude ?? null,

                drop_address,
                drop_city ?? null,
                drop_latitude ?? null,
                drop_longitude ?? null,

                distance_km ?? null,
                estimated_duration_minutes ?? null,

                fare ?? 0,
                discount ?? 0,
                tax ?? 0,
                total_fare ?? 0,

                payment_method ?? "cash",
                payment_status ?? "pending",
                booking_status ?? "pending",

                scheduled_at ?? null,

                driver_assigned_at ?? null,
                driver_arrived_at ?? null,
                ride_started_at ?? null,
                ride_completed_at ?? null,

                cancelled_at ?? null,
                cancellation_reason ?? null,

                driver_notes ?? null
            ]
        );

        // Get created booking
        const [bookings] = await pool.execute(
            `SELECT *
             FROM bookings
             WHERE id = ?
             LIMIT 1`,
            [result.insertId]
        );

        return res.status(201).json({
            success: true,
            message: "Booking created successfully",
            data: bookings[0]
        });

    } catch (error) {
        console.error("❌ Booking insert error:", error);

        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                success: false,
                message: "Booking number already exists"
            });
        }

        return res.status(500).json({
            success: false,
            message: "Failed to create booking",
            error: error.message
        });
    }
});



// =====================================================
// GET - Booking List
// =====================================================

router.get("/bookings", authenticateToken, async (req, res) => {

    try {

        const [bookings] = await pool.execute(
            `SELECT *
             FROM bookings
             ORDER BY id DESC`
        );


        return res.status(200).json({
            success: true,
            message: "Bookings fetched successfully",
            data: bookings
        });


    } catch (error) {

        console.error("❌ Get bookings error:", error);


        return res.status(500).json({
            success: false,
            message: "Failed to fetch bookings",
            error: error.message
        });

    }

});


// =====================================================
// GET - Single Booking
// =====================================================

router.get("/bookings/:id", async (req, res) => {

    try {

        const { id } = req.params;


        const [bookings] = await pool.execute(
            `SELECT *
             FROM bookings
             WHERE id = ?
             LIMIT 1`,
            [id]
        );


        if (bookings.length === 0) {

            return res.status(404).json({
                success: false,
                message: "Booking not found"
            });

        }


        return res.status(200).json({
            success: true,
            message: "Booking fetched successfully",
            data: bookings[0]
        });


    } catch (error) {

        console.error("❌ Get booking error:", error);


        return res.status(500).json({
            success: false,
            message: "Failed to fetch booking",
            error: error.message
        });

    }

});


// =====================================================
// PUT - Full Booking Update
// =====================================================

router.put("/bookings/:id", async (req, res) => {

    const bookingId = req.params.id;


    const {
        booking_number,
        driver_id,
        vehicle_id,
        ride_type,
        pickup_address,
        pickup_city,
        pickup_latitude,
        pickup_longitude,
        drop_address,
        drop_city,
        drop_latitude,
        drop_longitude,
        distance_km,
        estimated_duration_minutes,
        fare,
        discount,
        tax,
        total_fare,
        payment_method,
        payment_status,
        booking_status,
        scheduled_at,
        driver_assigned_at,
        driver_arrived_at,
        ride_started_at,
        ride_completed_at,
        cancelled_at,
        cancellation_reason,
        rider_notes,
        driver_notes
    } = req.body;


    try {

        // Check booking
        const [existingBooking] = await pool.execute(
            `SELECT id
             FROM bookings
             WHERE id = ?
             LIMIT 1`,
            [bookingId]
        );


        if (existingBooking.length === 0) {

            return res.status(404).json({
                success: false,
                message: "Booking not found"
            });

        }


        // Check driver
        if (driver_id) {

            const [driver] = await pool.execute(
                `SELECT id FROM drivers WHERE id = ? LIMIT 1`,
                [driver_id]
            );


            if (driver.length === 0) {

                return res.status(404).json({
                    success: false,
                    message: "Driver not found"
                });

            }

        }


        // Check vehicle
        if (vehicle_id) {

            const [vehicle] = await pool.execute(
                `SELECT id FROM vehicles WHERE id = ? LIMIT 1`,
                [vehicle_id]
            );


            if (vehicle.length === 0) {

                return res.status(404).json({
                    success: false,
                    message: "Vehicle not found"
                });

            }

        }


        await pool.execute(
            `UPDATE bookings SET
                booking_number = ?,
                driver_id = ?,
                vehicle_id = ?,
                ride_type = ?,
                pickup_address = ?,
                pickup_city = ?,
                pickup_latitude = ?,
                pickup_longitude = ?,
                drop_address = ?,
                drop_city = ?,
                drop_latitude = ?,
                drop_longitude = ?,
                distance_km = ?,
                estimated_duration_minutes = ?,
                fare = ?,
                discount = ?,
                tax = ?,
                total_fare = ?,
                payment_method = ?,
                payment_status = ?,
                booking_status = ?,
                scheduled_at = ?,
                driver_assigned_at = ?,
                driver_arrived_at = ?,
                ride_started_at = ?,
                ride_completed_at = ?,
                cancelled_at = ?,
                cancellation_reason = ?,
                rider_notes = ?,
                driver_notes = ?
             WHERE id = ?`,
            [
                booking_number,
                driver_id ?? null,
                vehicle_id ?? null,
                ride_type ?? "ride",
                pickup_address,
                pickup_city ?? null,
                pickup_latitude ?? null,
                pickup_longitude ?? null,
                drop_address,
                drop_city ?? null,
                drop_latitude ?? null,
                drop_longitude ?? null,
                distance_km ?? null,
                estimated_duration_minutes ?? null,
                fare ?? 0,
                discount ?? 0,
                tax ?? 0,
                total_fare ?? 0,
                payment_method ?? "cash",
                payment_status ?? "pending",
                booking_status ?? "pending",
                scheduled_at ?? null,
                driver_assigned_at ?? null,
                driver_arrived_at ?? null,
                ride_started_at ?? null,
                ride_completed_at ?? null,
                cancelled_at ?? null,
                cancellation_reason ?? null,
                rider_notes ?? null,
                driver_notes ?? null,
                bookingId
            ]
        );


        // Get updated booking
        const [bookings] = await pool.execute(
            `SELECT *
             FROM bookings
             WHERE id = ?
             LIMIT 1`,
            [bookingId]
        );


        return res.status(200).json({
            success: true,
            message: "Booking updated successfully",
            data: bookings[0]
        });


    } catch (error) {

        console.error("❌ Booking update error:", error);


        return res.status(500).json({
            success: false,
            message: "Failed to update booking",
            error: error.message
        });

    }

});


// =====================================================
// PATCH - Partial Booking Update
// =====================================================

router.patch("/bookings/:id", async (req, res) => {

    const bookingId = req.params.id;


    const allowedFields = [
        "booking_number",
        "driver_id",
        "vehicle_id",
        "ride_type",
        "pickup_address",
        "pickup_city",
        "pickup_latitude",
        "pickup_longitude",
        "drop_address",
        "drop_city",
        "drop_latitude",
        "drop_longitude",
        "distance_km",
        "estimated_duration_minutes",
        "fare",
        "discount",
        "tax",
        "total_fare",
        "payment_method",
        "payment_status",
        "booking_status",
        "scheduled_at",
        "driver_assigned_at",
        "driver_arrived_at",
        "ride_started_at",
        "ride_completed_at",
        "cancelled_at",
        "cancellation_reason",
        "rider_notes",
        "driver_notes"
    ];


    try {

        // Check booking
        const [existingBooking] = await pool.execute(
            `SELECT id
             FROM bookings
             WHERE id = ?
             LIMIT 1`,
            [bookingId]
        );


        if (existingBooking.length === 0) {

            return res.status(404).json({
                success: false,
                message: "Booking not found"
            });

        }


        const fields = [];
        const values = [];


        for (const field of allowedFields) {

            if (req.body[field] !== undefined) {

                fields.push(`${field} = ?`);
                values.push(req.body[field]);

            }

        }


        if (fields.length === 0) {

            return res.status(400).json({
                success: false,
                message: "No fields provided for update"
            });

        }


        // Check driver
        if (req.body.driver_id !== undefined && req.body.driver_id !== null) {

            const [driver] = await pool.execute(
                `SELECT id FROM drivers WHERE id = ? LIMIT 1`,
                [req.body.driver_id]
            );


            if (driver.length === 0) {

                return res.status(404).json({
                    success: false,
                    message: "Driver not found"
                });

            }

        }


        // Check vehicle
        if (req.body.vehicle_id !== undefined && req.body.vehicle_id !== null) {

            const [vehicle] = await pool.execute(
                `SELECT id FROM vehicles WHERE id = ? LIMIT 1`,
                [req.body.vehicle_id]
            );


            if (vehicle.length === 0) {

                return res.status(404).json({
                    success: false,
                    message: "Vehicle not found"
                });

            }

        }


        values.push(bookingId);


        await pool.execute(
            `UPDATE bookings
             SET ${fields.join(", ")}
             WHERE id = ?`,
            values
        );


        // Get updated booking
        const [bookings] = await pool.execute(
            `SELECT *
             FROM bookings
             WHERE id = ?
             LIMIT 1`,
            [bookingId]
        );


        return res.status(200).json({
            success: true,
            message: "Booking updated successfully",
            data: bookings[0]
        });


    } catch (error) {

        console.error("❌ Booking PATCH error:", error);


        if (error.code === "ER_DUP_ENTRY") {

            return res.status(409).json({
                success: false,
                message: "Booking number already exists"
            });

        }


        return res.status(500).json({
            success: false,
            message: "Failed to update booking",
            error: error.message
        });

    }

});


// =====================================================
// DELETE - Booking
// =====================================================

router.delete("/bookings/:id", async (req, res) => {

    const bookingId = req.params.id;


    try {

        const [existingBooking] = await pool.execute(
            `SELECT id
             FROM bookings
             WHERE id = ?
             LIMIT 1`,
            [bookingId]
        );


        if (existingBooking.length === 0) {

            return res.status(404).json({
                success: false,
                message: "Booking not found"
            });

        }


        await pool.execute(
            `DELETE FROM bookings
             WHERE id = ?`,
            [bookingId]
        );


        return res.status(200).json({
            success: true,
            message: "Booking deleted successfully",
            booking_id: bookingId
        });


    } catch (error) {

        console.error("❌ Booking delete error:", error);


        return res.status(500).json({
            success: false,
            message: "Failed to delete booking",
            error: error.message
        });

    }

});


module.exports = router;