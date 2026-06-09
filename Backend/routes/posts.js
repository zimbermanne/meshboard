const router = require("express").Router();
const pool   = require("../db/pool");
const { body, validationResult } = require("express-validator");
const { requireAuth } = require("../middleware/auth");

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  next();
};

// GET /api/posts/active — must be registered before "/" (Express route order)
router.get("/active", requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT p.*, COALESCE(n.display_name, p.node_id) AS sender_name,
             EXTRACT(EPOCH FROM (p.expires_at - NOW())) AS seconds_remaining,
             EXTRACT(EPOCH FROM (p.expires_at - p.approved_at)) AS total_seconds
      FROM posts p
      LEFT JOIN nodes n ON n.id = p.node_id
      WHERE p.status = 'approved' AND p.expires_at > NOW()
      ORDER BY p.expires_at ASC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/posts — list posts, filterable by status
router.get("/", requireAuth, async (req, res) => {
  try {
    const { status } = req.query;
    let sql = `
      SELECT p.*, COALESCE(n.display_name, p.node_id) AS sender_name
      FROM posts p
      LEFT JOIN nodes n ON n.id = p.node_id
    `;
    const params = [];
    if (status) { sql += " WHERE p.status = $1"; params.push(status); }
    sql += " ORDER BY p.submitted_at DESC";
    const { rows } = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/posts — submit new post request (from client node)
router.post(
  "/",
  body("node_id").matches(/^NODE-[A-Z0-9]{4}-[A-Z0-9]{4}$/),
  body("message_text").trim().isLength({ min: 1, max: 280 }),
  body("package_days").isInt({ min: 1, max: 7 }),
  body("link").optional().isURL(),
  body("phone").optional().isMobilePhone(),
  validate,
  async (req, res) => {
    const { node_id, message_text, link, phone, package_days } = req.body;
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Check node exists
      const nodeRes = await client.query("SELECT * FROM nodes WHERE id=$1", [node_id]);
      if (!nodeRes.rows.length) return res.status(404).json({ error: "Node not registered" });
      if (nodeRes.rows[0].is_active === false) {
        return res.status(403).json({ error: "Node is deactivated" });
      }
      const node = nodeRes.rows[0];

      const yearMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
      const freeRes  = await client.query(
        "SELECT 1 FROM free_post_usage WHERE node_id=$1 AND year_month=$2",
        [node_id, yearMonth]
      );
      const isFreePost   = freeRes.rows.length === 0 && package_days === 2;
      const credit_cost  = isFreePost ? 0 : package_days;

      if (!isFreePost && node.credit_balance < credit_cost) {
        await client.query("ROLLBACK");
        return res.status(402).json({ error: "Insufficient credits", balance: node.credit_balance, required: credit_cost });
      }

      const postId = "MSG-" + Math.random().toString(36).toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,6);
      const { rows } = await client.query(
        `INSERT INTO posts(id, node_id, message_text, link, phone, package_days, credit_cost, is_free_post)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
        [postId, node_id, message_text, link || null, phone || null, package_days, credit_cost, isFreePost]
      );

      await client.query("COMMIT");
      res.status(201).json(rows[0]);
    } catch (err) {
      await client.query("ROLLBACK");
      res.status(500).json({ error: err.message });
    } finally {
      client.release();
    }
  }
);

// POST /api/posts/:id/approve
router.post("/:id/approve", requireAuth, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const postRes = await client.query("SELECT * FROM posts WHERE id=$1", [req.params.id]);
    if (!postRes.rows.length) return res.status(404).json({ error: "Post not found" });
    const post = postRes.rows[0];
    if (post.status !== "pending") return res.status(409).json({ error: `Post is already ${post.status}` });

    const now       = new Date();
    const expiresAt = new Date(now.getTime() + post.package_days * 86400 * 1000);

    // Approve post
    const { rows } = await client.query(
      `UPDATE posts SET status='approved', approved_at=$1, expires_at=$2, approved_by=$3
       WHERE id=$4 RETURNING *`,
      [now, expiresAt, req.body.operator || "operator", post.id]
    );

    if (!post.is_free_post && post.credit_cost > 0) {
      // Check current balance before deducting
      const nodeRes = await client.query("SELECT credit_balance FROM nodes WHERE id=$1 FOR UPDATE", [post.node_id]);
      if (!nodeRes.rows.length) {
        await client.query("ROLLBACK");
        return res.status(404).json({
          error: `Node ${post.node_id} is not registered. Register the node before approving.`,
        });
      }
      
      const currentBalance = nodeRes.rows[0].credit_balance;
      if (currentBalance < post.credit_cost) {
        await client.query("ROLLBACK");
        return res.status(402).json({ 
          error: "Insufficient credits", 
          balance: currentBalance, 
          required: post.credit_cost 
        });
      }

      // Deduct credits
      await client.query(
        "UPDATE nodes SET credit_balance = credit_balance - $1, total_spent = total_spent + $1 WHERE id = $2",
        [post.credit_cost, post.node_id]
      );
      await client.query(
        `INSERT INTO credit_transactions(node_id, amount, type, reference)
         VALUES($1, $2, 'post_charge', $3)`,
        [post.node_id, -post.credit_cost, post.id]
      );
    }

    if (post.is_free_post) {
      const yearMonth = now.toISOString().slice(0, 7);
      await client.query(
        `INSERT INTO free_post_usage(node_id, year_month, post_id) VALUES($1,$2,$3)
         ON CONFLICT DO NOTHING`,
        [post.node_id, yearMonth, post.id]
      );
    }

    // Queue broadcast to all nodes (priority 3)
    await client.query(
      `INSERT INTO sync_queue(target_node, type, payload, priority)
       VALUES(NULL, 'post_approved', $1, 3)`,
      [JSON.stringify({ post: rows[0] })]
    );

    // Queue credit update to owning node (priority 1)
    const finalNodeRes = await client.query("SELECT credit_balance FROM nodes WHERE id=$1", [post.node_id]);
    await client.query(
      `INSERT INTO sync_queue(target_node, type, payload, priority)
       VALUES($1, 'credit_update', $2, 1)`,
      [post.node_id, JSON.stringify({ node_id: post.node_id, credit_balance: finalNodeRes.rows[0].credit_balance })]
    );

    await client.query("COMMIT");
    res.json(rows[0]);
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// POST /api/posts/:id/reject
router.post("/:id/reject", requireAuth, async (req, res) => {
  try {
    const postRes = await pool.query("SELECT * FROM posts WHERE id=$1", [req.params.id]);
    if (!postRes.rows.length) return res.status(404).json({ error: "Post not found" });
    if (postRes.rows[0].status !== "pending") return res.status(409).json({ error: "Post is not pending" });

    const { rows } = await pool.query(
      "UPDATE posts SET status='rejected', rejection_reason=$1 WHERE id=$2 RETURNING *",
      [req.body.reason || null, req.params.id]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/posts/:id/delete — remove pending post (operator)
router.post(
  "/:id/delete",
  requireAuth,
  body("reason").optional().trim(),
  validate,
  async (req, res) => {
    try {
      const postRes = await pool.query("SELECT * FROM posts WHERE id=$1", [req.params.id]);
      if (!postRes.rows.length) return res.status(404).json({ error: "Post not found" });
      if (postRes.rows[0].status !== "pending") {
        return res.status(409).json({ error: "Only pending posts can be deleted" });
      }
      const { rows } = await pool.query(
        "DELETE FROM posts WHERE id=$1 RETURNING *",
        [req.params.id]
      );
      res.json(rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// POST /api/posts/:id/expire — manual operator expiry
router.post("/:id/expire", requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "UPDATE posts SET expires_at=NOW() WHERE id=$1 AND status='approved' RETURNING *",
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: "Active post not found" });

    // Queue cleanup to all nodes
    await pool.query(
      `INSERT INTO sync_queue(target_node, type, payload, priority)
       VALUES(NULL, 'expiry_cleanup', $1, 3)`,
      [JSON.stringify({ expired_post_ids: [req.params.id] })]
    );

    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
