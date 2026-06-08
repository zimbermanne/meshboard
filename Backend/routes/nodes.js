const router = require("express").Router();
const pool   = require("../db/pool");
const { body, param, query, validationResult } = require("express-validator");

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  next();
};

const NODE_ID_RE = /^NODE-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
const RESERVED_IDS = new Set(["stats", "posts", "tokens", "payments", "sync", "register", "active"]);

function requireNodeId(req, res, next) {
  const { id } = req.params;
  if (RESERVED_IDS.has(id)) {
    return res.status(404).json({
      error: "Not found",
      hint: `Use GET /api/${id} instead of /api/nodes/${id}`,
    });
  }
  if (!NODE_ID_RE.test(id)) {
    return res.status(404).json({ error: "Node not found" });
  }
  next();
}

// GET /api/nodes — list all nodes (searchable)
router.get("/", async (req, res) => {
  try {
    const { search } = req.query;
    let sql = `
      SELECT n.*,
             COUNT(DISTINCT p.id) FILTER (WHERE p.status = 'approved') AS total_posts,
             COUNT(DISTINCT p.id) FILTER (WHERE p.status = 'approved' AND p.expires_at > NOW()) AS active_posts
      FROM nodes n
      LEFT JOIN posts p ON p.node_id = n.id
    `;
    const params = [];
    if (search) {
      params.push(`%${search}%`);
      sql += ` WHERE n.id ILIKE $1 OR n.display_name ILIKE $1`;
    }
    sql += " GROUP BY n.id ORDER BY n.registered_at DESC";
    const { rows } = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/nodes/register — called by client app on first sync (before /:id routes)
router.post(
  "/register",
  body("id").matches(/^NODE-[A-Z0-9]{4}-[A-Z0-9]{4}$/).withMessage("Invalid NODE ID format"),
  body("display_name").trim().isLength({ min: 1, max: 80 }),
  validate,
  async (req, res) => {
    const { id, display_name } = req.body;
    try {
      const result = await pool.query(
        `INSERT INTO nodes(id, display_name, last_seen_at)
         VALUES($1, $2, NOW())
         ON CONFLICT(id) DO UPDATE SET last_seen_at = NOW(), display_name = EXCLUDED.display_name
         RETURNING *`,
        [id, display_name]
      );
      const isNew = result.rows[0].registered_at > new Date(Date.now() - 5000);

      await pool.query(
        `INSERT INTO sync_queue(target_node, type, payload, priority)
         VALUES($1, 'registration_ack', $2, 2)`,
        [id, JSON.stringify({ node_id: id, credit_balance: result.rows[0].credit_balance, baosh_balance: result.rows[0].baosh_balance })]
      );

      res.status(isNew ? 201 : 200).json({ node: result.rows[0], registered: isNew });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// GET /api/nodes/:id — single node with full history
router.get("/:id", requireNodeId, async (req, res) => {
  try {
    const { id } = req.params;
    const nodeRes = await pool.query("SELECT * FROM nodes WHERE id = $1", [id]);
    if (!nodeRes.rows.length) return res.status(404).json({ error: "Node not found" });

    const [posts, tokens, payments, credits] = await Promise.all([
      pool.query("SELECT * FROM posts WHERE node_id=$1 ORDER BY submitted_at DESC", [id]),
      pool.query("SELECT * FROM tokens WHERE node_id=$1 ORDER BY created_at DESC", [id]),
      pool.query("SELECT * FROM payments WHERE node_id=$1 ORDER BY created_at DESC", [id]),
      pool.query("SELECT * FROM credit_transactions WHERE node_id=$1 ORDER BY created_at DESC LIMIT 50", [id]),
    ]);

    res.json({
      node: nodeRes.rows[0],
      posts: posts.rows,
      tokens: tokens.rows,
      payments: payments.rows,
      credit_history: credits.rows,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/nodes/:id/display-name
router.patch(
  "/:id/display-name",
  requireNodeId,
  body("display_name").trim().isLength({ min: 1, max: 80 }),
  validate,
  async (req, res) => {
    try {
      const { rows } = await pool.query(
        "UPDATE nodes SET display_name=$1 WHERE id=$2 RETURNING *",
        [req.body.display_name, req.params.id]
      );
      if (!rows.length) return res.status(404).json({ error: "Node not found" });
      res.json(rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// POST /api/nodes/:id/deactivate — operator blocks node from posting
router.post(
  "/:id/deactivate",
  requireNodeId,
  body("reason").optional().trim(),
  validate,
  async (req, res) => {
    try {
      const { rows } = await pool.query(
        `UPDATE nodes SET is_active = FALSE WHERE id = $1 RETURNING *`,
        [req.params.id]
      );
      if (!rows.length) return res.status(404).json({ error: "Node not found" });
      await pool.query(
        `INSERT INTO sync_queue(target_node, type, payload, priority)
         VALUES($1, 'node_deactivated', $2, 2)`,
        [req.params.id, JSON.stringify({ node_id: req.params.id, reason: req.body.reason || null })]
      );
      res.json(rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// POST /api/nodes/:id/reactivate
router.post("/:id/reactivate", requireNodeId, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `UPDATE nodes SET is_active = TRUE WHERE id = $1 RETURNING *`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: "Node not found" });
    await pool.query(
      `INSERT INTO sync_queue(target_node, type, payload, priority)
       VALUES($1, 'node_reactivated', $2, 2)`,
      [req.params.id, JSON.stringify({ node_id: req.params.id })]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
