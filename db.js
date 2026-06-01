import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function initDatabase() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Nodes table
    await client.query(`
      CREATE TABLE IF NOT EXISTS nodes (
        id SERIAL PRIMARY KEY,
        node_id VARCHAR(20) UNIQUE NOT NULL,
        display_name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        credits DECIMAL(10, 2) DEFAULT 0,
        total_spent DECIMAL(10, 2) DEFAULT 0
      );
    `);

    // Credits table
    await client.query(`
      CREATE TABLE IF NOT EXISTS credits (
        id SERIAL PRIMARY KEY,
        node_id VARCHAR(20) NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        balance_before DECIMAL(10, 2),
        balance_after DECIMAL(10, 2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (node_id) REFERENCES nodes(node_id)
      );
    `);

    // Post requests table
    await client.query(`
      CREATE TABLE IF NOT EXISTS post_requests (
        id SERIAL PRIMARY KEY,
        post_id VARCHAR(50) UNIQUE NOT NULL,
        node_id VARCHAR(20) NOT NULL,
        display_name VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        link VARCHAR(500),
        phone VARCHAR(20),
        duration_days INT NOT NULL,
        cost DECIMAL(10, 2) NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        reviewed_at TIMESTAMP,
        reviewed_by VARCHAR(255),
        rejection_reason TEXT,
        FOREIGN KEY (node_id) REFERENCES nodes(node_id)
      );
    `);

    // Approved broadcasts table
    await client.query(`
      CREATE TABLE IF NOT EXISTS broadcasts (
        id SERIAL PRIMARY KEY,
        message_id VARCHAR(50) UNIQUE NOT NULL,
        node_id VARCHAR(20) NOT NULL,
        display_name VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        link VARCHAR(500),
        phone VARCHAR(20),
        duration_seconds INT NOT NULL,
        broadcast_timestamp TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT TRUE,
        FOREIGN KEY (node_id) REFERENCES nodes(node_id)
      );
    `);

    // Tokens table
    await client.query(`
      CREATE TABLE IF NOT EXISTS tokens (
        id SERIAL PRIMARY KEY,
        token_id VARCHAR(50) UNIQUE NOT NULL,
        node_id VARCHAR(20) NOT NULL,
        credit_amount DECIMAL(10, 2) NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP NOT NULL,
        redeemed_at TIMESTAMP,
        created_by VARCHAR(255) NOT NULL,
        FOREIGN KEY (node_id) REFERENCES nodes(node_id)
      );
    `);

    // Payments table
    await client.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        payment_id VARCHAR(50) UNIQUE NOT NULL,
        node_id VARCHAR(20) NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        method VARCHAR(50) NOT NULL,
        operator VARCHAR(255) NOT NULL,
        token_id VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (node_id) REFERENCES nodes(node_id),
        FOREIGN KEY (token_id) REFERENCES tokens(token_id)
      );
    `);

    // Free posts tracking (monthly)
    await client.query(`
      CREATE TABLE IF NOT EXISTS free_posts (
        id SERIAL PRIMARY KEY,
        node_id VARCHAR(20) NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        month_year VARCHAR(7) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(node_id, month_year),
        FOREIGN KEY (node_id) REFERENCES nodes(node_id)
      );
    `);

    // Admin users
    await client.query(`
      CREATE TABLE IF NOT EXISTS admin_users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create indexes for performance
    await client.query(`CREATE INDEX IF NOT EXISTS idx_nodes_node_id ON nodes(node_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_post_requests_node_id ON post_requests(node_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_post_requests_status ON post_requests(status);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_broadcasts_node_id ON broadcasts(node_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_broadcasts_active ON broadcasts(is_active);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_tokens_node_id ON tokens(node_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_tokens_status ON tokens(status);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_payments_node_id ON payments(node_id);`);

    await client.query('COMMIT');
    console.log('✓ Database initialized successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('✗ Database initialization failed:', error);
    process.exit(1);
  } finally {
    client.release();
  }
}

export { pool, initDatabase };
