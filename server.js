const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

const app = express();

// DEBUG ALL REQUESTS
app.use((req, res, next) => {
    console.log("REQUEST:", req.method, req.originalUrl);
    console.log("ORIGIN:", req.headers.origin);
    console.log(
        "ACCESS CONTROL METHOD:",
        req.headers["access-control-request-method"]
    );
    console.log(
        "ACCESS CONTROL HEADERS:",
        req.headers["access-control-request-headers"]
    );

    next();
});

// CORS
const corsOptions = {
    origin: true,
    methods: [
        "GET",
        "POST",
        "PUT",
        "PATCH",
        "DELETE",
        "OPTIONS"
    ],
    allowedHeaders: [
        "Content-Type",
        "Authorization",
        "driver-id"
    ]
};

app.use(cors(corsOptions));

app.options("/{*splat}", cors(corsOptions));

app.use(express.json());

// ==========================================
// HTTP SERVER
// ==========================================

const server = http.createServer(app);

// ==========================================
// SOCKET.IO
// ==========================================

const io = new Server(server, {
    cors: {
        origin: true,
        methods: ["GET", "POST"]
    }
});

console.log("✅ Socket.IO initialized");

// ==========================================
// ROUTES
// ==========================================

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

// ==========================================
// UPLOADS
// ==========================================

app.use("/uploads", express.static("uploads"));

// ==========================================
// HEALTH CHECK
// ==========================================

app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "SETU API is running"
    });
});

// ==========================================
// START
// ==========================================

const port = process.env.PORT || 3000;

server.listen(port, "0.0.0.0", () => {
    console.log(`🚀 Server running on port ${port}`);
});
