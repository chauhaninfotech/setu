const Subscription = require("../models/subscription");

const getSubscriptions = async (req, res) => {
    try {
        const subscriptions = await Subscription.findAll({
            where: {
                status: "active"
            },
            attributes: [
                "id",
                "name",
                "price",
                "description",
                "status"
            ],
            order: [["id", "ASC"]]
        });

        res.status(200).json({
            success: true,
            message: "Subscriptions fetched successfully",
            data: subscriptions
        });

    } catch (error) {
        console.error("GET SUBSCRIPTIONS ERROR:", error);

        res.status(500).json({
            success: false,
            message: "Unable to fetch subscriptions",
            error: error.message
        });
    }
};

module.exports = {
    getSubscriptions
};
