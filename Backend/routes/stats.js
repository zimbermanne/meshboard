const router = require("express").Router();
const pool = require("../db/pool");
const { hasDatabaseConfig, getDatabaseDiagnostics } = require("../db/resolveDatabaseConfig");
const { requireAuth, requireAdmin } = require("../middleware/auth");

router.use(requireAuth, requireAdmin);

// GET /api/stats — dashboard overview (also useful for mobile status screens)
router.get("/", async (req, res) => {
  if (!hasDatabaseConfig()) {
    const diagnostics = getDatabaseDiagnostics();
    return res.status(503).json({
      error: "Database not configured",
      hint: diagnostics.hint,
      diagnostics,
    });
  }

  try {
    const [counts, revenue] = await Promise.all([
      pool.query(`
        SELECT
          (SELECT COUNT(*)::int FROM nodes) AS total_nodes,
          (SELECT COUNT(*)::int FROM posts WHERE status = 'pending') AS pending_approval,
          (SELECT COUNT(*)::int FROM posts WHERE status = 'approved' AND expires_at > NOW()) AS active_broadcasts,
          (SELECT COUNT(*)::int FROM posts WHERE status = 'approved') AS approved_posts,
          (SELECT COUNT(*)::int FROM posts WHERE status = 'rejected') AS rejected_posts
      `),
      pool.query(`
        SELECT
          COALESCE(SUM(amount) FILTER (WHERE created_at >= date_trunc('month', NOW())), 0) AS this_month,
          COALESCE(SUM(amount) FILTER (
            WHERE created_at >= date_trunc('month', NOW() - INTERVAL '1 month')
              AND created_at < date_trunc('month', NOW())
          ), 0) AS last_month,
          COALESCE(SUM(amount), 0) AS all_time
        FROM payments
      `),
    ]);

    const row = counts.rows[0];
    const rev = revenue.rows[0];

    res.json({
      total_nodes: row.total_nodes,
      pending_approval: row.pending_approval,
      active_broadcasts: row.active_broadcasts,
      posts: {
        pending: row.pending_approval,
        approved: row.approved_posts,
        rejected: row.rejected_posts,
      },
      revenue: {
        this_month: parseFloat(rev.this_month),
        last_month: parseFloat(rev.last_month),
        all_time: parseFloat(rev.all_time),
      },
    });
  } catch (err) {
    const message = err.message || err.code || "Database query failed";
    const status = /does not exist|DB_NOT_CONFIGURED|not configured/i.test(message) ? 503 : 500;
    res.status(status).json({
      error: message,
      hint:
        status === 503
          ? "Run npm run migrate in Backend/ or POST /api/setup/migrate on Railway."
          : undefined,
    });
  }
});

module.exports = router;
