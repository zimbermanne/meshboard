require("dotenv").config();
const express    = require("express");
const cors       = require("cors");
const helmet     = require("helmet");
const morgan     = require("morgan");
const scheduler  = require("./services/scheduler");

const app  = express();
const PORT = process.env.PORT || 4000;

// 1. HEALTH CHECK (MUST BE FIRST)
// Railway looks for this to confirm the server is alive.
app.get("/health", (req, res) => res.json({
  status:    "ok",
  time:      new Date(),
  port:      PORT,
}));

app.get("/", (req, res) => res.json({ status: "MeshBoard Online" }));

// 2. CORS & MIDDLEWARE
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "http://localhost:3000")
  .split(",")
  .map(o => o.trim());

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes("*") || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(null, true); // Temporarily allow for debugging if needed
  },
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
}));

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

// 3. ROUTES (Mounted after health check to avoid 404s)
// ── Routes (The "Catch-All" Fix) ──────────────────────────────────────────
/* We keep the mount points at "/" but we must ensure the 
   router files themselves don't have the "api/nodes" prefix 
   OR we mount them like this:
*/

app.use("/", require("./routes/nodes"));
app.use("/", require("./routes/posts"));
app.use("/", require("./routes/tokens"));
app.use("/", require("./routes/payments"));
app.use("/", require("./routes/sync"));
app.use("/", require("./routes/stats"));

// 4. 404 ERROR HANDLER
app.use((req, res) => {
  console.log(`[404] ${req.method} ${req.path}`);
  res.status(404).json({ error: "Not found", path: req.path });
});

// 5. START SERVER
// Use "::" to allow both IPv4 and IPv6 (Railway requirement)
app.listen(PORT, "::", () => {
  console.log(`\n✓ Server is live on port ${PORT}`);
  scheduler.start();
});
