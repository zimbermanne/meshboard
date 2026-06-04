const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool(
  process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      }
    : {
        host:      process.env.DB_HOST     || "localhost",
        port:      parseInt(process.env.DB_PORT || "5432"),
        database:  process.env.DB_NAME     || "meshboard",
        user:      process.env.DB_USER     || "postgres",
        password:  process.env.DB_PASSWORD || "",
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      }
);

// --- NEW CODE: Automatic Table Creation ---
const initDb = async () => {
  const schema = `
    CREATE TABLE IF NOT EXISTS nodes (
        id TEXT PRIMARY KEY,
        display_name VARCHAR(80) NOT NULL,
        registered_at TIMESTAMP DEFAULT NOW(),
        last_seen_at TIMESTAMP DEFAULT NOW(),
        credit_balance DECIMAL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS posts (
        id SERIAL PRIMARY KEY,
        node_id TEXT REFERENCES nodes(id),
        status TEXT DEFAULT 'pending',
        content TEXT,
        submitted_at TIMESTAMP DEFAULT NOW(),
        expires_at TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        node_id TEXT REFERENCES nodes(id),
        amount DECIMAL NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS tokens (
        id SERIAL PRIMARY KEY,
        node_id TEXT REFERENCES nodes(id),
        token_value TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS sync_queue (
        id SERIAL PRIMARY KEY,
        target_node TEXT REFERENCES nodes(id),
        type TEXT NOT NULL,
        payload JSONB,
        priority INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS credit_transactions (
        id SERIAL PRIMARY KEY,
        node_id TEXT REFERENCES nodes(id),
        amount DECIMAL NOT NULL,
        type TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
    );
  `;

  try {
    await pool.query(schema);
    console.log("✅ Database schema initialized (Tables are ready)");
  } catch (err) {
    console.error("❌ Database initialization failed:", err);
  }
};

// Run the initialization
initDb();
// ------------------------------------------

pool.on("error", (err) => {
  console.error("Unexpected PostgreSQL pool error:", err);
});

module.exports = pool;
