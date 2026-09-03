const { Server } = require("socket.io");

let io = null;

function initSocket(server) {

    io = new Server(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST", "PUT", "PATCH", "DELETE"]
        }
    });

    io.on("connection", (socket) => {

        console.log("🟢 Socket connected:", socket.id);

        socket.on("join-driver", (data) => {

            const driverId = data?.driverId;

            if (!driverId) {
                console.log("❌ Driver ID missing");
                return;
            }

            const room = `driver_${driverId}`;

            socket.join(room);

            console.log(
                `🚗 Driver ${driverId} joined ${room}`
            );
        });

        socket.on("disconnect", () => {

            console.log(
                "🔴 Socket disconnected:",
                socket.id
            );

        });

    });

    console.log("✅ Socket.IO initialized");

    return io;
}

function getIO() {

    if (!io) {
        throw new Error(
            "Socket.IO has not been initialized"
        );
    }

    return io;
}

module.exports = {
    initSocket,
    getIO
};
