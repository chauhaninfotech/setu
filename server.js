const express = require("express");
const cors = require('cors');

const app = express();


app.use(cors({
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());

const driverRoutes = require("./routes/drivers");
const vehicleRoutes = require("./routes/vehicles");
const bookingRoutes = require("./routes/bookings");
const subscriptionRoutes = require("./routes/subscriptions");
const suggestionRoutes = require("./routes/suggestions");
const reportRoutes = require("./routes/reports");

app.use("/api", driverRoutes);
app.use("/api", vehicleRoutes);
app.use("/api", bookingRoutes);
app.use("/api", subscriptionRoutes);
app.use("/api", suggestionRoutes);
app.use("/api", reportRoutes);
app.use("/uploads",express.static("uploads"));

// Start server
app.listen(3000, async () => {

    console.log("🚀 Server running on http://localhost:3000");

    // try {

     
    //     const initializeDatabase = require("./database/init");

    //     await initializeDatabase();

    //     console.log(" Database initialization completed");

    // } catch (error) {

    //     console.error(" Database initialization failed");
    // }

});