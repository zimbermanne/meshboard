require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const app = express();
const PORT = process.env.PORT || 4000;

// Health checks first (Railway probes before middleware)
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

// REST API — dashboard (frontend) + direct mobile calls
app.use("/api/nodes", require("./routes/nodes"));
app.use("/api/posts", require("./routes/posts"));
app.use("/api/tokens", require("./routes/tokens"));
app.use("/api/payments", require("./routes/payments"));
app.use("/api/sync", require("./routes/sync"));
app.use("/api/stats", require("./routes/stats"));

app.use((req, res) => res.status(404).json({ error: "Not found" }));
app.use((err, req, res, next) => {
  console.error("[ERROR]", err.message || err);
  if (err.message === "CORS not allowed") {
    return res.status(403).json({ error: "Origin not allowed" });
  }
  res.status(500).json({ error: "Internal server error" });
});

async function start() {
  if (process.env.RUN_MIGRATIONS === "true") {
    try {
      await require("./migrate")();
      console.log("[startup] Migrations applied");
    } catch (err) {
      console.error("[startup] Migration failed:", err.message);
      process.exit(1);
    }
  }

  try {
    require("./services/scheduler").start();
    console.log("[startup] Scheduler started");
  } catch (err) {
    console.warn("[startup] Scheduler not started:", err.message);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`SERVER_READY_ON_PORT_${PORT}`);
    console.log(`Health: http://0.0.0.0:${PORT}/health`);
    console.log(`Sync:   POST http://0.0.0.0:${PORT}/api/sync`);
  });
}

start();
