require("./loadEnv")();
const pool = require("./db/pool");

async function migrate() {
  // Gracefully handle unattached database URLs during provisioning states
  const { hasDatabaseConfig } = require("./db/resolveDatabaseConfig");
  if (!hasDatabaseConfig()) {
    console.warn("⚠️ [migration] Database environment variables missing. Skipping migration execution.");
    return;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // ── Nodes ──────────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS nodes (
        id            TEXT PRIMARY KEY,
        display_name  TEXT NOT NULL,
        registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        credit_balance NUMERIC(10,2) NOT NULL DEFAULT 0,
        baosh_balance NUMERIC(10,2) NOT NULL DEFAULT 0,
        total_spent    NUMERIC(10,2) NOT NULL DEFAULT 0,
        total_spent_baosh NUMERIC(10,2) NOT NULL DEFAULT 0,
        last_seen_at   TIMESTAMPTZ,
        is_active      BOOLEAN NOT NULL DEFAULT TRUE
      );
    `);

    // ── Credits ledger ─────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS credit_transactions (
        id          SERIAL PRIMARY KEY,
        node_id     TEXT NOT NULL REFERENCES nodes(id),
        amount      NUMERIC(10,2) NOT NULL,
        baosh_amount NUMERIC(10,2) NOT NULL,
        type        TEXT NOT NULL,
        reference   TEXT,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // ── Tokens ─────────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS tokens (
        id            TEXT PRIMARY KEY,
        node_id       TEXT NOT NULL REFERENCES nodes(id),
        amount        NUMERIC(10,2) NOT NULL,
        baosh_amount  NUMERIC(10,2) NOT NULL,
        status        TEXT NOT NULL DEFAULT 'pending',
        created_by    TEXT NOT NULL,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        expires_at    TIMESTAMPTZ NOT NULL,
        redeemed_at   TIMESTAMPTZ
      );
    `);

    // ── Payments ───────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id          TEXT PRIMARY KEY,
        node_id     TEXT NOT NULL REFERENCES nodes(id),
        amount      NUMERIC(10,2) NOT NULL,
        baosh_amount NUMERIC(10,2) NOT NULL,
        method      TEXT NOT NULL,
        operator    TEXT NOT NULL,
        token_id    TEXT REFERENCES tokens(id),
        notes       TEXT,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // ── Posts ──────────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS posts (
        id              TEXT PRIMARY KEY,
        node_id         TEXT NOT NULL REFERENCES nodes(id),
        message_text    TEXT NOT NULL,
        link            TEXT,
        phone           TEXT,
        package_days    INTEGER NOT NULL,
        credit_cost     NUMERIC(10,2) NOT NULL,
        baosh_cost      NUMERIC(10,2) NOT NULL,
        is_free_post    BOOLEAN NOT NULL DEFAULT FALSE,
        status          TEXT NOT NULL DEFAULT 'pending',
        rejection_reason TEXT,
        submitted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        approved_at     TIMESTAMPTZ,
        expires_at      TIMESTAMPTZ,
        approved_by     TEXT
      );
    `);

    // ── Free post tracking ─────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS free_post_usage (
        node_id    TEXT NOT NULL REFERENCES nodes(id),
        year_month TEXT NOT NULL,
        post_id    TEXT REFERENCES posts(id),
        used_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (node_id, year_month)
      );
    `);

    // ── Sync sessions ──────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS sync_sessions (
        id            SERIAL PRIMARY KEY,
        peer_node_id  TEXT NOT NULL,
        direction     TEXT NOT NULL,
        transport     TEXT NOT NULL,
        items_sent    INTEGER NOT NULL DEFAULT 0,
        items_received INTEGER NOT NULL DEFAULT 0,
        started_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        completed_at  TIMESTAMPTZ,
        status        TEXT NOT NULL DEFAULT 'started'
      );
    `);

    // ── Sync queue ─────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS sync_queue (
        id          SERIAL PRIMARY KEY,
        target_node TEXT,
        type        TEXT NOT NULL,
        payload     JSONB NOT NULL,
        priority    INTEGER NOT NULL DEFAULT 3,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        delivered_at TIMESTAMPTZ
      );
    `);

    // ── Indexes ────────────────────────────────────────────────────────────
    await client.query(`CREATE INDEX IF NOT EXISTS idx_posts_status      ON posts(status);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_posts_node        ON posts(node_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_tokens_node       ON tokens(node_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_tokens_status     ON tokens(status);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_payments_node     ON payments(node_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_sync_queue_target ON sync_queue(target_node, delivered_at);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_credit_tx_node    ON credit_transactions(node_id);`);

    await client.query("COMMIT");
    console.log("✓ Migration complete — all tables created.");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("✗ Migration failed inside transaction:", err.message);
    throw err; // Forward to let calling application handle log presentation
  } finally {
    client.release();
  }
}

if (require.main === module) {
  migrate()
    .then(() => pool.end())
    .catch((err) => {
      console.error("[fatal] CLI Migration script crashed:", err.message);
      process.exit(1);
    });
} else {
  module.exports = migrate;
}
