const express = require("express");

const authenticateToken =
    require("../middleware/auth");

const {
    purchaseSubscription,
    getMySubscription
} = require("../controllers/subscriptionController");

const router = express.Router();


// =====================================================
// GET SUBSCRIPTION PLANS
// =====================================================

router.get(
    "/subscription-plans",
    authenticateToken,
    async (req, res) => {

        try {

            const pool = require("../config/db");

            const [rows] = await pool.execute(
                `
                SELECT
                    id,
                    name,
                    price,
                    description,
                    duration_days,
                    max_bookings,
                    status
                FROM subscription_plans
                WHERE status = 1
                ORDER BY id ASC
                `
            );

            return res.status(200).json({
                success: true,
                message: "Subscription plans fetched successfully",
                data: rows
            });

        } catch (error) {

            console.error(
                "GET SUBSCRIPTION PLANS ERROR:",
                error
            );

            return res.status(500).json({
                success: false,
                message: "Unable to fetch subscription plans",
                error: error.message
            });
        }
    }
);


// =====================================================
// PURCHASE
// =====================================================

router.post(
    "/purchase-subscription",
    authenticateToken,
    purchaseSubscription
);


// =====================================================
// MY SUBSCRIPTION
// =====================================================

router.get(
    "/my-subscription",
    authenticateToken,
    getMySubscription
);


module.exports = router;
