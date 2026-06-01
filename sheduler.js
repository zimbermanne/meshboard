/**
 * Background scheduler
 * Runs two jobs:
 *   1. Every minute  — expire tokens past their 48h window
 *   2. Every 5 mins  — expire posts past their duration, queue cleanup to nodes
 */

const pool = require("../db/pool");

async function expireTokens() {
  try {
    const { rowCount } = await pool.query(
      "UPDATE tokens SET status='expired' WHERE status='pending' AND expires_at < NOW()"
    );
    if (rowCount > 0) console.log(`[scheduler] Expired ${rowCount} token(s)`);
  } catch (err) {
    console.error("[scheduler] expireTokens error:", err.message);
  }
}

async function expirePosts() {
  try {
    const { rows } = await pool.query(
      `SELECT id FROM posts WHERE status='approved' AND expires_at < NOW() AND expires_at IS NOT NULL`
    );
    if (!rows.length) return;

    const ids = rows.map(r => r.id);

    // Queue global cleanup notice (delivered to all nodes on next sync)
    await pool.query(
      `INSERT INTO sync_queue(target_node, type, payload, priority)
       VALUES(NULL, 'expiry_cleanup', $1, 3)`,
      [JSON.stringify({ expired_post_ids: ids })]
    );

    console.log(`[scheduler] Queued expiry cleanup for ${ids.length} post(s):`, ids.join(", "));
  } catch (err) {
    console.error("[scheduler] expirePosts error:", err.message);
  }
}

function start() {
  // Run immediately on boot
  expireTokens();
  expirePosts();

  // Then on interval
  setInterval(expireTokens, 60 * 1000);           // every 1 minute
  setInterval(expirePosts,   5 * 60 * 1000);       // every 5 minutes

  console.log("[scheduler] Background jobs started");
}

module.exports = { start };