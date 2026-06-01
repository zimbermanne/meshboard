require("dotenv").config();
const express    = require("express");
const cors       = require("cors");
const helmet     = require("helmet");
const morgan     = require("morgan");
const scheduler  = require("./services/scheduler");

const app  = express();
const PORT = process.env.PORT || 4000;

// ── Middleware ─────────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: (process.env.ALLOWED_ORIGINS || "http://localhost:3000").split(","),
  methods: ["GET", "POST", "PATCH", "DELETE"],
}));
app.use(express.json({ limit: "1mb" }));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

// ── Routes ─────────────────────────────────────────────────────────────────
app.use("/api/nodes",    require("./routes/nodes"));
app.use("/api/posts",    require("./routes/posts"));
app.use("/api/tokens",   require("./routes/tokens"));
app.use("/api/payments", require("./routes/payments"));
app.use("/api/sync",     require("./routes/sync"));
app.use("/api/stats",    require("./routes/stats"));

// Health check
app.get("/health", (req, res) => res.json({
  status: "ok",
  supernode: process.env.SUPERNODE_ID,
  time: new Date(),
}));

// 404
app.use((req, res) => res.status(404).json({ error: "Not found" }));

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

// ── Start ──────────────────────────────────────────────────────────────────
(async () => {
  // Optional: run migrations on startup if enabled
  if (process.env.RUN_MIGRATIONS === "true") {
    try {
      console.log("[startup] Running migrations...");
      const migrate = require("./migrate");
      await migrate();
      console.log("[startup] Migrations complete");
    } catch (err) {
      console.error("[startup] Migration error:", err.message);
      // Don't exit — continue anyway to allow inspection
    }
  }

  app.listen(PORT, () => {
    console.log(`\n MeshBoard Super-Node`);
    console.log(` Node: ${process.env.SUPERNODE_ID || "SUPERNODE-DEV"}`);
    console.log(` Listening on http://localhost:${PORT}\n`);
    scheduler.start();
  });
})();