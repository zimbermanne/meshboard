const router = require("express").Router();
const pool = require("../db/pool");

// GET /api/stats — dashboard overview (also useful for mobile status screens)
router.get("/", async (req, res) => {
  try {
    const [counts, revenue] = await Promise.all([
      pool.query(`
        SELECT
          (SELECT COUNT(*)::int FROM nodes WHERE is_active IS NOT FALSE) AS total_nodes,
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
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
