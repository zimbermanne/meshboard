require("dotenv").config();
const express = require("express");
const cors = require("cors");
const app = express();

const PORT = process.env.PORT || 8080;

// 1. TOP-LEVEL HEALTH CHECK (CRITICAL)
// We put this first so Railway gets a success response immediately.
app.get("/health", (req, res) => res.status(200).send("OK"));
app.get("/", (req, res) => res.status(200).send("MeshBoard Live"));

// 2. MIDDLEWARE
app.use(cors());
app.use(express.json());

// 3. SAFE ROUTE LOADING
// We wrap these in a try-catch so one bad file doesn't kill the whole server.
const loadRoute = (path, fileName) => {
    try {
        app.use(path, require(`./routes/${fileName}`));
        console.log(`✅ Loaded: ${path}`);
    } catch (err) {
        console.error(`❌ Failed to load ${fileName}:`, err.message);
    }
};

// Map the routes exactly how the dashboard and Android app need them
loadRoute("/api/nodes", "nodes");
loadRoute("/api/stats", "stats");
loadRoute("/api/nodes/stats", "stats"); // Fixed for dashboard 404
loadRoute("/api/posts", "posts");
loadRoute("/api/sync", "sync");

// 4. GLOBAL ERROR HANDLER
app.use((err, req, res, next) => {
    res.status(500).json({ error: "Server Error", message: err.message });
});

// 5. BIND TO 0.0.0.0
app.listen(PORT, "0.0.0.0", () => {
    console.log(`\n🚀 SERVER STABILIZED ON PORT ${PORT}`);
});
