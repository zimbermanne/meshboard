// utils/nodeProvision.js
//
// Web/app users no longer need to type in a hardware NODE-XXXX-XXXX id by
// hand. Every account gets a "virtual" node auto-created and linked behind
// the scenes on registration, so credits/posts/tokens (which are all keyed
// on node_id under the hood) just work without the user knowing a node
// concept exists. Owners of real mesh hardware can still relink to their
// physical node's real id later from their profile — this just removes the
// requirement for everyone else.

const pool = require("../db/pool");

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

function randomSegment(length) {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return out;
}

function generateNodeId() {
  return `NODE-${randomSegment(4)}-${randomSegment(4)}`;
}

/**
 * Create a new node row with a fresh, guaranteed-unique id and return it.
 * Retries on the (very unlikely) chance of a collision.
 */
async function provisionVirtualNode(displayName, { client = pool } = {}) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const id = generateNodeId();
    try {
      const { rows } = await client.query(
        `INSERT INTO nodes(id, display_name, last_seen_at)
         VALUES($1, $2, NOW())
         RETURNING *`,
        [id, displayName || id]
      );
      return rows[0];
    } catch (err) {
      // 23505 = unique_violation — extremely unlikely with 36^8 combos, but retry just in case
      if (err.code === "23505") continue;
      throw err;
    }
  }
  throw new Error("Could not generate a unique node id after several attempts");
}

module.exports = { provisionVirtualNode, generateNodeId };
