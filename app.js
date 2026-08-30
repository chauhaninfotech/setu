const express = require("express");
const driverRoutes = require("./routes/drivers");

const app = express();

app.use(express.json());

app.use("/api", driverRoutes);

app.listen(3000, () => {
    console.log("Server running on port 3000");
});