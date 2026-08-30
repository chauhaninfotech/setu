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

        const driverId =
            req.user?.id ||
            req.driver?.id;

        if (!message) {
            return res.status(400).json({
                success: false,
                message: "Message is required"
            });
        }

        // Uploaded image
        let image = null;

        if (req.file) {
            image =
                `/uploads/reports/${req.file.filename}`;
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
                driverId || null,
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
                driver_id: driverId || null,
                froud_driver_number:
                    froud_driver_number || null,
                message,
                image,
                status: "pending"
            }
        });

    } catch (error) {
        console.error(
            "CREATE REPORT ERROR:",
            error
        );

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
        const driverId =
            req.user?.id ||
            req.driver?.id;

        let query = `
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
        `;

        const params = [];

        if (driverId) {
            query += `
                WHERE driver_id = ?
            `;

            params.push(driverId);
        }

        query += `
            ORDER BY id DESC
        `;

        const [rows] = await db.query(
            query,
            params
        );

        // Add complete image URL
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
        console.error(
            "GET REPORTS ERROR:",
            error
        );

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