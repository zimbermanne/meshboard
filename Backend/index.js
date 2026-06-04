require("dotenv").config();
const express = require("express");
const cors = require("cors");
const app = express();

const PORT = process.env.PORT || 8080;

// 1. HEALTH CHECKS
app.get("/health", (req, res) => res.status(200).json({ status: "ok" }));
app.get("/", (req, res) => res.status(200).send("MeshBoard API Live"));

// 2. MIDDLEWARE
app.use(cors({ origin: "*" }));
app.use(express.json());

// 3. THE "DASHBOARD PATH" FIX
const nodesRouter = require("./routes/nodes");
const statsRouter = require("./routes/stats");

// This handles the Android app: @POST("api/nodes/register")
app.use("/api/nodes", nodesRouter);

// This handles the Dashboard error: /api/nodes/stats
// We tell the server: "If someone asks for /api/nodes/stats, send them to the statsRouter"
app.use("/api/nodes/stats", statsRouter); 

// Also keep the standard stats path just in case
app.use("/api/stats", statsRouter);

// 4. START SERVER
app.listen(PORT, "0.0.0.0", () => {
    console.log(`✅ Server Aligned! Listening on ${PORT}`);
});
