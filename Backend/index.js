require("dotenv").config();
const express    = require("express");
const cors       = require("cors");
const helmet     = require("helmet");
const morgan     = require("morgan");
const scheduler  = require("./services/scheduler");
 
const app  = express();
const PORT = process.env.PORT || 4000;

// ── CORS ────────────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "http://localhost:3000")
  .split(",")
  .map(o => o.trim());

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes("*") || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
}));

// ── Middleware ─────────────────────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(express.json({ limit: "1mb" })); // Critical for reading Android JSON data
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

// ── Routes (CORRECTED FOR ANDROID SYNC) ────────────────────────────────────
/* We mount these at the root ("/") because your Android ApiService.kt 
   already includes "api/nodes", "api/posts", etc., in the @POST paths.
*/
app.use("/", require("./routes/nodes"));
app.use("/", require("./routes/posts"));
app.use("/", require("./routes/tokens"));
app.use("/", require("./routes/payments"));
app.use("/", require("./routes/sync"));
app.use("/", require("./routes/stats"));

// ── Health check ──────────────────────────────────────────────────────────
app.get("/health", (req, res) => res.json({
  status:    "ok",
  supernode: process.env.SUPERNODE_ID || "SUPERNODE-DEV",
  time:      new Date(),
  env:       process.env.NODE_ENV,
  port:      PORT,
}));

// ── 404 handler ────────────────────────────────────────────────────────────
app.use((req, res) => {
  console.log(`[404] Not Found: ${req.method} ${req.path}`);
  res.status(404).json({ error: "Not found", path: req.path });
});

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
    console.log(`\n✓ MeshBoard Super-Node Connected`);
    console.log(`  Node ID: ${process.env.SUPERNODE_ID || "SUPERNODE-DEV"}`);
    console.log(`  Port: ${PORT}`);
    console.log(`  Health: http://localhost:${PORT}/health\n`);
    scheduler.start();
  });
})();
