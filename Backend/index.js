require("dotenv").config();
const express    = require("express");
const cors       = require("cors");
const helmet     = require("helmet");
const morgan     = require("morgan");
const scheduler  = require("./services/scheduler");

const app  = express();

// 1. DYNAMIC PORT (Railway requirement)
const PORT = process.env.PORT || 8080; 

// 2. HEALTH CHECK (MUST BE ABOVE ALL OTHER ROUTES)
// This ensures Railway gets a 200 OK immediately.
app.get("/health", (req, res) => res.status(200).json({ status: "ok" }));
app.get("/", (req, res) => res.status(200).json({ status: "MeshBoard Super-Node Live" }));

// 3. MIDDLEWARE
app.use(cors()); // Allow all for initial sync testing
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

// 4. ROUTES 
// We use the exact paths your Android app's ApiService.kt is calling
app.use("/api/nodes",    require("./routes/nodes"));
app.use("/api/posts",    require("./routes/posts"));
app.use("/api/tokens",   require("./routes/tokens"));
app.use("/api/sync",     require("./routes/sync"));
app.use("/api/stats",    require("./routes/stats"));
app.use("/api/payments", require("./routes/payments"));

// 5. 404 HANDLER
app.use((req, res) => {
  console.log(`[404] ${req.method} ${req.path}`);
  res.status(404).json({ error: "Route not found", path: req.path });
});

// 6. START SERVER
// Binding to 0.0.0.0 ensures Railway can route traffic to the container
app.listen(PORT, "0.0.0.0", () => {
  console.log(`\n✓ Server is live on port ${PORT}`);
  scheduler.start();
});
