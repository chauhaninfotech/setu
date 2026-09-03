const express = require("express");
const bcrypt = require("bcrypt");
const pool = require("../config/db");
const jwt = require("jsonwebtoken");
const authenticateToken = require("../middleware/auth");

const router = express.Router();

router.post("/driver/login", async (req, res) => {
    try {
        const { phone } = req.body;

        if (!phone) {
            return res.status(400).json({
                success: false,
                message: "Phone number is required"
            });
        }

        // Find driver
        const [drivers] = await pool.execute(
            `SELECT id,
                    phone,
                    name,
                    email,
                    profile_photo,
                    status,
                    is_online,
                    phone_verified_at
             FROM drivers
             WHERE phone = ?
             LIMIT 1`,
            [phone]
        );

        if (drivers.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Driver not registered"
            });
        }

        const driver = drivers[0];

        // Driver must be approved
        if (driver.status !== "approved") {
            return res.status(403).json({
                success: false,
                message: `Driver is not approved. Current status: ${driver.status}`
            });
        }

        // Dummy OTP
        const otp = "123455";

        // Save OTP
        await pool.execute(
            `UPDATE drivers
             SET otp_code = ?,
                 otp_expires_at = DATE_ADD(NOW(), INTERVAL 10 MINUTE)
             WHERE id = ?`,
            [otp, driver.id]
        );

        return res.status(200).json({
            success: true,
            message: "OTP sent successfully",

            // Development only
            dummy_otp: "123455",

            data: {
                driver_id: driver.id,
                phone: driver.phone,
                status: driver.status
            }
        });

    } catch (error) {
        console.error("❌ Driver login OTP error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to send OTP",
            error: error.message
        });
    }
});


router.post("/drivers", async (req, res) => {
    try {
        const {
            name,
            phone,
            phone_verified_at,
            email,
            password,
            profile_photo,
            date_of_birth,
            address,
            city,
            driving_license_number,
            license_expiry_date,
            license_document,
            status,
            is_online,
            current_latitude,
            current_longitude,
            last_location_at
        } = req.body;

        // Required fields
        if (!name || !phone || !driving_license_number) {
            return res.status(400).json({
                success: false,
                message: "name, phone and driving_license_number are required"
            });
        }

        // Hash password
        let password_hash = null;

        if (password) {
            password_hash = await bcrypt.hash(password, 12);
        }

        
        // Insert driver
        const [result] = await pool.execute(
            `INSERT INTO drivers (
                name,
                phone,
                phone_verified_at,
                email,
                password_hash,
                profile_photo,
                date_of_birth,
                address,
                city,
                driving_license_number,
                license_expiry_date,
                license_document,
                status,
                is_online,
                current_latitude,
                current_longitude,
                last_location_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                name,
                phone,
                phone_verified_at || null,
                email || null,
                password_hash,
                profile_photo || null,
                date_of_birth || null,
                address || null,
                city || null,
                driving_license_number,
                license_expiry_date || null,
                license_document || null,
                status || "pending",
                is_online || 0,
                current_latitude || null,
                current_longitude || null,
                last_location_at || null
            ]
        );

        // Get newly created driver
        const [rows] = await pool.execute(
            `SELECT
                id,
                name,
                phone,
                phone_verified_at,
                email,
                profile_photo,
                date_of_birth,
                address,
                city,
                driving_license_number,
                license_expiry_date,
                license_document,
                status,
                is_online,
                current_latitude,
                current_longitude,
                last_location_at,
                created_at,
                updated_at
            FROM drivers
            WHERE id = ?`,
            [result.insertId]
        );

        return res.status(201).json({
            success: true,
            message: "Driver added successfully",
            data: rows[0]
        });

    } catch (error) {
        console.error("❌ Driver insert error:", error);

        // Duplicate unique field
        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                success: false,
                message: "Phone, email, or driving license number already exists"
            });
        }

        return res.status(500).json({
            success: false,
            message: "Failed to add driver",
            error: error.message
        });
    }
});

// Select Driver List

router.get("/drivers", async (req, res) => {
    try {
        const [drivers] = await pool.execute(`
            SELECT
                id,
                name,
                phone,
                email,
                profile_photo,
                date_of_birth,
                address,
                city,
                driving_license_number,
                license_expiry_date,
                license_document,
                status,
                is_online,
                current_latitude,
                current_longitude,
                last_location_at,
                created_at,
                updated_at
            FROM drivers
            ORDER BY id DESC
        `);

        return res.status(200).json({
            success: true,
            message: "Drivers fetched successfully",
            data: drivers
        });

    } catch (error) {
        console.error("❌ Get drivers error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch drivers",
            error: error.message
        });
    }
});


router.get("/drivers/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const [drivers] = await pool.execute(
            `SELECT
                id,
                name,
                phone,
                phone_verified_at,
                email,
                profile_photo,
                date_of_birth,
                address,
                city,
                driving_license_number,
                license_expiry_date,
                license_document,
                status,
                is_online,
                current_latitude,
                current_longitude,
                last_location_at,
                created_at,
                updated_at
             FROM drivers
             WHERE id = ?
             LIMIT 1`,
            [id]
        );

        if (drivers.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Driver not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Driver fetched successfully",
            data: drivers[0]
        });

    } catch (error) {
        console.error("❌ Get driver error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch driver",
            error: error.message
        });
    }
});

// PUT update driver
router.put("/drivers/:id", async (req, res) => {

    const driverId = req.params.id;

    const {
        name,
        phone,
        phone_verified_at,
        email,
        password,
        password_hash,
        profile_photo,
        date_of_birth,
        address,
        city,
        driving_license_number,
        license_expiry_date,
        license_document,
        status,
        is_online,
        current_latitude,
        current_longitude,
        last_location_at
    } = req.body;

    try {

        // Check driver exists
        const [existingDriver] = await pool.execute(
            `SELECT id, password_hash
             FROM drivers
             WHERE id = ?
             LIMIT 1`,
            [driverId]
        );

        if (existingDriver.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Driver not found"
            });
        }

        // Keep old password if no new password is provided
        let newPasswordHash = existingDriver[0].password_hash;

        // If password is sent, hash it
        if (password) {
            newPasswordHash = await bcrypt.hash(password, 12);
        }

        // If password_hash is directly sent, use it
        if (password_hash) {
            newPasswordHash = password_hash;
        }

        const sql = `
            UPDATE drivers SET
                name = ?,
                phone = ?,
                phone_verified_at = ?,
                email = ?,
                password_hash = ?,
                profile_photo = ?,
                date_of_birth = ?,
                address = ?,
                city = ?,
                driving_license_number = ?,
                license_expiry_date = ?,
                license_document = ?,
                status = ?,
                is_online = ?,
                current_latitude = ?,
                current_longitude = ?,
                last_location_at = ?
            WHERE id = ?
        `;

        const values = [
            name,
            phone,
            phone_verified_at ?? null,
            email ?? null,
            newPasswordHash,
            profile_photo ?? null,
            date_of_birth ?? null,
            address ?? null,
            city ?? null,
            driving_license_number,
            license_expiry_date ?? null,
            license_document ?? null,
            status ?? "pending",
            is_online ?? 0,
            current_latitude ?? null,
            current_longitude ?? null,
            last_location_at ?? null,
            driverId
        ];

        const [result] = await pool.execute(sql, values);

        // Get updated driver
        const [rows] = await pool.execute(
            `SELECT
                id,
                name,
                phone,
                phone_verified_at,
                email,
                profile_photo,
                date_of_birth,
                address,
                city,
                driving_license_number,
                license_expiry_date,
                license_document,
                status,
                is_online,
                current_latitude,
                current_longitude,
                last_location_at,
                created_at,
                updated_at
            FROM drivers
            WHERE id = ?
            LIMIT 1`,
            [driverId]
        );

        return res.status(200).json({
            success: true,
            message: "Driver updated successfully",
            data: rows[0]
        });

    } catch (error) {

        console.error("❌ Driver update error:", error);

        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                success: false,
                message: "Phone, email, or driving license number already exists"
            });
        }

        return res.status(500).json({
            success: false,
            message: "Failed to update driver",
            error: error.message
        });
    }
});


// DELETE driver
router.delete("/drivers/:id", async (req, res) => {

    const driverId = req.params.id;

    try {

        // Check driver exists
        const [existingDriver] = await pool.execute(
            `SELECT id FROM drivers WHERE id = ? LIMIT 1`,
            [driverId]
        );

        if (existingDriver.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Driver not found"
            });
        }

        // Delete driver
        const [result] = await pool.execute(
            `DELETE FROM drivers WHERE id = ?`,
            [driverId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Driver not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Driver deleted successfully",
            driver_id: driverId
        });

    } catch (error) {

        console.error("❌ Driver delete error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to delete driver",
            error: error.message
        });
    }
});

router.post("/driver/register", async (req, res) => {
    try {
        const { name, phone } = req.body;

        if (!phone) {
            return res.status(400).json({
                success: false,
                message: "Phone number is required"
            });
        }

        const [existing] = await pool.execute(
            `SELECT id, phone, name, status, phone_verified_at
             FROM drivers
             WHERE phone = ?
             LIMIT 1`,
            [phone]
        );

        if (existing.length > 0) {
            return res.status(200).json({
                success: true,
                message: "Driver already registered",
                data: existing[0],
                dummy_otp: "123455"
            });
        }

        // Dummy OTP
        const otp = "123455";

        const [result] = await pool.execute(
            `INSERT INTO drivers (
                name,
                phone,
                otp_code,
                otp_expires_at,
                status,
                is_online
            )
            VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 10 MINUTE), 'approved', 0)`,
            [name, phone, otp]
        );

        const [drivers] = await pool.execute(
            `SELECT id, phone, name, email,
                    profile_photo, date_of_birth,
                    address, city,
                    driving_license_number,
                    license_expiry_date,
                    license_document,
                    status,
                    is_online,
                    phone_verified_at,
                    created_at,
                    updated_at
             FROM drivers
             WHERE id = ?
             LIMIT 1`,
            [result.insertId]
        );

        return res.status(201).json({
            success: true,
            message: "Driver registered. Please verify OTP.",
            data: drivers[0],

            // REMOVE THIS IN PRODUCTION
            dummy_otp: "123455"
        });

    } catch (error) {
        console.error("❌ Driver registration error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to register driver",
            error: error.message
        });
    }
});

router.post("/driver/verify-otp", async (req, res) => {
    try {
        const { phone, otp } = req.body;

        if (!phone || !otp) {
            return res.status(400).json({
                success: false,
                message: "Phone and OTP are required"
            });
        }

        // Find driver
        const [drivers] = await pool.execute(
            `SELECT id,
                    phone,
                    name,
                    email,
                    profile_photo,
                    date_of_birth,
                    address,
                    city,
                    driving_license_number,
                    license_expiry_date,
                    license_document,
                    status,
                    is_online,
                    phone_verified_at
             FROM drivers
             WHERE phone = ?
             LIMIT 1`,
            [phone]
        );

        if (drivers.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Driver not found"
            });
        }

        const driver = drivers[0];

        // Dummy OTP
        if (otp !== "123455") {
            return res.status(400).json({
                success: false,
                message: "Invalid OTP"
            });
        }

        // Mark phone verified
        await pool.execute(
            `UPDATE drivers
             SET phone_verified_at = NOW()
             WHERE id = ?`,
            [driver.id]
        );

        /*
         * Check admin approval
         *
         * If driver is NOT approved,
         * verify phone but don't generate token.
         */
        if (driver.status !== "approved") {
            return res.status(200).json({
                success: true,
                message: "Phone verified successfully. Waiting for admin approval.",
                login: false,
                data: {
                    id: driver.id,
                    phone: driver.phone,
                    status: driver.status,
                    phone_verified: true
                }
            });
        }

        // Generate JWT token
        const token = jwt.sign(
            {
                id: driver.id,
                phone: driver.phone,
                role: "driver"
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "30d"
            }
        );

        return res.status(200).json({
            success: true,
            message: "Phone verified and driver logged in successfully",
            login: true,
            data: {
                id: driver.id,
                phone: driver.phone,
                name: driver.name,
                email: driver.email,
                profile_photo: driver.profile_photo,
                status: driver.status,
                is_online: driver.is_online,
                phone_verified: true,
                token: token,
            }
        });

    } catch (error) {
        console.error("❌ Driver OTP verification error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to verify OTP",
            error: error.message
        });
    }
});


router.post("/driver/logout", authenticateToken, async (req, res) => {
    try {
        const driverId = req.user.id;

        await pool.execute(
            `UPDATE drivers
             SET is_online = 0
             WHERE id = ?`,
            [driverId]
        );

        return res.status(200).json({
            success: true,
            message: "Driver logged out successfully"
        });

    } catch (error) {
        console.error("❌ Driver logout error:", error);

        return res.status(500).json({
            success: false,
            message: "Logout failed",
            error: error.message
        });
    }
});



router.patch("/drivers/me", async (req, res) => {
    try {
        const driverId = req.user.id;

        const {
            name,
            email,
            profile_photo,
            date_of_birth,
            address,
            city,
            driving_license_number,
            license_expiry_date,
            license_document
        } = req.body;

        // Check driver
        const [existing] = await pool.execute(
            `SELECT id
             FROM drivers
             WHERE id = ?
             LIMIT 1`,
            [driverId]
        );

        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Driver not found"
            });
        }

        const fields = [];
        const values = [];

        if (name !== undefined) {
            fields.push("name = ?");
            values.push(name);
        }

        if (email !== undefined) {
            fields.push("email = ?");
            values.push(email);
        }

        if (profile_photo !== undefined) {
            fields.push("profile_photo = ?");
            values.push(profile_photo);
        }

        if (date_of_birth !== undefined) {
            fields.push("date_of_birth = ?");
            values.push(date_of_birth);
        }

        if (address !== undefined) {
            fields.push("address = ?");
            values.push(address);
        }

        if (city !== undefined) {
            fields.push("city = ?");
            values.push(city);
        }

        if (driving_license_number !== undefined) {
            fields.push("driving_license_number = ?");
            values.push(driving_license_number);
        }

        if (license_expiry_date !== undefined) {
            fields.push("license_expiry_date = ?");
            values.push(license_expiry_date);
        }

        if (license_document !== undefined) {
            fields.push("license_document = ?");
            values.push(license_document);
        }

        if (fields.length === 0) {
            return res.status(400).json({
                success: false,
                message: "No fields provided for update"
            });
        }

        values.push(driverId);

        await pool.execute(
            `UPDATE drivers
             SET ${fields.join(", ")}
             WHERE id = ?`,
            values
        );

        // Return updated profile
        const [drivers] = await pool.execute(
            `SELECT id, phone, name, email, profile_photo,
                    date_of_birth, address, city,
                    driving_license_number, license_expiry_date,
                    license_document, status,
                    is_online,
                    current_latitude, current_longitude,
                    last_location_at, phone_verified_at,
                    created_at, updated_at
             FROM drivers
             WHERE id = ?
             LIMIT 1`,
            [driverId]
        );

        return res.status(200).json({
            success: true,
            message: "Driver profile updated successfully",
            data: drivers[0]
        });

    } catch (error) {
        console.error("❌ Driver profile update error:", error);

        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                success: false,
                message: "Email or driving license number already exists"
            });
        }

        return res.status(500).json({
            success: false,
            message: "Failed to update driver profile",
            error: error.message
        });
    }
});
router.get("/drivers/me", async (req, res) => {
    try {
        const driverId = req.user.id;

        const [drivers] = await pool.execute(
            `SELECT id, phone, name, email, profile_photo,
                    date_of_birth, address, city,
                    driving_license_number, license_expiry_date,
                    license_document, status,
                    is_online,
                    current_latitude, current_longitude,
                    last_location_at, phone_verified_at,
                    created_at, updated_at
             FROM drivers
             WHERE id = ?
             LIMIT 1`,
            [driverId]
        );

        if (drivers.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Driver not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Driver profile fetched successfully",
            data: drivers[0]
        });

    } catch (error) {
        console.error("❌ Get driver profile error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch driver profile",
            error: error.message
        });
    }
});

module.exports = router;