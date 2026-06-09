const router = require("express").Router();
const pool   = require("../db/pool");
const { body, validationResult } = require("express-validator");
const { requireAuth } = require("../middleware/auth");

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  next();
};

function generateTokenId(nodeId) {
  const seg = () => Math.random().toString(36).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4).padEnd(4, "X");
  const nodePart = nodeId.replace("NODE-", "").slice(0, 4);
  return `TXN-${seg()}-${nodePart}-${seg()}`;
}

// GET /api/tokens — all tokens with optional filters
router.get("/", requireAuth, async (req, res) => {
  try {
    const { node_id, status } = req.query;
    let sql = `
      SELECT t.*, n.display_name
      FROM tokens t
      JOIN nodes n ON n.id = t.node_id
      WHERE 1=1
    `;
    const params = [];
    if (node_id) { params.push(node_id); sql += ` AND t.node_id = $${params.length}`; }
    if (status)  { params.push(status);  sql += ` AND t.status = $${params.length}`; }
    sql += " ORDER BY t.created_at DESC";
    const { rows } = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tokens/generate — operator creates a credit token
router.post(
  "/generate",
  requireAuth,
  body("node_id").matches(/^NODE-[A-Z0-9]{4}-[A-Z0-9]{4}$/),
  body("amount").isFloat({ min: 1, max: 1000 }),
  body("operator").trim().notEmpty(),
  body("method").isIn(["cash", "mpesa"]),
  body("notes").optional().trim(),
  validate,
  async (req, res) => {
    const { node_id, amount, operator, method, notes } = req.body;
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const nodeRes = await client.query("SELECT id, display_name FROM nodes WHERE id=$1", [node_id]);
      if (!nodeRes.rows.length) return res.status(404).json({ error: "Node not found" });

      const tokenId  = generateTokenId(node_id);
      const expiresAt = new Date(Date.now() + parseInt(process.env.TOKEN_EXPIRY_HOURS || 48) * 3600 * 1000);

      const tokenRes = await client.query(
        `INSERT INTO tokens(id, node_id, amount, status, created_by, expires_at)
         VALUES($1,$2,$3,'pending',$4,$5) RETURNING *`,
        [tokenId, node_id, amount, operator, expiresAt]
      );

      // Log payment record
      const payId = "PAY-" + Math.random().toString(36).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
      await client.query(
        `INSERT INTO payments(id, node_id, amount, method, operator, token_id, notes)
         VALUES($1,$2,$3,$4,$5,$6,$7)`,
        [payId, node_id, amount, method, operator, tokenId, notes || null]
      );

      await client.query("COMMIT");
      res.status(201).json({
        token: tokenRes.rows[0],
        payment_id: payId,
        message: `Token generated. Communicate to user: ${tokenId}`,
      });
    } catch (err) {
      await client.query("ROLLBACK");
      res.status(500).json({ error: err.message });
    } finally {
      client.release();
    }
  }
);

// POST /api/tokens/redeem — called by client node
router.post(
  "/redeem",
  body("token_id").trim().notEmpty(),
  body("node_id").matches(/^NODE-[A-Z0-9]{4}-[A-Z0-9]{4}$/),
  validate,
  async (req, res) => {
    const { token_id, node_id } = req.body;
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const tokenRes = await client.query("SELECT * FROM tokens WHERE id=$1", [token_id]);

      // Validate — spec requires all 4 checks
      if (!tokenRes.rows.length)
        return res.status(404).json({ error: "Token not found" });

      const token = tokenRes.rows[0];

      if (token.status !== "pending")
        return res.status(409).json({ error: `Token is ${token.status}` });

      if (token.node_id !== node_id)
        return res.status(403).json({ error: "Token is not registered to this node" });

      if (new Date(token.expires_at) < new Date())
        return res.status(410).json({ error: "Token has expired" });

      // All checks pass — credit the account
      await client.query(
        "UPDATE tokens SET status='redeemed', redeemed_at=NOW() WHERE id=$1",
        [token_id]
      );
      const nodeRes = await client.query(
        "UPDATE nodes SET credit_balance = credit_balance + $1 WHERE id = $2 RETURNING credit_balance",
        [token.amount, node_id]
      );
      await client.query(
        `INSERT INTO credit_transactions(node_id, amount, type, reference)
         VALUES($1,$2,'token_redemption',$3)`,
        [node_id, token.amount, token_id]
      );

      // Queue credit update back to node (priority 1 — money first)
      await client.query(
        `INSERT INTO sync_queue(target_node, type, payload, priority)
         VALUES($1, 'credit_update', $2, 1)`,
        [node_id, JSON.stringify({ node_id, credit_balance: nodeRes.rows[0].credit_balance, token_id, amount: token.amount })]
      );

      await client.query("COMMIT");
      res.json({
        success: true,
        amount_credited: token.amount,
        new_balance: nodeRes.rows[0].credit_balance,
        token_id,
        redeemed_at: new Date(),
      });
    } catch (err) {
      await client.query("ROLLBACK");
      res.status(500).json({ error: err.message });
    } finally {
      client.release();
    }
  }
);

module.exports = router;
