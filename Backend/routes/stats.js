require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const app = express();
const PORT = process.env.PORT || 4000;

// ── Safe Route Loader ─────────────────────────────────────────────────────
function safeRequire(path) {
  try {
    return require(path);
  } catch (err) {
    console.warn(`[WARN] Could not load ${path}: ${err.message}`);
    return { router: express.Router() }; // fallback empty router
  }
}

// ── Middleware ────────────────────────────────────────────────────────────
app.use(cors({
  origin: true, // Allow all for now (tighten later)
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

app.use(helmet());
app.use(express.json({ limit: "1mb" }));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

// ── Routes with Safe Loading ──────────────────────────────────────────────
app.use("/", safeRequire("./routes/nodes").router || safeRequire("./routes/nodes"));
app.use("/", safeRequire("./routes/posts").router || safeRequire("./routes/posts"));
app.use("/", safeRequire("./routes/tokens").router || safeRequire("./routes/tokens"));
app.use("/", safeRequire("./routes/payments").router || safeRequire("./routes/payments"));
app.use("/", safeRequire("./routes/sync").router || safeRequire("./routes/sync"));
app.use("/", safeRequire("./routes/stats").router || safeRequire("./routes/stats"));

// ── Health Check ──────────────────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    supernode: process.env.SUPERNODE_ID || "SUPERNODE-DEV",
    time: new Date().toISOString(),
    env: process.env.NODE_ENV || "development",
    port: PORT,
    uptime: process.uptime()
  });
});

// ── 404 & Error Handler ───────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ error: "Not found" }));

app.use((err, req, res, next) => {
  console.error("[ERROR]", err);
  res.status(500).json({ error: "Internal server error" });
});

// ── Start Server ──────────────────────────────────────────────────────────
app.listen(PORT, "0.0.0.0", () => {
  console.log(`\n✅ MeshBoard Super-Node Started`);
  console.log(`   Port: ${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`   Environment: ${process.env.NODE_ENV || "development"}\n`);
});

// Optional Scheduler (if exists)
try {
  const scheduler = require("./services/scheduler");
  if (scheduler && typeof scheduler.start === "function") {
    scheduler.start();
    console.log("✓ Scheduler started");
  }
} catch (e) {
  console.warn("Scheduler not loaded (optional)");
}
