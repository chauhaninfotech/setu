const db = require("../config/db");

// ===============================
// CREATE SUGGESTION
// POST /api/suggestions
// ===============================
const createSuggestion = async (req, res) => {
    try {
        const {
            message
        } = req.body;

        // Driver ID should come from auth middleware
        const driverId = 6
            //req.user?.id ||
            //req.driver?.id;

        if (!message) {
            return res.status(400).json({
                success: false,
                message: "Message are required"
            });
        }

        const [result] = await db.query(
            `INSERT INTO suggestions
            (driver_id,  message, status)
            VALUES (?, ?, 'pending')`,
            [
                driverId || null,
                message
            ]
        );

        return res.status(201).json({
            success: true,
            message: "Suggestion submitted successfully",
            data: {
                id: result.insertId,
                driver_id: driverId || null,
                message,
                status: "pending"
            }
        });

    } catch (error) {
        console.error(
            "CREATE SUGGESTION ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Unable to submit suggestion",
            error: error.message
        });
    }
};


// ===============================
// GET SUGGESTIONS
// GET /api/suggestions
// ===============================
const getSuggestions = async (req, res) => {
    try {
        const driverId =
            req.user?.id ||
            req.driver?.id;

        let query = `
            SELECT
                id,
                driver_id,
                message,
                status,
                admin_reply,
                created_at,
                updated_at
            FROM suggestions
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

        return res.status(200).json({
            success: true,
            message: "Suggestions fetched successfully",
            data: rows
        });

    } catch (error) {
        console.error(
            "GET SUGGESTIONS ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Unable to fetch suggestions",
            error: error.message
        });
    }
};


module.exports = {
    createSuggestion,
    getSuggestions
};