require("dotenv").config();
const pool = require("./db/pool");

function nodeId() {
  const seg = () => Math.random().toString(36).toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,4).padEnd(4,"X");
  return `NODE-${seg()}-${seg()}`;
}
function tokenId(nid) {
  const seg = () => Math.random().toString(36).toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,4).padEnd(4,"X");
  return `TXN-${seg()}-${nid.slice(5,9)}-${seg()}`;
}
function postId() {
  return "MSG-" + Math.random().toString(36).toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,6);
}
function payId() {
  return "PAY-" + Math.random().toString(36).toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,6);
}

async function seed() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Clear existing seed data
    await client.query("DELETE FROM sync_queue");
    await client.query("DELETE FROM sync_sessions");
    await client.query("DELETE FROM free_post_usage");
    await client.query("DELETE FROM posts");
    await client.query("DELETE FROM credit_transactions");
    await client.query("DELETE FROM payments");
    await client.query("DELETE FROM tokens");
    await client.query("DELETE FROM nodes");

    // ── Nodes ──────────────────────────────────────────────────────────────
    const nodes = [
      { id: nodeId(), name: "Mama Pima Boutique",      balance: 12, spent: 18 },
      { id: nodeId(), name: "Karibu Hardware",          balance:  5, spent: 35 },
      { id: nodeId(), name: "Dada Juice Bar",           balance:  0, spent:  7 },
      { id: nodeId(), name: "Kilimanjaro Printers",     balance: 22, spent: 50 },
      { id: nodeId(), name: "Bora Tyres",               balance:  8, spent: 14 },
      { id: nodeId(), name: "Safi Laundry Services",    balance:  3, spent:  6 },
    ];

    for (const n of nodes) {
      await client.query(
        `INSERT INTO nodes(id, display_name, credit_balance, total_spent, last_seen_at)
         VALUES($1,$2,$3,$4, NOW() - INTERVAL '${Math.floor(Math.random()*60)} minutes')`,
        [n.id, n.name, n.balance, n.spent]
      );
    }

    // ── Tokens ─────────────────────────────────────────────────────────────
    const tokenData = [
      { node: nodes[0], amount: 10, status: "redeemed", daysAgo: 3 },
      { node: nodes[1], amount:  7, status: "pending",  daysAgo: 0 },
      { node: nodes[3], amount: 15, status: "redeemed", daysAgo: 6 },
      { node: nodes[2], amount:  5, status: "expired",  daysAgo: 11},
      { node: nodes[4], amount: 10, status: "pending",  daysAgo: 0 },
    ];

    const tokenIds = [];
    for (const t of tokenData) {
      const tid = tokenId(t.node.id);
      tokenIds.push(tid);
      await client.query(
        `INSERT INTO tokens(id, node_id, amount, status, created_by, created_at, expires_at, redeemed_at)
         VALUES($1,$2,$3,$4,$5, NOW()-INTERVAL '${t.daysAgo} days',
                NOW()-INTERVAL '${t.daysAgo} days'+INTERVAL '48 hours',
                ${t.status === "redeemed" ? `NOW()-INTERVAL '${t.daysAgo-1} days'` : "NULL"})`,
        [tid, t.node.id, t.amount, t.status, "operator-01"]
      );
    }

    // ── Payments ───────────────────────────────────────────────────────────
    for (let i = 0; i < tokenData.length; i++) {
      const t = tokenData[i];
      await client.query(
        `INSERT INTO payments(id, node_id, amount, method, operator, token_id, created_at)
         VALUES($1,$2,$3,$4,$5,$6, NOW()-INTERVAL '${t.daysAgo} days')`,
        [payId(), t.node.id, t.amount, i % 2 === 0 ? "mpesa" : "cash", "operator-01", tokenIds[i]]
      );
    }

    // ── Posts ──────────────────────────────────────────────────────────────
    const postData = [
      { node: nodes[0], text: "Fresh dresses and kitenge — new stock arrived! Visit us near Clock Tower.", days: 3, cost: 3, status: "pending"  },
      { node: nodes[1], text: "Cement, nails, roofing sheets — best prices in Arusha. Delivery available.", days: 7, cost: 7, status: "pending"  },
      { node: nodes[2], text: "Fresh mango, passion and avocado juice daily 7am–7pm. Come taste! 🍹",      days: 2, cost: 0, status: "pending", free: true },
      { node: nodes[3], text: "Business cards, banners, and flyers printed same day. WhatsApp orders welcome.", days: 5, cost: 5, status: "approved" },
      { node: nodes[4], text: "All tyre sizes in stock. Puncture repair, balancing and alignment. Open Sundays.", days: 2, cost: 2, status: "approved" },
      { node: nodes[5], text: "Free pickup and delivery this week only! 📦",                                days: 1, cost: 1, status: "approved" },
    ];

    for (const p of postData) {
      const pid = postId();
      const approvedAt  = p.status === "approved" ? `NOW() - INTERVAL '${Math.floor(Math.random()*3)} days'` : "NULL";
      const expiresAt   = p.status === "approved" ? `NOW() - INTERVAL '${Math.floor(Math.random()*3)} days' + INTERVAL '${p.days} days'` : "NULL";
      await client.query(
        `INSERT INTO posts(id, node_id, message_text, package_days, credit_cost, is_free_post, status, approved_at, expires_at, approved_by)
         VALUES($1,$2,$3,$4,$5,$6,$7, ${approvedAt}, ${expiresAt}, ${p.status==="approved"?"'operator-01'":"NULL"})`,
        [pid, p.node.id, p.text, p.days, p.cost, p.free || false, p.status]
      );
    }

    await client.query("COMMIT");
    console.log("✓ Seed complete.");
    console.log("  Nodes:", nodes.map(n => `${n.name} → ${n.id}`).join("\n         "));
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("✗ Seed failed:", err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
