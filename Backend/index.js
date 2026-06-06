require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const app = express();
const PORT = parseInt(process.env.PORT || "4000", 10);

// ── Liveness (Railway healthcheck) — no DB, no middleware ─────────────────
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    supernode: process.env.SUPERNODE_ID || "SUPERNODE-DEV",
    time: new Date().toISOString(),
    uptime: process.uptime(),
  });
});
app.get("/", (req, res) => res.status(200).send("MeshBoard Super-Node API"));

function corsOrigin() {
  const raw = process.env.ALLOWED_ORIGINS || "";
  const origins = raw.split(",").map((s) => s.trim()).filter(Boolean);
  if (!origins.length) return true;
  return (origin, callback) => {
    if (!origin || origins.includes(origin)) return callback(null, true);
    callback(new Error("CORS not allowed"));
  };
}

app.use(
  cors({
    origin: corsOrigin(),
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(helmet());
app.use(express.json({ limit: "1mb" }));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

// Dynamic fallback mappings for endpoints to protect route evaluation lifecycle
const safeRequire = (path) => {
  try {
    return require(path);
  } catch (err) {
    console.error(`[critical] Error loading route definition blueprint (${path}):`, err.message);
    return (req, res) => res.status(500).json({ error: "Route compilation failure on system startup" });
  }
};

app.use("/api/nodes", safeRequire("./routes/nodes"));
app.use("/api/posts", safeRequire("./routes/posts"));
app.use("/api/tokens", safeRequire("./routes/tokens"));
app.use("/api/payments", safeRequire("./routes/payments"));
app.use("/api/sync", safeRequire("./routes/sync"));
app.use("/api/stats", safeRequire("./routes/stats"));

app.use((req, res) => res.status(404).json({ error: "Not found" }));
app.use((err, req, res, next) => {
  console.error("[ERROR]", err.message || err);
  if (err.message === "CORS not allowed") {
    return res.status(403).json({ error: "Origin not allowed" });
  }
  res.status(500).json({ error: "Internal server error" });
});

// Listen immediately so Railway healthcheck passes before DB/migrations
const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`SERVER_READY_ON_PORT_${PORT}`);
  console.log(`Health: http://0.0.0.0:${PORT}/health`);
  
  // Defer background processing execution context execution out of the current tick thread stack
  process.nextTick(() => {
    bootBackground();
  });
});

server.on("error", (err) => {
  console.error("[fatal] Server failed to start:", err.message);
  process.exit(1);
});

function bootBackground() {
  if (!process.env.DATABASE_URL) {
    console.warn("⚠️ [startup] DATABASE_URL is not set — link PostgreSQL in Railway or verify environment variables.");
  }

  if (process.env.RUN_MIGRATIONS === "true") {
    console.log("[startup] Initiating migration check...");
    require("./migrate")()
      .then(() => console.log("✓ [startup] Migrations verified and applied seamlessly"))
      .catch((err) => {
        console.error("✗ [startup] Migration processing encountered a structural roadblock:", err.message);
        console.info("💡 Keeping server alive so health checks pass for administrative container access.");
      });
  }

  try {
    const scheduler = require("./services/scheduler");
    if (scheduler && typeof scheduler.start === "function") {
      scheduler.start();
      console.log("✓ [startup] Background Sync Scheduler engine active");
    } else {
      console.warn("⚠️ [startup] Scheduler found but initialization method contract was missing");
    }
  } catch (err) {
    console.warn("⚠️ [startup] Scheduler engine skipped execution context:", err.message);
  }
}
