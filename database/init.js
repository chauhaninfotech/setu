const fs = require("fs");
const path = require("path");
const pool = require("../config/db");

async function initializeDatabase() {
    try {

        const driversSQL = fs.readFileSync(
            path.join(__dirname, "drivers.sql"),
            "utf8"
        );

        await pool.query(driversSQL);

        console.log("✅ Drivers table ready");


        const vehiclesSQL = fs.readFileSync(
            path.join(__dirname, "vehicles.sql"),
            "utf8"
        );

        await pool.query(vehiclesSQL);

        console.log("✅ Vehicles table ready");


        const bookingSQL = fs.readFileSync(
            path.join(__dirname, "booking.sql"),
            "utf8"
        );

        await pool.query(bookingSQL);

        console.log("✅ Booking table ready");

        const authTokenSQL = fs.readFileSync(
            path.join(__dirname, "auth_tokens.sql"),
            "utf8"
        );

        await pool.query(authTokenSQL);

        console.log("✅ Auth tokens table ready");


    } catch (error) {

        console.error("❌ Database initialization failed");
        console.error(error);

        process.exit(1);
    }
}

module.exports = initializeDatabase;