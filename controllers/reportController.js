const db = require("../config/db");

// ===============================
// CREATE REPORT
// POST /api/reports
// ===============================
const createReport = async (req, res) => {
    try {
        const {
            froud_driver_number,
            message
        } = req.body;

        const driverId = req.headers["driver-id"];

        console.log("CREATE REPORT DRIVER ID:", driverId);

        if (!driverId) {
            return res.status(401).json({
                success: false,
                message: "Driver ID is required"
            });
        }

        if (!message) {
            return res.status(400).json({
                success: false,
                message: "Message is required"
            });
        }

        let image = null;

        if (req.file) {
            image = `/uploads/reports/${req.file.filename}`;
        }

        const [result] = await db.query(
            `INSERT INTO reports
            (
                driver_id,
                froud_driver_number,
                message,
                image,
                status
            )
            VALUES (?, ?, ?, ?, 'pending')`,
            [
                driverId,
                froud_driver_number || null,
                message,
                image
            ]
        );

        return res.status(201).json({
            success: true,
            message: "Report submitted successfully",
            data: {
                id: result.insertId,
                driver_id: driverId,
                froud_driver_number:
                    froud_driver_number || null,
                message,
                image,
                status: "pending"
            }
        });

    } catch (error) {
        console.error("CREATE REPORT ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to submit report",
            error: error.message
        });
    }
};


// ===============================
// GET REPORTS
// GET /api/reports
// ===============================
const getReports = async (req, res) => {
    try {
        const driverId = req.headers["driver-id"];


        // --------------------------------
        // DRIVER ID REQUIRED
        // --------------------------------
        if (!driverId) {
            return res.status(401).json({
                success: false,
                message: "Driver ID is required"
            });
        }

        // --------------------------------
        // GET ONLY THIS DRIVER'S REPORTS
        // --------------------------------
        const [rows] = await db.query(
            `
            SELECT
                id,
                driver_id,
                froud_driver_number,
                message,
                image,
                status,
                admin_reply,
                created_at,
                updated_at
            FROM reports
            WHERE driver_id = ?
            ORDER BY id DESC
            `,
            [driverId]
        );

        // --------------------------------
        // IMAGE URL
        // --------------------------------
        const baseUrl =
            `${req.protocol}://${req.get("host")}`;

        const reports = rows.map((report) => ({
            ...report,

            image: report.image
                ? `${baseUrl}${report.image}`
                : null
        }));

        return res.status(200).json({
            success: true,
            message: "Reports fetched successfully",
            data: reports
        });

    } catch (error) {
        console.error("GET REPORTS ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to fetch reports",
            error: error.message
        });
    }
};


module.exports = {
    createReport,
    getReports
};