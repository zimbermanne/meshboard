require("dotenv").config();
const express    = require("express");
const cors       = require("cors");
const helmet     = require("helmet");
const morgan     = require("morgan");
const scheduler  = require("./services/scheduler");

const app  = express();
const PORT = process.env.PORT || 4000;

// ── CORS ────────────────────────────────────────────────────────────────────
// Allow all origins in development; restrict in production
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "http://localhost:3000")
  .split(",")
  .map(o => o.trim());

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, health checks)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes("*") || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    console.warn(`[CORS] Blocked origin: ${origin}`);
    console.warn(`[CORS] Allowed: ${allowedOrigins.join(", ")}`);
    return callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
}));

// ── Middleware ─────────────────────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(express.json({ limit: "1mb" }));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

// ── Routes ─────────────────────────────────────────────────────────────────
app.use("/api/nodes",    require("./routes/nodes"));
app.use("/api/posts",    require("./routes/posts"));
app.use("/api/tokens",   require("./routes/tokens"));
app.use("/api/payments", require("./routes/payments"));
app.use("/api/sync",     require("./routes/sync"));
app.use("/api/stats",    require("./routes/stats"));

// ── Health check ──────────────────────────────────────────────────────────
app.get("/health", (req, res) => res.json({
  status:    "ok",
  supernode: process.env.SUPERNODE_ID || "SUPERNODE-DEV",
  time:      new Date(),
  env:       process.env.NODE_ENV,
  port:      PORT,
  origins:   allowedOrigins,
}));

// ── 404 ────────────────────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ error: "Not found", path: req.path }));

// ── Error handler ──────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error("[error]", err.message);
  res.status(500).json({ error: err.message || "Internal server error" });
});

// ── Start ──────────────────────────────────────────────────────────────────
(async () => {
  if (process.env.RUN_MIGRATIONS === "true") {
    try {
      console.log("[startup] Running migrations...");
      const migrate = require("./migrate");
      await migrate();
      console.log("[startup] Migrations complete");
    } catch (err) {
      console.error("[startup] Migration error:", err.message);
    }
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`\n✓ MeshBoard Super-Node`);
    console.log(`  Node: ${process.env.SUPERNODE_ID || "SUPERNODE-DEV"}`);
    console.log(`  Port: ${PORT}`);
    console.log(`  Allowed origins: ${allowedOrigins.join(", ")}`);
    console.log(`  Health: http://localhost:${PORT}/health\n`);
    scheduler.start();
  });
})();
