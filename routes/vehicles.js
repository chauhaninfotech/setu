const express = require("express");

const pool = require("../config/db");

const router = express.Router();


// =====================================================
// POST - Add Vehicle
// =====================================================

router.post("/vehicles", async (req, res) => {

    try {

        const {
            driver_id,
            vehicle_type,
            make,
            model,
            variant,
            registration_number,
            color,
            manufacturing_year,
            fuel_type,
            seating_capacity,
            vehicle_photo,
            registration_document,
            insurance_document,
            permit_document,
            registration_expiry_date,
            insurance_expiry_date,
            permit_expiry_date,
            status,
            availability_status
        } = req.body;


        // Required fields
        if (!driver_id || !vehicle_type || !registration_number) {

            return res.status(400).json({
                success: false,
                message: "driver_id, vehicle_type and registration_number are required"
            });

        }


        // Check driver exists
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


        // Insert vehicle
        const [result] = await pool.execute(
            `INSERT INTO vehicles (
                driver_id,
                vehicle_type,
                make,
                model,
                variant,
                registration_number,
                color,
                manufacturing_year,
                fuel_type,
                seating_capacity,
                vehicle_photo,
                registration_document,
                insurance_document,
                permit_document,
                registration_expiry_date,
                insurance_expiry_date,
                permit_expiry_date,
                status,
                availability_status
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                driver_id,
                vehicle_type,
                make ?? null,
                model ?? null,
                variant ?? null,
                registration_number,
                color ?? null,
                manufacturing_year ?? null,
                fuel_type ?? null,
                seating_capacity ?? null,
                vehicle_photo ?? null,
                registration_document ?? null,
                insurance_document ?? null,
                permit_document ?? null,
                registration_expiry_date ?? null,
                insurance_expiry_date ?? null,
                permit_expiry_date ?? null,
                status ?? "pending",
                availability_status ?? "offline"
            ]
        );


        // Get created vehicle
        const [vehicles] = await pool.execute(
            `SELECT *
             FROM vehicles
             WHERE id = ?
             LIMIT 1`,
            [result.insertId]
        );


        return res.status(201).json({
            success: true,
            message: "Vehicle added successfully",
            data: vehicles[0]
        });


    } catch (error) {

        console.error("❌ Vehicle insert error:", error);


        if (error.code === "ER_DUP_ENTRY") {

            return res.status(409).json({
                success: false,
                message: "Registration number already exists"
            });

        }


        return res.status(500).json({
            success: false,
            message: "Failed to add vehicle",
            error: error.message
        });

    }

});



// =====================================================
// GET - Vehicle List
// =====================================================

router.get("/vehicles", async (req, res) => {

    try {

        const [vehicles] = await pool.execute(
            `SELECT *
             FROM vehicles
             ORDER BY id DESC`
        );


        return res.status(200).json({
            success: true,
            message: "Vehicles fetched successfully",
            data: vehicles
        });


    } catch (error) {

        console.error("❌ Get vehicles error:", error);


        return res.status(500).json({
            success: false,
            message: "Failed to fetch vehicles",
            error: error.message
        });

    }

});



// =====================================================
// GET - Single Vehicle
// =====================================================

router.get("/vehicles/:id", async (req, res) => {

    try {

        const { id } = req.params;


        const [vehicles] = await pool.execute(
            `SELECT *
             FROM vehicles
             WHERE id = ?
             LIMIT 1`,
            [id]
        );


        if (vehicles.length === 0) {

            return res.status(404).json({
                success: false,
                message: "Vehicle not found"
            });

        }


        return res.status(200).json({
            success: true,
            message: "Vehicle fetched successfully",
            data: vehicles[0]
        });


    } catch (error) {

        console.error("❌ Get vehicle error:", error);


        return res.status(500).json({
            success: false,
            message: "Failed to fetch vehicle",
            error: error.message
        });

    }

});



// =====================================================
// GET - Vehicles by Driver ID
// =====================================================

router.get("/drivers/:driver_id/vehicles", async (req, res) => {

    try {

        const { driver_id } = req.params;


        const [vehicles] = await pool.execute(
            `SELECT *
             FROM vehicles
             WHERE driver_id = ?
             ORDER BY id DESC`,
            [driver_id]
        );


        return res.status(200).json({
            success: true,
            message: "Driver vehicles fetched successfully",
            driver_id: driver_id,
            data: vehicles
        });


    } catch (error) {

        console.error("❌ Get driver vehicles error:", error);


        return res.status(500).json({
            success: false,
            message: "Failed to fetch driver vehicles",
            error: error.message
        });

    }

});



// =====================================================
// PUT - Update Vehicle
// =====================================================

router.put("/vehicles/:id", async (req, res) => {

    const vehicleId = req.params.id;


    const {
        driver_id,
        vehicle_type,
        make,
        model,
        variant,
        registration_number,
        color,
        manufacturing_year,
        fuel_type,
        seating_capacity,
        vehicle_photo,
        registration_document,
        insurance_document,
        permit_document,
        registration_expiry_date,
        insurance_expiry_date,
        permit_expiry_date,
        status,
        availability_status
    } = req.body;


    try {

        // Check vehicle exists
        const [existingVehicle] = await pool.execute(
            `SELECT id
             FROM vehicles
             WHERE id = ?
             LIMIT 1`,
            [vehicleId]
        );


        if (existingVehicle.length === 0) {

            return res.status(404).json({
                success: false,
                message: "Vehicle not found"
            });

        }


        // Check driver if driver_id is supplied
        if (driver_id) {

            const [driver] = await pool.execute(
                `SELECT id
                 FROM drivers
                 WHERE id = ?
                 LIMIT 1`,
                [driver_id]
            );


            if (driver.length === 0) {

                return res.status(404).json({
                    success: false,
                    message: "Driver not found"
                });

            }

        }


        const sql = `
            UPDATE vehicles SET
                driver_id = ?,
                vehicle_type = ?,
                make = ?,
                model = ?,
                variant = ?,
                registration_number = ?,
                color = ?,
                manufacturing_year = ?,
                fuel_type = ?,
                seating_capacity = ?,
                vehicle_photo = ?,
                registration_document = ?,
                insurance_document = ?,
                permit_document = ?,
                registration_expiry_date = ?,
                insurance_expiry_date = ?,
                permit_expiry_date = ?,
                status = ?,
                availability_status = ?
            WHERE id = ?
        `;


        const values = [
            driver_id,
            vehicle_type,
            make ?? null,
            model ?? null,
            variant ?? null,
            registration_number,
            color ?? null,
            manufacturing_year ?? null,
            fuel_type ?? null,
            seating_capacity ?? null,
            vehicle_photo ?? null,
            registration_document ?? null,
            insurance_document ?? null,
            permit_document ?? null,
            registration_expiry_date ?? null,
            insurance_expiry_date ?? null,
            permit_expiry_date ?? null,
            status ?? "pending",
            availability_status ?? "offline",
            vehicleId
        ];


        await pool.execute(sql, values);


        // Get updated vehicle
        const [vehicles] = await pool.execute(
            `SELECT *
             FROM vehicles
             WHERE id = ?
             LIMIT 1`,
            [vehicleId]
        );


        return res.status(200).json({
            success: true,
            message: "Vehicle updated successfully",
            data: vehicles[0]
        });


    } catch (error) {

        console.error("❌ Vehicle update error:", error);


        if (error.code === "ER_DUP_ENTRY") {

            return res.status(409).json({
                success: false,
                message: "Registration number already exists"
            });

        }


        return res.status(500).json({
            success: false,
            message: "Failed to update vehicle",
            error: error.message
        });

    }

});



// =====================================================
// PATCH - Partial Vehicle Update
// =====================================================

router.patch("/vehicles/:id", async (req, res) => {

    const vehicleId = req.params.id;

    const allowedFields = [
        "driver_id",
        "vehicle_type",
        "make",
        "model",
        "variant",
        "registration_number",
        "color",
        "manufacturing_year",
        "fuel_type",
        "seating_capacity",
        "vehicle_photo",
        "registration_document",
        "insurance_document",
        "permit_document",
        "registration_expiry_date",
        "insurance_expiry_date",
        "permit_expiry_date",
        "status",
        "availability_status"
    ];


    try {

        const [existingVehicle] = await pool.execute(
            `SELECT id
             FROM vehicles
             WHERE id = ?
             LIMIT 1`,
            [vehicleId]
        );


        if (existingVehicle.length === 0) {

            return res.status(404).json({
                success: false,
                message: "Vehicle not found"
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
        if (req.body.driver_id !== undefined) {

            const [driver] = await pool.execute(
                `SELECT id
                 FROM drivers
                 WHERE id = ?
                 LIMIT 1`,
                [req.body.driver_id]
            );


            if (driver.length === 0) {

                return res.status(404).json({
                    success: false,
                    message: "Driver not found"
                });

            }

        }


        values.push(vehicleId);


        await pool.execute(
            `UPDATE vehicles
             SET ${fields.join(", ")}
             WHERE id = ?`,
            values
        );


        const [vehicles] = await pool.execute(
            `SELECT *
             FROM vehicles
             WHERE id = ?
             LIMIT 1`,
            [vehicleId]
        );


        return res.status(200).json({
            success: true,
            message: "Vehicle updated successfully",
            data: vehicles[0]
        });


    } catch (error) {

        console.error("❌ Vehicle PATCH error:", error);


        if (error.code === "ER_DUP_ENTRY") {

            return res.status(409).json({
                success: false,
                message: "Registration number already exists"
            });

        }


        return res.status(500).json({
            success: false,
            message: "Failed to update vehicle",
            error: error.message
        });

    }

});



// =====================================================
// DELETE - Vehicle
// =====================================================

router.delete("/vehicles/:id", async (req, res) => {

    const vehicleId = req.params.id;


    try {

        const [existingVehicle] = await pool.execute(
            `SELECT id
             FROM vehicles
             WHERE id = ?
             LIMIT 1`,
            [vehicleId]
        );


        if (existingVehicle.length === 0) {

            return res.status(404).json({
                success: false,
                message: "Vehicle not found"
            });

        }


        await pool.execute(
            `DELETE FROM vehicles
             WHERE id = ?`,
            [vehicleId]
        );


        return res.status(200).json({
            success: true,
            message: "Vehicle deleted successfully",
            vehicle_id: vehicleId
        });


    } catch (error) {

        console.error("❌ Vehicle delete error:", error);


        return res.status(500).json({
            success: false,
            message: "Failed to delete vehicle",
            error: error.message
        });

    }

});


module.exports = router;