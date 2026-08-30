const Subscription = require("../models/subscription");
const db = require("../config/db");

const getSubscriptions = async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT 
                id,
                name,
                price,
                description,
                status
             FROM subscriptions
             WHERE status = ?
             ORDER BY id ASC`,
            ["active"]
        );

        return res.status(200).json({
            success: true,
            message: "Subscriptions fetched successfully",
            data: rows
        });

    } catch (error) {
        console.error(
            "GET SUBSCRIPTIONS ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Unable to fetch subscriptions",
            error: error.message
        });
    }
};

module.exports = {
    getSubscriptions
};
