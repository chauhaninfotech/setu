const express = require("express");

const router = express.Router();

const {
    createReport,
    getReports
} = require("../controllers/reportController");

const uploadReportImage =
    require("../middleware/upload");

// POST /api/reports
router.post(
    "/reports",
    uploadReportImage.single("image"),
    createReport
);

// GET /api/reports
router.get(
    "/reports",
    getReports
);

module.exports = router;