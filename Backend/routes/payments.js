const router = require("express").Router();
const pool   = require("../db/pool");
const { requireAuth, requireAdmin } = require("../middleware/auth");

router.use(requireAuth, requireAdmin);

// GET /api/payments — full log with optional filters
router.get("/", async (req, res) => {
  try {
    const { node_id, method, from, to } = req.query;
    let sql = `
      SELECT p.*, n.display_name
      FROM payments p
      JOIN nodes n ON n.id = p.node_id
      WHERE 1=1
    `;
    const params = [];
    if (node_id) { params.push(node_id);  sql += ` AND p.node_id = $${params.length}`; }
    if (method)  { params.push(method);   sql += ` AND p.method = $${params.length}`; }
    if (from)    { params.push(from);     sql += ` AND p.created_at >= $${params.length}`; }
    if (to)      { params.push(to);       sql += ` AND p.created_at <= $${params.length}`; }
    sql += " ORDER BY p.created_at DESC";
    const { rows } = await pool.query(sql, params);

    const total = rows.reduce((s, r) => s + parseFloat(r.amount), 0);
    res.json({ payments: rows, total });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/payments/stats — revenue by day/week/month
router.get("/stats", async (req, res) => {
  try {
    const [daily, monthly, byMethod] = await Promise.all([
      pool.query(`
        SELECT DATE(created_at) AS date, SUM(amount) AS revenue, COUNT(*) AS count
        FROM payments WHERE created_at >= NOW() - INTERVAL '30 days'
        GROUP BY DATE(created_at) ORDER BY date
      `),
      pool.query(`
        SELECT TO_CHAR(created_at, 'YYYY-MM') AS month, SUM(amount) AS revenue, COUNT(*) AS count
        FROM payments GROUP BY month ORDER BY month DESC LIMIT 12
      `),
      pool.query(`
        SELECT method, SUM(amount) AS revenue, COUNT(*) AS count
        FROM payments GROUP BY method
      `),
    ]);
    res.json({
      daily:     daily.rows,
      monthly:   monthly.rows,
      by_method: byMethod.rows,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
