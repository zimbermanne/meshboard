require("./loadEnv")();
const pool = require("./db/pool");
const { tshToBaosh } = require("./utils/currency");

const NODES = [
  { id: "NODE-A1B2-C3D4", display_name: "Arusha Market Node", credit_balance: 12, baosh_balance: tshToBaosh(12 * 500), total_spent: 8, total_spent_baosh: tshToBaosh(8 * 500) },
  { id: "NODE-E5F6-G7H8", display_name: "Moshi Community Hub", credit_balance: 5, baosh_balance: tshToBaosh(5 * 500), total_spent: 3, total_spent_baosh: tshToBaosh(3 * 500) },
  { id: "NODE-I9J0-K1L2", display_name: "Karatu Relay", credit_balance: 0, baosh_balance: 0, total_spent: 10, total_spent_baosh: tshToBaosh(10 * 500) },
];

async function seed() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    for (const n of NODES) {
      await client.query(
        `INSERT INTO nodes (id, display_name, credit_balance, baosh_balance, total_spent, total_spent_baosh, last_seen_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW() - INTERVAL '2 hours')
         ON CONFLICT (id) DO UPDATE SET
           display_name = EXCLUDED.display_name,
           credit_balance = EXCLUDED.credit_balance,
           baosh_balance = EXCLUDED.baosh_balance,
           total_spent = EXCLUDED.total_spent,
           total_spent_baosh = EXCLUDED.total_spent_baosh,
           last_seen_at = EXCLUDED.last_seen_at`,
        [n.id, n.display_name, n.credit_balance, n.baosh_balance, n.total_spent, n.total_spent_baosh]
      );
    }

    const pending = [
      { id: "MSG-DEMO01", node_id: "NODE-A1B2-C3D4", message_text: "Fresh produce at Arusha market — visit stall 12 today!", package_days: 2, credit_cost: 0, baosh_cost: 0, is_free_post: true },
      { id: "MSG-DEMO02", node_id: "NODE-E5F6-G7H8", message_text: "Community meeting Saturday 3pm at Moshi town hall.", package_days: 3, credit_cost: 3, baosh_cost: tshToBaosh(3 * 500), is_free_post: false },
    ];
    for (const p of pending) {
      await client.query(
        `INSERT INTO posts (id, node_id, message_text, package_days, credit_cost, baosh_cost, is_free_post, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
         ON CONFLICT (id) DO NOTHING`,
        [p.id, p.node_id, p.message_text, p.package_days, p.credit_cost, p.baosh_cost, p.is_free_post]
      );
    }

    const approvedAt = new Date(Date.now() - 3600 * 1000);
    const expiresAt = new Date(Date.now() + 2 * 86400 * 1000);
    await client.query(
      `INSERT INTO posts (id, node_id, message_text, package_days, credit_cost, baosh_cost, is_free_post, status, approved_at, expires_at, approved_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'approved', $8, $9, 'operator')
       ON CONFLICT (id) DO NOTHING`,
      ["MSG-LIVE01", "NODE-I9J0-K1L2", "Karatu mesh network is online — sync to receive updates.", 2, 2, tshToBaosh(2 * 500), false, approvedAt, expiresAt]
    );

    await client.query(
      `INSERT INTO payments (id, node_id, amount, baosh_amount, method, operator, notes)
       VALUES ($1, $2, $3, $4, 'cash', 'operator', 'Demo seed payment')
       ON CONFLICT (id) DO NOTHING`,
      ["PAY-DEMO01", "NODE-A1B2-C3D4", 10, tshToBaosh(10 * 500)]
    );

    await client.query("COMMIT");
    console.log("✓ Seed complete — 3 nodes, 2 pending posts, 1 live broadcast, 1 payment.");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  seed().catch((err) => {
    console.error("✗ Seed failed:", err.message);
    console.error("  Run migrations first: npm run migrate");
    process.exit(1);
  });
}

module.exports = seed;
