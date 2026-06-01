const router = require("express").Router();
const pool   = require("../db/pool");

// GET /api/stats — dashboard overview numbers
router.get("/", async (req, res) => {
  try {
    const [nodes, posts, revenue, queue, broadcasts, recentSyncs] = await Promise.all([
      pool.query("SELECT COUNT(*) FROM nodes"),
      pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE status='pending')  AS pending,
          COUNT(*) FILTER (WHERE status='approved') AS approved,
          COUNT(*) FILTER (WHERE status='rejected') AS rejected
        FROM posts
      `),
      pool.query(`
        SELECT
          COALESCE(SUM(amount) FILTER (WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW())), 0) AS this_month,
          COALESCE(SUM(amount) FILTER (WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW() - INTERVAL '1 month')), 0) AS last_month,
          COALESCE(SUM(amount), 0) AS all_time
        FROM payments
      `),
      pool.query("SELECT COUNT(*) FROM posts WHERE status='pending'"),
      pool.query("SELECT COUNT(*) FROM posts WHERE status='approved' AND expires_at > NOW()"),
      pool.query(`
        SELECT peer_node_id, transport, completed_at
        FROM sync_sessions WHERE status='completed'
        ORDER BY completed_at DESC LIMIT 5
      `),
    ]);

    res.json({
      total_nodes:        parseInt(nodes.rows[0].count),
      pending_approval:   parseInt(queue.rows[0].count),
      active_broadcasts:  parseInt(broadcasts.rows[0].count),
      posts:              posts.rows[0],
      revenue:            revenue.rows[0],
      recent_syncs:       recentSyncs.rows,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;