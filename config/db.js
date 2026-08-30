require("dotenv").config();

const mysql = require("mysql2/promise");

console.log("DB_HOST:", process.env.DB_HOST);
console.log("DB_USER:", process.env.DB_USER);
console.log("DB_NAME:", process.env.DB_NAME);

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306,

    waitForConnections: true,
    connectionLimit: 10
});

async function testDatabase() {
    try {
        const [rows] = await pool.query(`
            SELECT
                DATABASE() AS database_name,
                @@hostname AS hostname,
                @@port AS port
        `);

        console.log("✅ MySQL connected");
        console.log("📦 Database:", rows[0].database_name);
        console.log("🖥️ Host:", rows[0].hostname);
        console.log("🔌 Port:", rows[0].port);

    } catch (error) {
        console.error("❌ MySQL connection failed:");
        console.error(error.message);
    }
}

testDatabase();

module.exports = pool;