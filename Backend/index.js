require("dotenv").config();
const express = require("express");
const cors = require("cors");
const app = express();

// 1. DYNAMIC PORT
// Use process.env.PORT to let Railway decide, or fallback to 8080
const PORT = process.env.PORT || 8080;

// 2. IMMEDIATE HEALTH RESPONSES
// These must be at the VERY top of the file.
app.get("/health", (req, res) => res.status(200).send("OK"));
app.get("/", (req, res) => res.status(200).send("Server is Up"));

// 3. MIDDLEWARE
app.use(cors());
app.use(express.json());

// 4. ROUTES
// IMPORTANT: Only keep these if the files actually exist!
try {
    app.use("/api/nodes", require("./routes/nodes"));
    app.use("/api/stats", require("./routes/stats"));
    // Add others only if they exist in your /routes folder
} catch (err) {
    console.error("Route error:", err.message);
}

// 5. START SERVER
// We bind to 0.0.0.0 and use a clear log for Railway
app.listen(PORT, "0.0.0.0", () => {
    console.log(`SERVER_READY_ON_PORT_${PORT}`);
});
