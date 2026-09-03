const express = require("express");
const pool = require("../config/db");
const authenticateToken = require("../middleware/auth");
require("dotenv").config();
const { getIO } = require("../socket");
//const { parseBooking } = require("./bookingParser");

const router = express.Router();



// =====================================================
// POST - Create Booking
// =====================================================

router.post("/create-booking", authenticateToken, async (req, res) => {
    try {

        const { message, pickup_city, pickup_state, drop_city, drop_state, vehicle_type } = req.body;

        if (!message) {
            return res.status(400).json({
                success: false,
                message: "Booking message is required"
            });
        }
        const cleanMessage = message .replace(/\r?\n|\r/g, " ") .replace(/\s+/g, " ").trim();
        // ==========================================
        // AI PARSE DRIVER MESSAGE
        // ==========================================

        


        // ==========================================
        // DRIVER
        // ==========================================

        const driver_id = req.headers["driver-id"];

        if (!driver_id) {
            return res.status(400).json({
                success: false,
                message: "driver-id header is required"
            });
        }

        // ==========================================
        // GET DATA FROM AI
        // ==========================================

        //const parsedBooking = await parseBooking(message);

        // const vehicle_type = parsedBooking?.vehicle_type ?? null;

        // const pickup_city = parsedBooking?.pickup_city ?? null;
        // const pickup_state = parsedBooking?.pickup_state ?? null;

        // const drop_city = parsedBooking?.drop_city ?? null;
        // const drop_state = parsedBooking?.drop_state ?? null;

     

        

        // ==========================================
        // VALIDATE LOCATIONS
        // ==========================================

        if (!pickup_city || !drop_city) {
            return res.status(400).json({
                success: false,
                message: "Could not determine pickup or drop city",
                parsed: parsedBooking
            });
        }


        // ==========================================
        // OTHER VALUES FROM REQUEST
        // ==========================================

        const {
            booking_number,
            agent_or_rider,
            mobile,
            ride_type,
            pickup_address,
            pickup_latitude,
            pickup_longitude,
            drop_address,
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
            booking_notes,
            driver_notes
        } = req.body;

        // Required fields
        if (!driver_id) {
            return res.status(400).json({
                success: false,
                message: "driver_id are required"
            });
        }

        // Generate booking number
        const bookingNumber =
            booking_number || `BK${Date.now()}`;

        // Check driver
        const [drivers] = await pool.execute(
            `SELECT id, phone FROM drivers WHERE id = ? LIMIT 1`,
            [driver_id]
        );
        

        if (drivers.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Driver not found"
            });
        }

       const driver = drivers[0];

        const driverMobile = driver.phone ?? null;

        // Insert booking
        const [result] = await pool.execute(
            `INSERT INTO bookings (
                booking_number,
                agent_or_rider,
                mobile,
                driver_id,
                vehicle_type,
                ride_type,

                pickup_address,
                pickup_city,
                pickup_state,
                pickup_latitude,
                pickup_longitude,

                drop_address,
                drop_city,
                drop_state,
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
                booking_notes,
                driver_notes
            )
            VALUES (
                ?, ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?,
                ?, ?,
                ?, ?, ?, ?,
                ?, ?, ?,
                ?,
                ?, ?, ?, ?,
                ?, ?,
                ?, ?
            )`,
            [
                bookingNumber,
                agent_or_rider ?? "Agent",
                driverMobile,
                driver_id,
                vehicle_type ?? null,
                ride_type ?? "ride",

                pickup_address ?? null,
                pickup_city ?? null,
                pickup_state ?? null,
                pickup_latitude ?? null,
                pickup_longitude ?? null,

                drop_address ?? null,
                drop_city ?? null,
                drop_state ?? null,
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
                cleanMessage ?? null,
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
        const newBooking = bookings[0];
        if (
    newBooking &&
    ["pending", "approved"].includes(
        newBooking.booking_status
    )
) {

    const io = getIO();

    console.log(
        "📢 Sending new booking:",
        newBooking.id
    );

    io.emit(
        "new-booking",
        newBooking
    );
}
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

router.get("/location-bookings", authenticateToken, async (req, res) => {
    try {

        const driverId = req.headers["driver-id"];

        console.log("Driver ID:", driverId);

        if (!driverId) {
            return res.status(401).json({
                success: false,
                message: "Driver ID is required"
            });
        }

        // ==========================================
        // GET DRIVER CITY
        // ==========================================

        const [drivers] = await pool.execute(
            `
            SELECT city
            FROM drivers
            WHERE id = ?
            LIMIT 1
            `,
            [driverId]
        );

        if (drivers.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Driver not found"
            });
        }

        const driverCity = drivers[0].city;

        console.log("Driver City:", driverCity);

        if (!driverCity) {
            return res.status(404).json({
                success: false,
                message: "Driver city not found"
            });
        }

        // ==========================================
        // GET BOOKINGS
        // ONLY pending + approved
        // ==========================================

        const [bookings] = await pool.execute(
            `
            SELECT *
            FROM bookings
            WHERE
                (
                    LOWER(TRIM(pickup_city)) = LOWER(TRIM(?))
                    OR
                    LOWER(TRIM(drop_city)) = LOWER(TRIM(?))
                )
                AND booking_status IN ('pending', 'approved')
            ORDER BY id DESC
            `,
            [driverCity, driverCity]
        );
        
        // ==========================================
        // RESPONSE
        // ==========================================

        return res.status(200).json({
            success: true,
            message: "Location bookings fetched successfully",
            city: driverCity,
            data: bookings
        });

    } catch (error) {

        console.error(
            "❌ Get location bookings error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Failed to fetch location bookings",
            error: error.message
        });
    }
});



// =====================================================
// GET - My Booking List
// =====================================================

router.get("/my-bookings", authenticateToken, async (req, res) => {

    try {

        const driverId = req.headers["driver-id"];

        const [bookings] = await pool.execute(
            `
            SELECT *
            FROM bookings
            WHERE driver_id = ?
            ORDER BY id DESC
            `,
            [driverId]
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
// GET - Booking List
// =====================================================

router.get("/bookings", authenticateToken, async (req, res) => {
    try {

        const driverId = req.headers["driver-id"];

        if (!driverId) {
            return res.status(400).json({
                success: false,
                message: "driver-id header is required"
            });
        }

        // ==========================================
        // CHECK ACTIVE SUBSCRIPTION
        // ==========================================

        const [subscriptionRows] = await pool.execute(
            `SELECT 
                ds.id,
                ds.subscription_plan_id,
                ds.start_date,
                ds.end_date,
                ds.subscription_status,
                sp.name,
                sp.price
             FROM driver_subscriptions ds
             INNER JOIN subscription_plans sp
                ON sp.id = ds.subscription_plan_id
             WHERE ds.driver_id = ?
               AND ds.subscription_status = 'active'
               AND ds.start_date <= NOW()
               AND ds.end_date >= NOW()
             ORDER BY ds.id DESC
             LIMIT 1`,
            [driverId]
        );

        const hasActiveSubscription =
            subscriptionRows.length > 0;

        // ==========================================
        // GET BOOKINGS
        // ==========================================

        const [bookings] = await pool.execute(
            `SELECT *
             FROM bookings
             WHERE booking_status IN ('pending', 'approved')
             ORDER BY id DESC`
        );

        // ==========================================
        // RESPONSE
        // ==========================================

        return res.status(200).json({
            success: true,
            message: "Bookings fetched successfully",

            has_active_subscription:
                hasActiveSubscription,

            subscription:
                hasActiveSubscription
                    ? subscriptionRows[0]
                    : null,

            data: bookings
        });

    } catch (error) {

        console.error(
            "❌ Get bookings error:",
            error
        );

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

router.post('/availability-status', async (req, res) => {
  try {
    const driverId = req.headers['driver-id'];
    const { is_online } = req.body;

    console.log('====================================');
    console.log('AVAILABILITY STATUS');
    console.log('Driver ID:', driverId);
    console.log('is_online:', is_online);
    console.log('Type:', typeof is_online);
    console.log('====================================');

    if (!driverId) {
      return res.status(400).json({
        success: false,
        message: 'Driver ID is required.',
      });
    }

    if (typeof is_online !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'is_online must be true or false.',
      });
    }

    await db.query(
      `
      UPDATE drivers
      SET is_online = ?,
          updated_at = NOW()
      WHERE id = ?
      `,
      [
        is_online ? 1 : 0,
        driverId,
      ]
    );

    return res.status(200).json({
      success: true,
      message: is_online
          ? 'Driver is now online.'
          : 'Driver is now offline.',
      is_online: is_online,
    });

  } catch (error) {
    console.error(
      'AVAILABILITY STATUS ERROR:',
      error
    );

    return res.status(500).json({
      success: false,
      message: 'Unable to update availability status.',
    });
  }
});




// ============================================================
// DRIVER AVAILABILITY STATUS
// ============================================================

router.post(
  "/driver/availability-status",
  authenticateToken,
  async (req, res) => {
    try {
      const driverId = req.headers["driver-id"];

      const { is_online } = req.body;

      console.log("====================================");
      console.log("AVAILABILITY STATUS");
      console.log("Driver ID:", driverId);
      console.log("is_online:", is_online);
      console.log("is_online type:", typeof is_online);
      console.log("BODY:", req.body);
      console.log("====================================");

      // --------------------------------------------------------
      // DRIVER ID
      // --------------------------------------------------------

      if (!driverId) {
        return res.status(400).json({
          success: false,
          message: "Driver ID is required.",
        });
      }

      // --------------------------------------------------------
      // VALIDATE is_online
      // --------------------------------------------------------

      if (typeof is_online !== "boolean") {
        return res.status(400).json({
          success: false,
          message: "is_online must be true or false.",
        });
      }

      // --------------------------------------------------------
      // UPDATE DRIVER
      // --------------------------------------------------------

      const [result] = await pool.query(
        `
        UPDATE drivers
        SET is_online = ?
        WHERE id = ?
        `,
        [
          is_online ? 1 : 0,
          driverId,
        ]
      );

      console.log("UPDATE RESULT:", result);

      // --------------------------------------------------------
      // DRIVER NOT FOUND
      // --------------------------------------------------------

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: "Driver not found.",
        });
      }

      // --------------------------------------------------------
      // SOCKET UPDATE
      // --------------------------------------------------------

      try {
        const io = getIO();

        io.emit("driver_availability_changed", {
          driver_id: Number(driverId),
          is_online: is_online,
        });
      } catch (socketError) {
        console.log(
          "Socket notification failed:",
          socketError.message
        );
      }

      // --------------------------------------------------------
      // SUCCESS
      // --------------------------------------------------------

      return res.status(200).json({
        success: true,

        message: is_online
          ? "Driver is now online."
          : "Driver is now offline.",

        driver_id: Number(driverId),

        is_online: is_online,
      });

    } catch (error) {
      console.error("====================================");
      console.error("AVAILABILITY STATUS ERROR");
      console.error(error);
      console.error("MESSAGE:", error.message);
      console.error("SQL:", error.sql);
      console.error("====================================");

      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);



module.exports = router;