const express = require("express");

const router = express.Router();

const {
    createSuggestion,
    getSuggestions
} = require("../controllers/suggestionController");

// POST /api/suggestions
router.post(
    "/suggestions",
    createSuggestion
);

// GET /api/suggestions
router.get(
    "/suggestions",
    getSuggestions
);

module.exports = router;