const pool = require("../config/db");

// =====================================================
// PURCHASE SUBSCRIPTION
// =====================================================

const purchaseSubscription = async (req, res) => {
    try {

        const driverId = req.headers["driver-id"];

        const {
            subscription_plan_id,
            payment_method
        } = req.body;

        // ==========================================
        // VALIDATE DRIVER
        // ==========================================

        if (!driverId) {
            return res.status(400).json({
                success: false,
                message: "driver-id header is required"
            });
        }

        // ==========================================
        // VALIDATE PLAN
        // ==========================================

        if (!subscription_plan_id) {
            return res.status(400).json({
                success: false,
                message: "subscription_plan_id is required"
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
        // GET SUBSCRIPTION PLAN
        // ==========================================

        const [plans] = await pool.execute(
            `
            SELECT
                id,
                name,
                price,
                duration_days,
                max_bookings,
                status
            FROM subscription_plans
            WHERE id = ?
            LIMIT 1
            `,
            [subscription_plan_id]
        );

        if (plans.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Subscription plan not found"
            });
        }

        const plan = plans[0];

        // ==========================================
        // CHECK PLAN ACTIVE
        // ==========================================

        if (
            plan.status !== 1 &&
            plan.status !== "1" &&
            plan.status !== "active"
        ) {
            return res.status(400).json({
                success: false,
                message: "Subscription plan is not active"
            });
        }

        // ==========================================
        // CHECK EXISTING ACTIVE SUBSCRIPTION
        // ==========================================

        const [activeSubscriptions] = await pool.execute(
            `
            SELECT id
            FROM driver_subscriptions
            WHERE driver_id = ?
            AND subscription_status = 'active'
            AND end_date >= NOW()
            ORDER BY id DESC
            LIMIT 1
            `,
            [driverId]
        );

        if (activeSubscriptions.length > 0) {
            return res.status(400).json({
                success: false,
                message: "Driver already has an active subscription"
            });
        }

        // ==========================================
        // DATES
        // ==========================================

        const startDate = new Date();

        const endDate = new Date(startDate);

        endDate.setDate(
            endDate.getDate() + Number(plan.duration_days)
        );

        // MySQL DATETIME format
        const mysqlStartDate =
            startDate.toISOString().slice(0, 19).replace("T", " ");

        const mysqlEndDate =
            endDate.toISOString().slice(0, 19).replace("T", " ");

        // ==========================================
        // CREATE SUBSCRIPTION
        // ==========================================

        const [result] = await pool.execute(
            `
            INSERT INTO driver_subscriptions (
                driver_id,
                subscription_plan_id,
                start_date,
                end_date,
                amount,
                payment_id,
                payment_method,
                payment_status,
                subscription_status
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
                driverId,
                plan.id,
                mysqlStartDate,
                mysqlEndDate,
                plan.price,
                null,
                payment_method ?? "online",
                "pending",
                "pending"
            ]
        );

        // ==========================================
        // GET CREATED SUBSCRIPTION
        // ==========================================

        const [subscriptions] = await pool.execute(
            `
            SELECT
                ds.*,
                sp.name AS plan_name,
                sp.duration_days,
                sp.max_bookings
            FROM driver_subscriptions ds
            INNER JOIN subscription_plans sp
                ON sp.id = ds.subscription_plan_id
            WHERE ds.id = ?
            LIMIT 1
            `,
            [result.insertId]
        );

        return res.status(201).json({
            success: true,
            message: "Subscription created. Complete payment to activate.",
            data: subscriptions[0]
        });

    } catch (error) {

        console.error(
            "PURCHASE SUBSCRIPTION ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Unable to purchase subscription",
            error: error.message
        });
    }
};


// =====================================================
// GET MY SUBSCRIPTION
// =====================================================

const getMySubscription = async (req, res) => {
    try {

        const driverId = req.headers["driver-id"];

        if (!driverId) {
            return res.status(400).json({
                success: false,
                message: "driver-id header is required"
            });
        }

        const [rows] = await pool.execute(
            `
            SELECT
                ds.*,
                sp.name AS plan_name,
                sp.description,
                sp.duration_days,
                sp.max_bookings
            FROM driver_subscriptions ds
            INNER JOIN subscription_plans sp
                ON sp.id = ds.subscription_plan_id
            WHERE ds.driver_id = ?
            ORDER BY ds.id DESC
            LIMIT 1
            `,
            [driverId]
        );

        if (rows.length === 0) {
            return res.status(200).json({
                success: true,
                message: "No subscription found",
                data: null
            });
        }

        return res.status(200).json({
            success: true,
            message: "Subscription fetched successfully",
            data: rows[0]
        });

    } catch (error) {

        console.error(
            "GET MY SUBSCRIPTION ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Unable to fetch subscription",
            error: error.message
        });
    }
};


module.exports = {
    purchaseSubscription,
    getMySubscription
};
