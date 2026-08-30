const jwt = require("jsonwebtoken");
const pool = require("../config/db");

async function authenticateToken(req, res, next) {

    try {

        const authHeader = req.headers.authorization;

        if (!authHeader) {
            return res.status(401).json({
                success: false,
                message: "Authorization token required"
            });
        }

        const parts = authHeader.split(" ");

        if (parts.length !== 2 || parts[0] !== "Bearer") {
            return res.status(401).json({
                success: false,
                message: "Invalid authorization format"
            });
        }

        const token = parts[1];

        // Verify JWT
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        // Check whether token was logged out
        const [blacklisted] = await pool.execute(
            `SELECT id
             FROM auth_tokens
             WHERE token = ?
             LIMIT 1`,
            [token]
        );

        if (blacklisted.length > 0) {

            return res.status(401).json({
                success: false,
                message: "Token has been logged out"
            });

        }

        req.driver = decoded;

        next();

    } catch (error) {

        if (error.name === "TokenExpiredError") {

            return res.status(401).json({
                success: false,
                message: "Token expired"
            });

        }

        return res.status(401).json({
            success: false,
            message: "Invalid token"
        });
    }
}

module.exports = authenticateToken;