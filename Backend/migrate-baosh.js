require("./loadEnv")();
const pool = require("./db/pool");

async function migrateBaosh() {
  if (!process.env.DATABASE_URL && !process.env.DB_HOST) {
    console.warn("⚠️ [migration] Database environment variables missing. Skipping migration execution.");
    return;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Add baosh columns to nodes table
    await client.query(`
      ALTER TABLE nodes 
      ADD COLUMN IF NOT EXISTS baosh_balance NUMERIC(10,2) NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS total_spent_baosh NUMERIC(10,2) NOT NULL DEFAULT 0
    `);

    // Add baosh column to credit_transactions table
    await client.query(`
      ALTER TABLE credit_transactions 
      ADD COLUMN IF NOT EXISTS baosh_amount NUMERIC(10,2) NOT NULL DEFAULT 0
    `);

    // Add baosh column to tokens table
    await client.query(`
      ALTER TABLE tokens 
      ADD COLUMN IF NOT EXISTS baosh_amount NUMERIC(10,2) NOT NULL DEFAULT 0
    `);

    // Add baosh column to payments table
    await client.query(`
      ALTER TABLE payments 
      ADD COLUMN IF NOT EXISTS baosh_amount NUMERIC(10,2) NOT NULL DEFAULT 0
    `);

    // Add baosh column to posts table
    await client.query(`
      ALTER TABLE posts 
      ADD COLUMN IF NOT EXISTS baosh_cost NUMERIC(10,2) NOT NULL DEFAULT 0
    `);

    // Update existing data: convert credits to baosh (1 credit = 500 TSH = 1 baosh)
    await client.query(`
      UPDATE nodes 
      SET baosh_balance = credit_balance,
          total_spent_baosh = total_spent
      WHERE baosh_balance = 0
    `);

    await client.query(`
      UPDATE credit_transactions 
      SET baosh_amount = amount
      WHERE baosh_amount = 0
    `);

    await client.query(`
      UPDATE tokens 
      SET baosh_amount = amount
      WHERE baosh_amount = 0
    `);

    await client.query(`
      UPDATE payments 
      SET baosh_amount = amount
      WHERE baosh_amount = 0
    `);

    await client.query(`
      UPDATE posts 
      SET baosh_cost = credit_cost
      WHERE baosh_cost = 0
    `);

    await client.query("COMMIT");
    console.log("✓ Baosh migration complete — all baosh columns added and data converted.");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("✗ Baosh migration failed:", err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  migrateBaosh()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("[fatal] Baosh migration failed:", err.message);
      process.exit(1);
    });
} else {
  module.exports = migrateBaosh;
}
