require("dotenv").config();
const express = require("express");
const cors = require("cors");
const app = express();

// 1. DYNAMIC PORT
// Railway provides the PORT variable; 8080 is a safe fallback.
const PORT = process.env.PORT || 8080;

// 2. MIDDLEWARE
app.use(cors());
app.use(express.json({ limit: "1mb" }));

// 3. THE "STAY ALIVE" ROUTES
// These must be at the top so Railway healthchecks don't 404.
app.get("/health", (req, res) => res.status(200).json({ status: "ok" }));
app.get("/", (req, res) => res.status(200).json({ message: "MeshBoard Backend Live" }));

// 4. THE PROTECTED ROUTES
// Before requiring, we verify these files exist in your 'routes' folder.
try {
    app.use("/api/nodes",    require("./routes/nodes"));
    app.use("/api/posts",    require("./routes/posts"));
    app.use("/api/tokens",   require("./routes/tokens"));
    app.use("/api/sync",     require("./routes/sync"));
    app.use("/api/stats",    require("./routes/stats"));
    app.use("/api/payments", require("./routes/payments"));
} catch (err) {
    console.error("❌ ROUTE LOADING ERROR:", err.message);
    // This prevents the server from completely crashing if one file is missing
}

// 5. 404 HANDLER
app.use((req, res) => {
    console.log(`[404] ${req.method} ${req.path}`);
    res.status(404).json({ error: "Route not found", path: req.path });
});

// 6. GLOBAL ERROR HANDLER
app.use((err, req, res, next) => {
    console.error("Internal Server Error:", err);
    res.status(500).json({ error: "Server error occurred" });
});

// 7. START
app.listen(PORT, "0.0.0.0", () => {
    console.log(`\n✓ MESHBOARD ONLINE`);
    console.log(`  Port: ${PORT}`);
    console.log(`  Health Check: /health`);
});
