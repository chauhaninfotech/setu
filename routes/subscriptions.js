const express = require("express");

const router = express.Router();

const {
    getSubscriptions
} = require("../controllers/subscriptionController");

router.get("/subscriptions", getSubscriptions);

module.exports = router;