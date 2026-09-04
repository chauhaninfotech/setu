const express = require("express");
const bcrypt = require("bcrypt");
const pool = require("../config/db");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const authenticateToken = require("../middleware/auth");

const router = express.Router();

// ======================================================
// MULTER UPLOAD CONFIGURATION
// ======================================================

const uploadDir = path.join(
    __dirname,
    "../uploads/drivers"
);

// Create folder automatically
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, {
        recursive: true
    });
}

const storage = multer.diskStorage({

    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },

    filename: function (req, file, cb) {

        const ext =
            path.extname(file.originalname);

        const filename =
            `${Date.now()}-${Math.round(
                Math.random() * 1E9
            )}${ext}`;

        cb(null, filename);
    }
});

const upload = multer({
    storage: storage
});


router.post("/driver/login", async (req, res) => {
    try {
        const { mobile } = req.body;

        if (!mobile) {
            return res.status(400).json({
                success: false,
                message: "mobile number is required"
            });
        }

        // Find driver
        const [drivers] = await pool.execute(
            `SELECT id,
                    mobile,
                    name,
                    email,
                    profile_photo,
                    status,
                    is_online,
                    mobile_verified_at
             FROM drivers
             WHERE mobile = ?
             LIMIT 1`,
            [mobile]
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
                mobile: driver.mobile,
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
            mobile,
            mobile_verified_at,
            email,
            password,
            profile_photo,
            date_of_birth,
            address,
            city,
            driving_license_number,
            license_expiry,
            license_document,
            status,
            is_online,
            current_latitude,
            current_longitude,
            last_location_at
        } = req.body;

        // Required fields
        if (!name || !mobile || !driving_license_number) {
            return res.status(400).json({
                success: false,
                message: "name, mobile and driving_license_number are required"
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
                mobile,
                mobile_verified_at,
                email,
                password_hash,
                profile_photo,
                date_of_birth,
                address,
                city,
                driving_license_number,
                license_expiry,
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
                mobile,
                mobile_verified_at || null,
                email || null,
                password_hash,
                profile_photo || null,
                date_of_birth || null,
                address || null,
                city || null,
                driving_license_number,
                license_expiry || null,
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
                mobile,
                mobile_verified_at,
                email,
                profile_photo,
                date_of_birth,
                address,
                city,
                driving_license_number,
                license_expiry,
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
                message: "mobile, email, or driving license number already exists"
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
                mobile,
                email,
                profile_photo,
                date_of_birth,
                address,
                city,
                driving_license_number,
                license_expiry,
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



router.post(
    "/driver/upload-detail/basic",

    upload.fields([
        {
            name: "profile_photo",
            maxCount: 1
        }
    ]),

    async (req, res) => {
        try {
            console.log("BODY:", req.body);
            console.log("FILES:", req.files);

            const driverId =
                req.headers["driver-id"];

            if (!driverId) {
                return res.status(401).json({
                    success: false,
                    message: "Driver ID is required"
                });
            }

            const name =
                req.body?.name || "";

            const mobile =
                req.body?.mobile || "";

            const email =
                req.body?.email || "";

            let profilePhoto = null;

            if (
                req.files &&
                req.files.profile_photo &&
                req.files.profile_photo.length > 0
            ) {
                profilePhoto =
                    req.files.profile_photo[0].filename;
            }


            // ==========================================
            // UPDATE DRIVER
            // ==========================================

            if (profilePhoto) {

                await pool.execute(
                    `
                    UPDATE drivers
                    SET
                        name = ?,
                        mobile = ?,
                        email = ?,
                        profile_photo = ?,
                        updated_at = NOW()
                    WHERE id = ?
                    `,
                    [
                        name,
                        mobile,
                        email || null,
                        profilePhoto,
                        driverId
                    ]
                );

            } else {

                await pool.execute(
                    `
                    UPDATE drivers
                    SET
                        name = ?,
                        mobile = ?,
                        email = ?,
                        updated_at = NOW()
                    WHERE id = ?
                    `,
                    [
                        name,
                        mobile,
                        email || null,
                        driverId
                    ]
                );
            }

            return res.status(200).json({
                success: true,
                message:
                    "Basic information updated successfully"
            });

        } catch (error) {

            console.error(
                "Basic information update error:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Failed to update basic information"
            });
        }
    }
);

router.post(
    "/driver/upload-detail/driver",
    upload.fields([
        {
            name: "aadhaar_photo",
            maxCount: 1
        },
        {
            name: "driving_license_photo",
            maxCount: 1
        }
    ]),
    async (req, res) => {

        try {
            const driverId =
                req.headers["driver-id"];

            if (!driverId) {
                return res.status(401).json({
                    success: false,
                    message: "Driver ID is required"
                });
            }

            const {
                aadhaar_number,
                driver_name,
                driving_license_number,
                license_expiry
            } = req.body;

            console.log("BODY:", req.body);
            console.log("FILES:", req.files);

            // Your database update here

        } catch (error) {
            console.error(
                "Driver update error:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Failed to update driver information"
            });
        }
    }
);
router.post(
    "/driver/upload-detail/vehicle",
    upload.fields([
        {
            name: "rc_photo",
            maxCount: 1
        }
    ]),
    async (req, res) => {
        try {
            // ==========================================
            // DRIVER ID
            // ==========================================

            const driverId =
                req.headers["driver-id"];

            if (!driverId) {
                return res.status(401).json({
                    success: false,
                    message: "Driver ID is required"
                });
            }

            // ==========================================
            // FORM DATA
            // ==========================================

            const {
                vehicle_number,
                vehicle_type,
                rc_number,
                insurance_number,
                insurance_expiry
            } = req.body;

            console.log("Vehicle body:", req.body);
            console.log("Vehicle files:", req.files);

            // ==========================================
            // CHECK DRIVER
            // ==========================================

            const [drivers] = await pool.execute(
                `
                SELECT id
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

            // ==========================================
            // CHECK VEHICLE
            // ==========================================

            const [vehicles] = await pool.execute(
                `
                SELECT id, rc_photo
                FROM vehicles
                WHERE driver_id = ?
                LIMIT 1
                `,
                [driverId]
            );

            if (vehicles.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Vehicle not found"
                });
            }

            const vehicleId =
                vehicles[0].id;

            // ==========================================
            // RC PHOTO
            // ==========================================

            let rcPhoto =
                vehicles[0].rc_photo;

            if (
                req.files &&
                req.files.rc_photo &&
                req.files.rc_photo.length > 0
            ) {
                rcPhoto =
                    req.files.rc_photo[0].filename;
            }

            // ==========================================
            // UPDATE VEHICLE
            // ==========================================

            await pool.execute(
                `
                UPDATE vehicles
                SET
                    vehicle_number = ?,
                    vehicle_type = ?,
                    rc_number = ?,
                    rc_photo = ?,
                    insurance_number = ?,
                    insurance_expiry = ?,
                    updated_at = NOW()
                WHERE id = ?
                `,
                [
                    vehicle_number || null,
                    vehicle_type || null,
                    rc_number || null,
                    rcPhoto,
                    insurance_number || null,
                    insurance_expiry || null,
                    vehicleId
                ]
            );

            // ==========================================
            // GET UPDATED VEHICLE
            // ==========================================

            const [updatedVehicle] =
                await pool.execute(
                    `
                    SELECT
                        id,
                        driver_id,
                        vehicle_number,
                        vehicle_type,
                        rc_number,
                        rc_photo,
                        insurance_number,
                        insurance_expiry,
                        updated_at
                    FROM vehicles
                    WHERE id = ?
                    LIMIT 1
                    `,
                    [vehicleId]
                );

            // ==========================================
            // SUCCESS
            // ==========================================

            return res.status(200).json({
                success: true,
                message:
                    "Vehicle information updated successfully",
                data: updatedVehicle[0]
            });

        } catch (error) {
            console.error(
                "Vehicle update error:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Failed to update vehicle information"
            });
        }
    }
);
router.post(
    "/driver/upload-detail/vehicle-owner",
    async (req, res) => {
        try {
            const driverId = req.headers["driver-id"];

            const {
                owner_mobile,
                owner_name
            } = req.body;

            // ==========================================
            // VALIDATE DRIVER
            // ==========================================

            if (!driverId) {
                return res.status(401).json({
                    success: false,
                    message: "Driver ID is required"
                });
            }

            // ==========================================
            // VALIDATE DATA
            // ==========================================

            if (!owner_mobile || !owner_name) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Owner mobile and owner name are required"
                });
            }

            // ==========================================
            // CHECK DRIVER
            // ==========================================

            const [drivers] = await pool.execute(
                `
                SELECT id
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

            // ==========================================
            // CHECK VEHICLE
            // ==========================================

            const [vehicles] = await pool.execute(
                `
                SELECT id
                FROM vehicles
                WHERE driver_id = ?
                LIMIT 1
                `,
                [driverId]
            );

            if (vehicles.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Vehicle not found"
                });
            }

            const vehicleId = vehicles[0].id;

            // ==========================================
            // UPDATE VEHICLE OWNER
            // ==========================================

            await pool.execute(
                `
                UPDATE vehicles
                SET
                    owner_mobile = ?,
                    owner_name = ?,
                    updated_at = NOW()
                WHERE id = ?
                `,
                [
                    owner_mobile,
                    owner_name,
                    vehicleId
                ]
            );

            // ==========================================
            // SUCCESS
            // ==========================================

            return res.status(200).json({
                success: true,
                message:
                    "Vehicle owner information updated successfully",
                data: {
                    vehicle_id: vehicleId,
                    owner_mobile,
                    owner_name
                }
            });

        } catch (error) {
            console.error(
                "Vehicle owner update error:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Failed to update vehicle owner information"
            });
        }
    }
);
router.post(
    "/driver/upload-detail/permit",
    upload.fields([
        {
            name: "permit_photo",
            maxCount: 1
        }
    ]),
    async (req, res) => {
        try {
            // ==========================================
            // DRIVER ID
            // ==========================================

            const driverId =
                req.headers["driver-id"];

            if (!driverId) {
                return res.status(401).json({
                    success: false,
                    message: "Driver ID is required"
                });
            }

            // ==========================================
            // CHECK DRIVER
            // ==========================================

            const [drivers] = await pool.execute(
                `
                SELECT id
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

            // ==========================================
            // CHECK VEHICLE
            // ==========================================

            const [vehicles] = await pool.execute(
                `
                SELECT id, permit_photo
                FROM vehicles
                WHERE driver_id = ?
                LIMIT 1
                `,
                [driverId]
            );

            if (vehicles.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Vehicle not found"
                });
            }

            const vehicleId =
                vehicles[0].id;

            // ==========================================
            // CHECK PHOTO
            // ==========================================

            if (
                !req.files ||
                !req.files.permit_photo ||
                req.files.permit_photo.length === 0
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Permit photo is required"
                });
            }

            const permitPhoto =
                req.files.permit_photo[0].filename;

            // ==========================================
            // UPDATE
            // ==========================================

            await pool.execute(
                `
                UPDATE vehicles
                SET
                    permit_photo = ?,
                    updated_at = NOW()
                WHERE id = ?
                `,
                [
                    permitPhoto,
                    vehicleId
                ]
            );

            // ==========================================
            // SUCCESS
            // ==========================================

            return res.status(200).json({
                success: true,
                message:
                    "Permit photo uploaded successfully",
                data: {
                    vehicle_id: vehicleId,
                    permit_photo: permitPhoto
                }
            });

        } catch (error) {
            console.error(
                "Permit upload error:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Failed to upload permit photo"
            });
        }
    }
);
router.post(
    "/driver/upload-detail/other-document",
    upload.fields([
        {
            name: "other_document_photo",
            maxCount: 1
        }
    ]),
    async (req, res) => {
        try {
            // ==========================================
            // DRIVER ID
            // ==========================================

            const driverId =
                req.headers["driver-id"];

            if (!driverId) {
                return res.status(401).json({
                    success: false,
                    message: "Driver ID is required"
                });
            }

            // ==========================================
            // CHECK DRIVER
            // ==========================================

            const [drivers] = await pool.execute(
                `
                SELECT id
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

            // ==========================================
            // CHECK VEHICLE
            // ==========================================

            const [vehicles] = await pool.execute(
                `
                SELECT id, other_document_photo
                FROM vehicles
                WHERE driver_id = ?
                LIMIT 1
                `,
                [driverId]
            );

            if (vehicles.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Vehicle not found"
                });
            }

            const vehicleId =
                vehicles[0].id;

            // ==========================================
            // CHECK FILE
            // ==========================================

            if (
                !req.files ||
                !req.files.other_document_photo ||
                req.files.other_document_photo.length === 0
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Other document photo is required"
                });
            }

            const documentPhoto =
                req.files.other_document_photo[0].filename;

            // ==========================================
            // UPDATE DATABASE
            // ==========================================

            await pool.execute(
                `
                UPDATE vehicles
                SET
                    other_document_photo = ?,
                    updated_at = NOW()
                WHERE id = ?
                `,
                [
                    documentPhoto,
                    vehicleId
                ]
            );

            // ==========================================
            // SUCCESS
            // ==========================================

            return res.status(200).json({
                success: true,
                message:
                    "Other document uploaded successfully",
                data: {
                    vehicle_id: vehicleId,
                    other_document_photo:
                        documentPhoto
                }
            });

        } catch (error) {
            console.error(
                "Other document upload error:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Failed to upload other document"
            });
        }
    }
);
router.post(
    "/driver/upload-detail/other-detail",
    async (req, res) => {
        try {
            const driverId = req.headers["driver-id"];

            if (!driverId) {
                return res.status(401).json({
                    success: false,
                    message: "Driver ID is required"
                });
            }

            const { other_detail } = req.body;

            // Find vehicle belonging to driver
            const [vehicles] = await pool.execute(
                `
                SELECT id
                FROM vehicles
                WHERE driver_id = ?
                LIMIT 1
                `,
                [driverId]
            );

            if (vehicles.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Vehicle not found"
                });
            }

            const vehicleId = vehicles[0].id;

            // Update other detail
            await pool.execute(
                `
                UPDATE vehicles
                SET
                    other_detail = ?,
                    updated_at = NOW()
                WHERE id = ?
                `,
                [
                    other_detail?.trim() || null,
                    vehicleId
                ]
            );

            return res.status(200).json({
                success: true,
                message: "Other detail updated successfully",
                data: {
                    vehicle_id: vehicleId,
                    other_detail: other_detail?.trim() || null
                }
            });

        } catch (error) {
            console.error(
                "Other detail error:",
                error
            );

            return res.status(500).json({
                success: false,
                message: "Failed to update other detail"
            });
        }
    }
);


router.get("/driver/upload-detail", async (req, res) => {
    try {
        const driverId = req.headers["driver-id"];

        const [drivers] = await pool.execute(
    `SELECT
        d.id,
        d.name,
        d.driver_name,
        d.mobile,
        d.mobile_verified_at,
        d.email,
        d.profile_photo,
        d.aadhaar_photo,
        d.aadhaar_number,
        d.date_of_birth,
        d.address,
        d.city,
        d.driving_license_number,
        d.license_expiry,
        d.license_document,
        d.status,
        d.is_online,
        d.current_latitude,
        d.current_longitude,
        d.last_location_at,
        d.created_at,
        d.updated_at,

        v.owner_name,
        v.owner_mobile,
        v.id AS vehicle_id,
        v.vehicle_number,
        v.vehicle_type,
        v.rc_number,
        v.rc_photo,
        v.insurance_number,
        v.insurance_expiry,
        v.insurance_document,
        v.status AS vehicle_status,
        v.other_document_photo,
        v.other_detail,
        v.created_at AS vehicle_created_at,
        v.updated_at AS vehicle_updated_at

    FROM drivers d

    INNER JOIN vehicles v
        ON v.driver_id = d.id

    WHERE d.id = ?

    LIMIT 1`,
    [driverId]
);

if (drivers.length === 0) {
    return res.status(404).json({
        success: false,
        message: "Driver or vehicle not found"
    });
}

const driver = drivers[0];

return res.json({
    success: true,
    data: driver
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

router.get("/drivers/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const [drivers] = await pool.execute(
            `SELECT
                id,
                name,
                mobile,
                mobile_verified_at,
                email,
                profile_photo,
                date_of_birth,
                address,
                city,
                driving_license_number,
                license_expiry,
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
        mobile,
        mobile_verified_at,
        email,
        password,
        password_hash,
        profile_photo,
        date_of_birth,
        address,
        city,
        driving_license_number,
        license_expiry,
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
                mobile = ?,
                mobile_verified_at = ?,
                email = ?,
                password_hash = ?,
                profile_photo = ?,
                date_of_birth = ?,
                address = ?,
                city = ?,
                driving_license_number = ?,
                license_expiry = ?,
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
            mobile,
            mobile_verified_at ?? null,
            email ?? null,
            newPasswordHash,
            profile_photo ?? null,
            date_of_birth ?? null,
            address ?? null,
            city ?? null,
            driving_license_number,
            license_expiry ?? null,
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
                mobile,
                mobile_verified_at,
                email,
                profile_photo,
                date_of_birth,
                address,
                city,
                driving_license_number,
                license_expiry,
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
                message: "mobile, email, or driving license number already exists"
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
        const { name, mobile } = req.body;

        if (!mobile) {
            return res.status(400).json({
                success: false,
                message: "mobile number is required"
            });
        }

        const [existing] = await pool.execute(
            `SELECT id, mobile, name, status, mobile_verified_at
             FROM drivers
             WHERE mobile = ?
             LIMIT 1`,
            [mobile]
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
                mobile,
                otp_code,
                otp_expires_at,
                status,
                is_online
            )
            VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 10 MINUTE), 'approved', 0)`,
            [name, mobile, otp]
        );

        const [drivers] = await pool.execute(
            `SELECT id, mobile, name, email,
                    profile_photo, date_of_birth,
                    address, city,
                    driving_license_number,
                    license_expiry,
                    license_document,
                    status,
                    is_online,
                    mobile_verified_at,
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
        const { mobile, otp } = req.body;

        if (!mobile || !otp) {
            return res.status(400).json({
                success: false,
                message: "mobile and OTP are required"
            });
        }

        // Find driver
        const [drivers] = await pool.execute(
            `SELECT id,
                    mobile,
                    name,
                    email,
                    profile_photo,
                    date_of_birth,
                    address,
                    city,
                    driving_license_number,
                    license_expiry,
                    license_document,
                    status,
                    is_online,
                    mobile_verified_at
             FROM drivers
             WHERE mobile = ?
             LIMIT 1`,
            [mobile]
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

        // Mark mobile verified
        await pool.execute(
            `UPDATE drivers
             SET mobile_verified_at = NOW()
             WHERE id = ?`,
            [driver.id]
        );

        /*
         * Check admin approval
         *
         * If driver is NOT approved,
         * verify mobile but don't generate token.
         */
        if (driver.status !== "approved") {
            return res.status(200).json({
                success: true,
                message: "mobile verified successfully. Waiting for admin approval.",
                login: false,
                data: {
                    id: driver.id,
                    mobile: driver.mobile,
                    status: driver.status,
                    mobile_verified: true
                }
            });
        }

        // Generate JWT token
        const token = jwt.sign(
            {
                id: driver.id,
                mobile: driver.mobile,
                role: "driver"
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "30d"
            }
        );

        return res.status(200).json({
            success: true,
            message: "mobile verified and driver logged in successfully",
            login: true,
            data: {
                id: driver.id,
                mobile: driver.mobile,
                name: driver.name,
                email: driver.email,
                profile_photo: driver.profile_photo,
                status: driver.status,
                is_online: driver.is_online,
                mobile_verified: true,
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
        const driverId = req.headers["driver-id"];
        const {
            name,
            email,
            profile_photo,
            date_of_birth,
            address,
            city,
            driving_license_number,
            license_expiry,
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

        if (license_expiry !== undefined) {
            fields.push("license_expiry = ?");
            values.push(license_expiry);
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
            `SELECT id, mobile, name, email, profile_photo,
                    date_of_birth, address, city,
                    driving_license_number, license_expiry,
                    license_document, status,
                    is_online,
                    current_latitude, current_longitude,
                    last_location_at, mobile_verified_at,
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
            `SELECT id, mobile, name, email, profile_photo,
                    date_of_birth, address, city,
                    driving_license_number, license_expiry,
                    license_document, status,
                    is_online,
                    current_latitude, current_longitude,
                    last_location_at, mobile_verified_at,
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