import Database from 'better-sqlite3';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, 'meshboard.db');

// Initialize SQLite database
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

// Wrapper to mimic pg pool API
const pool = {
  query: (sql, params = []) => {
    try {
      const stmt = db.prepare(sql);
      if (params.length === 0) {
        // SELECT queries
        if (sql.trim().toUpperCase().startsWith('SELECT')) {
          const rows = stmt.all();
          return { rows, rowCount: rows.length };
        }
        // INSERT/UPDATE/DELETE queries
        const result = stmt.run();
        return { rows: result.changes > 0 ? [{ id: result.lastInsertRowid }] : [], rowCount: result.changes };
      } else {
        // Parametrized queries
        if (sql.trim().toUpperCase().startsWith('SELECT')) {
          const rows = stmt.all(...params);
          return { rows, rowCount: rows.length };
        }
        const result = stmt.run(...params);
        return { rows: result.changes > 0 ? [{ id: result.lastInsertRowid }] : [], rowCount: result.changes };
      }
    } catch (error) {
      console.error('Database query error:', error, 'SQL:', sql);
      throw error;
    }
  }
};

function initDatabase() {
  try {
    // Nodes table
    db.exec(`
      CREATE TABLE IF NOT EXISTS nodes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        node_id TEXT UNIQUE NOT NULL,
        display_name TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        credits REAL DEFAULT 0,
        total_spent REAL DEFAULT 0
      );
    `);

    // Credits table
    db.exec(`
      CREATE TABLE IF NOT EXISTS credits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        node_id TEXT NOT NULL,
        amount REAL NOT NULL,
        balance_before REAL,
        balance_after REAL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (node_id) REFERENCES nodes(node_id)
      );
    `);

    // Post requests table
    db.exec(`
      CREATE TABLE IF NOT EXISTS post_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        post_id TEXT UNIQUE NOT NULL,
        node_id TEXT NOT NULL,
        display_name TEXT NOT NULL,
        message TEXT NOT NULL,
        link TEXT,
        phone TEXT,
        duration_days INTEGER NOT NULL,
        cost REAL NOT NULL,
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        reviewed_at DATETIME,
        reviewed_by TEXT,
        rejection_reason TEXT,
        FOREIGN KEY (node_id) REFERENCES nodes(node_id)
      );
    `);

    // Broadcasts table
    db.exec(`
      CREATE TABLE IF NOT EXISTS broadcasts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        message_id TEXT UNIQUE NOT NULL,
        node_id TEXT NOT NULL,
        display_name TEXT NOT NULL,
        message TEXT NOT NULL,
        link TEXT,
        phone TEXT,
        duration_seconds INTEGER NOT NULL,
        broadcast_timestamp DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_active INTEGER DEFAULT 1,
        FOREIGN KEY (node_id) REFERENCES nodes(node_id)
      );
    `);

    // Tokens table
    db.exec(`
      CREATE TABLE IF NOT EXISTS tokens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        token_id TEXT UNIQUE NOT NULL,
        node_id TEXT NOT NULL,
        credit_amount REAL NOT NULL,
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME NOT NULL,
        redeemed_at DATETIME,
        created_by TEXT NOT NULL,
        FOREIGN KEY (node_id) REFERENCES nodes(node_id)
      );
    `);

    // Payments table
    db.exec(`
      CREATE TABLE IF NOT EXISTS payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        payment_id TEXT UNIQUE NOT NULL,
        node_id TEXT NOT NULL,
        amount REAL NOT NULL,
        method TEXT NOT NULL,
        operator TEXT NOT NULL,
        token_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (node_id) REFERENCES nodes(node_id),
        FOREIGN KEY (token_id) REFERENCES tokens(token_id)
      );
    `);

    // Free posts tracking
    db.exec(`
      CREATE TABLE IF NOT EXISTS free_posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        node_id TEXT NOT NULL,
        used INTEGER DEFAULT 0,
        month_year TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(node_id, month_year),
        FOREIGN KEY (node_id) REFERENCES nodes(node_id)
      );
    `);

    // Admin users
    db.exec(`
      CREATE TABLE IF NOT EXISTS admin_users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create indexes
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_nodes_node_id ON nodes(node_id);
      CREATE INDEX IF NOT EXISTS idx_post_requests_node_id ON post_requests(node_id);
      CREATE INDEX IF NOT EXISTS idx_post_requests_status ON post_requests(status);
      CREATE INDEX IF NOT EXISTS idx_broadcasts_node_id ON broadcasts(node_id);
      CREATE INDEX IF NOT EXISTS idx_broadcasts_active ON broadcasts(is_active);
      CREATE INDEX IF NOT EXISTS idx_tokens_node_id ON tokens(node_id);
      CREATE INDEX IF NOT EXISTS idx_tokens_status ON tokens(status);
      CREATE INDEX IF NOT EXISTS idx_payments_node_id ON payments(node_id);
    `);

    console.log('✓ Database initialized successfully at', dbPath);
  } catch (error) {
    console.error('✗ Database initialization failed:', error);
    process.exit(1);
  }
}

export { db, pool, initDatabase };
