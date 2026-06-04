require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const scheduler = require("./services/scheduler");

const app = express();
const PORT = process.env.PORT || 8080;

// 1. HEALTH CHECK (Immediate response for Railway)
app.get("/health", (req, res) => res.status(200).json({ status: "ok", uptime: process.uptime() }));
app.get("/", (req, res) => res.status(200).send("MeshBoard Super-Node API is Live"));

// 2. MIDDLEWARE
// Allow the dashboard to talk to the API
app.use(cors({
    origin: "*", 
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    credentials: true
}));
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

// 3. ROUTE LOGIC
// We import the route files once
const nodeRoutes = require("./routes/nodes");
const postRoutes = require("./routes/posts");
const statsRoutes = require("./routes/stats");
const syncRoutes = require("./routes/sync");
const tokenRoutes = require("./routes/tokens");

// --- ANDROID COMPATIBILITY (Prefix: /api/...) ---
app.use("/api/nodes", nodeRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/sync", syncRoutes);
app.use("/api/tokens", tokenRoutes);

// --- DASHBOARD COMPATIBILITY (Direct access) ---
app.use("/nodes", nodeRoutes);
app.use("/posts", postRoutes);
app.use("/stats", statsRoutes);
app.use("/sync", syncRoutes);
app.use("/tokens", tokenRoutes);

// 4. 404 CATCH-ALL
// If the dashboard says "Route not found", this log will show exactly what it was looking for.
app.use((req, res) => {
    console.warn(`[404] Missing Route: ${req.method} ${req.path}`);
    res.status(404).json({ 
        error: "Route not found", 
        message: `The path ${req.path} does not exist on this server.`,
        hint: "Check if you are missing a prefix like /api/"
    });
});

// 5. GLOBAL ERROR HANDLER
app.use((err, req, res, next) => {
    console.error("Critical Server Error:", err);
    res.status(500).json({ error: "Internal Server Error", details: err.message });
});

// 6. START SERVER
app.listen(PORT, "0.0.0.0", () => {
    console.log(`\n✅ MESHBOARD BACKEND STARTED`);
    console.log(`🚀 Port: ${PORT}`);
    console.log(`📡 Health: http://localhost:${PORT}/health\n`);
    
    // Start background jobs
    try {
        scheduler.start();
    } catch (e) {
        console.error("Scheduler failed to start:", e.message);
    }
});
