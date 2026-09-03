const express = require("express");
const cors = require('cors');
const http = require("http");
const { initSocket } = require("./socket");

const app = express();

app.use(express.json());

const server = http.createServer(app);
const io = initSocket(server);

// const io = new Server(server, {
//     cors: {
//         origin: "*",
//         methods: ["GET", "POST"]
//     }
// });


app.use(cors({
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'driver-id'],
}));



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






server.listen(3000, '0.0.0.0', () => {

    console.log("🚀 Server running on http://localhost:3000");

    // try {

     
    //     const initializeDatabase = require("./database/init");

    //     await initializeDatabase();

    //     console.log(" Database initialization completed");

    // } catch (error) {

    //     console.error(" Database initialization failed");
    // }

});