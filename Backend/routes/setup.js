/**
 * Setup / diagnostics — unblock Railway deploy when DATABASE_URL has placeholder host.
 */
const router = require("express").Router();
const pool = require("../db/pool");
const { getDatabaseDiagnostics, hasDatabaseConfig } = require("../db/resolveDatabaseConfig");

// GET /api/setup/status
router.get("/status", async (req, res) => {
  const diagnostics = getDatabaseDiagnostics();
  let database = "disconnected";
  let dbError = null;

  if (hasDatabaseConfig()) {
    try {
      await pool.query("SELECT 1");
      database = "connected";
    } catch (err) {
      dbError = err.message || String(err);
    }
  } else {
    dbError = "PostgreSQL not configured — link Postgres on Railway (PGHOST + credentials).";
  }

  res.status(database === "connected" ? 200 : 503).json({
    status: database === "connected" ? "ok" : "degraded",
    database,
    error: dbError,
    backend: "https://meshboard-super-node.up.railway.app",
    diagnostics,
    hint:
      database === "connected"
        ? "Run POST /api/setup/migrate if tables are missing."
        : diagnostics.misconfiguredPgHost
          ? "PGHOST must come from the PostgreSQL service (e.g. postgres.railway.internal), not the backend."
          : diagnostics.hint ||
            "Link PostgreSQL on Railway and reference DATABASE_PRIVATE_URL or PGHOST from Postgres.",
  });
});

// POST /api/setup/migrate — apply schema (idempotent)
router.post("/migrate", async (req, res) => {
  if (!hasDatabaseConfig()) {
    return res.status(503).json({
      error: "Database not configured. Link PostgreSQL to this Railway service first.",
    });
  }

  try {
    await require("../migrate")();
    res.json({ status: "ok", message: "Migrations applied" });
  } catch (err) {
    res.status(500).json({
      error: err.message || "Migration failed",
    });
  }
});

module.exports = router;
