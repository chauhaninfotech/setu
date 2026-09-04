const express = require("express");
const cors = require("cors");
const http = require("http");


const app = express();

// CORS FIRST
app.use(cors({
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));


app.use(express.json());

const server = http.createServer(app);

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

app.use("/uploads", express.static("uploads"));


const { Server } = require("socket.io");

function initSocket(server) {
    const io = new Server(server, {
        cors: {
            origin: true,
            methods: ["GET", "POST"]
        }
    });

    console.log("✅ Socket.IO initialized");

    return io;
}

module.exports = { initSocket };


const port = process.env.PORT || 3000;

server.listen(port, "0.0.0.0", () => {
    console.log(`Server running on port ${port}`);
});
