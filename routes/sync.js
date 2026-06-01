/**
 * Sync Route — implements the bidirectional mesh sync protocol.
 *
 * A node (or relay) POSTs to /api/sync with:
 *   - its node_id
 *   - transport type
 *   - a batch of inbound items (registrations, post requests, token redemptions, acks)
 *
 * The super-node:
 *   1. Processes all inbound items (in priority order per spec)
 *   2. Returns all outbound items queued for that node
 *
 * This single endpoint handles all four communication layers
 * (internet, WiFi, WiFi Direct, Bluetooth) — the transport field is
 * metadata only; the protocol is identical regardless of layer.
 */

const router  = require("express").Router();
const pool    = require("../db/pool");
const { body, validationResult } = require("express-validator");

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  next();
};

// Priority order per spec:
// 1. Token redemptions + credit updates
// 2. New registrations
// 3. Approved broadcasts + expirations
// 4. Display name updates + stats
const INBOUND_PRIORITY = {
  token_redemption: 1,
  registration:     2,
  post_request:     3,
  display_name_update: 4,
  ack:              4,
};

// POST /api/sync
router.post(
  "/",
  body("node_id").matches(/^NODE-[A-Z0-9]{4}-[A-Z0-9]{4}$/),
  body("transport").isIn(["internet", "wifi", "wifi_direct", "bluetooth"]),
  body("items").isArray(),
  validate,
  async (req, res) => {
    const { node_id, transport, items = [] } = req.body;
    const client = await pool.connect();

    // Log sync session
    const sessionRes = await pool.query(
      `INSERT INTO sync_sessions(peer_node_id, direction, transport, items_received, status)
       VALUES($1, 'bidirectional', $2, $3, 'started') RETURNING id`,
      [node_id, transport, items.length]
    );
    const sessionId = sessionRes.rows[0].id;

    const results   = { processed: [], errors: [] };
    let itemsSent   = 0;

    try {
      await client.query("BEGIN");

      // Update last_seen for this node
      await client.query(
        "UPDATE nodes SET last_seen_at = NOW() WHERE id = $1",
        [node_id]
      );

      // Sort inbound items by priority
      const sorted = [...items].sort((a, b) =>
        (INBOUND_PRIORITY[a.type] || 9) - (INBOUND_PRIORITY[b.type] || 9)
      );

      for (const item of sorted) {
        try {
          const result = await processInboundItem(client, node_id, item);
          results.processed.push({ id: item.id, type: item.type, result });
        } catch (err) {
          results.errors.push({ id: item.id, type: item.type, error: err.message });
        }
      }

      // Fetch outbound queue for this node (items targeting this node or broadcast NULL)
      // Ordered by priority, then age
      const outboundRes = await client.query(
        `SELECT * FROM sync_queue
         WHERE (target_node = $1 OR target_node IS NULL)
           AND delivered_at IS NULL
         ORDER BY priority ASC, created_at ASC
         LIMIT 200`,
        [node_id]
      );

      const outbound = outboundRes.rows;
      itemsSent = outbound.length;

      // Mark as delivered
      if (outbound.length > 0) {
        const ids = outbound.map(r => r.id);
        await client.query(
          `UPDATE sync_queue SET delivered_at = NOW() WHERE id = ANY($1)`,
          [ids]
        );
      }

      // Complete sync session
      await client.query(
        `UPDATE sync_sessions SET status='completed', completed_at=NOW(), items_sent=$1 WHERE id=$2`,
        [itemsSent, sessionId]
      );

      await client.query("COMMIT");

      res.json({
        session_id:  sessionId,
        processed:   results.processed.length,
        errors:      results.errors,
        outbound:    outbound.map(r => ({ type: r.type, payload: r.payload })),
      });

    } catch (err) {
      await client.query("ROLLBACK");
      await pool.query(
        "UPDATE sync_sessions SET status='failed', completed_at=NOW() WHERE id=$1",
        [sessionId]
      );
      res.status(500).json({ error: err.message });
    } finally {
      client.release();
    }
  }
);

// ── Inbound item processors ────────────────────────────────────────────────

async function processInboundItem(client, fromNode, item) {
  switch (item.type) {

    case "registration": {
      const { id, display_name } = item.data;
      await client.query(
        `INSERT INTO nodes(id, display_name, last_seen_at)
         VALUES($1,$2,NOW())
         ON CONFLICT(id) DO UPDATE SET last_seen_at = NOW()`,
        [id, display_name]
      );
      // Queue ack for the registering node
      const nodeRes = await client.query("SELECT credit_balance FROM nodes WHERE id=$1", [id]);
      await client.query(
        `INSERT INTO sync_queue(target_node, type, payload, priority)
         VALUES($1, 'registration_ack', $2, 2)`,
        [id, JSON.stringify({ node_id: id, credit_balance: nodeRes.rows[0]?.credit_balance || 0 })]
      );
      return { status: "registered", node_id: id };
    }

    case "post_request": {
      const { node_id, message_text, link, phone, package_days } = item.data;
      const nodeRes = await client.query("SELECT * FROM nodes WHERE id=$1", [node_id]);
      if (!nodeRes.rows.length) throw new Error("Unknown node");
      const node = nodeRes.rows[0];

      const yearMonth = new Date().toISOString().slice(0, 7);
      const freeRes   = await client.query(
        "SELECT 1 FROM free_post_usage WHERE node_id=$1 AND year_month=$2",
        [node_id, yearMonth]
      );
      const isFreePost  = freeRes.rows.length === 0 && package_days === 2;
      const credit_cost = isFreePost ? 0 : package_days;

      if (!isFreePost && node.credit_balance < credit_cost)
        throw new Error("Insufficient credits");

      const postId = "MSG-" + Math.random().toString(36).toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,6);
      await client.query(
        `INSERT INTO posts(id, node_id, message_text, link, phone, package_days, credit_cost, is_free_post)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8)
         ON CONFLICT(id) DO NOTHING`,
        [postId, node_id, message_text, link||null, phone||null, package_days, credit_cost, isFreePost]
      );
      return { status: "queued", post_id: postId };
    }

    case "token_redemption": {
      const { token_id, node_id } = item.data;
      const tokenRes = await client.query("SELECT * FROM tokens WHERE id=$1 FOR UPDATE", [token_id]);
      if (!tokenRes.rows.length)              throw new Error("Token not found");
      const token = tokenRes.rows[0];
      if (token.status !== "pending")         throw new Error(`Token is ${token.status}`);
      if (token.node_id !== node_id)          throw new Error("Token not for this node");
      if (new Date(token.expires_at) < new Date()) throw new Error("Token expired");

      await client.query("UPDATE tokens SET status='redeemed', redeemed_at=NOW() WHERE id=$1", [token_id]);
      const updated = await client.query(
        "UPDATE nodes SET credit_balance = credit_balance + $1 WHERE id=$2 RETURNING credit_balance",
        [token.amount, node_id]
      );
      await client.query(
        `INSERT INTO credit_transactions(node_id, amount, type, reference)
         VALUES($1,$2,'token_redemption',$3)`,
        [node_id, token.amount, token_id]
      );
      await client.query(
        `INSERT INTO sync_queue(target_node, type, payload, priority)
         VALUES($1, 'credit_update', $2, 1)`,
        [node_id, JSON.stringify({ node_id, credit_balance: updated.rows[0].credit_balance, token_id, amount: token.amount })]
      );
      return { status: "redeemed", amount: token.amount, new_balance: updated.rows[0].credit_balance };
    }

    case "display_name_update": {
      const { node_id, display_name } = item.data;
      await client.query(
        "UPDATE nodes SET display_name=$1 WHERE id=$2",
        [display_name, node_id]
      );
      return { status: "updated" };
    }

    case "ack": {
      // Node confirming receipt of a broadcast message — no action needed, logged implicitly
      return { status: "acknowledged" };
    }

    default:
      throw new Error(`Unknown item type: ${item.type}`);
  }
}

// GET /api/sync/status — dashboard overview of sync health
router.get("/status", async (req, res) => {
  try {
    const [sessions, queue, recent] = await Promise.all([
      pool.query(`
        SELECT transport, COUNT(*) AS count,
               MAX(completed_at) AS last_sync,
               AVG(items_sent + items_received) AS avg_items
        FROM sync_sessions WHERE status='completed' AND started_at > NOW() - INTERVAL '24 hours'
        GROUP BY transport
      `),
      pool.query(`
        SELECT type, COUNT(*) AS pending
        FROM sync_queue WHERE delivered_at IS NULL
        GROUP BY type ORDER BY pending DESC
      `),
      pool.query(`
        SELECT peer_node_id, transport, items_sent, items_received, completed_at
        FROM sync_sessions WHERE status='completed'
        ORDER BY completed_at DESC LIMIT 10
      `),
    ]);
    res.json({
      by_transport:  sessions.rows,
      queue_pending: queue.rows,
      recent_sessions: recent.rows,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
