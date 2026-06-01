import express from 'express';
import { pool } from '../db.js';
import { verifyToken } from './auth.js';

const router = express.Router();

// All admin routes require JWT verification
router.use(verifyToken);

/**
 * GET /api/admin/dashboard
 * Get overview stats
 */
router.get('/dashboard', async (req, res) => {
  try {
    const nodesResult = await pool.query('SELECT COUNT(*) FROM nodes');
    const broadcastsResult = await pool.query('SELECT COUNT(*) FROM broadcasts WHERE is_active = TRUE');
    const pendingResult = await pool.query('SELECT COUNT(*) FROM post_requests WHERE status = $1', ['pending']);
    const revenueResult = await pool.query(
      'SELECT COALESCE(SUM(amount), 0) as total FROM payments'
    );

    const lastSyncResult = await pool.query(
      'SELECT MAX(created_at) as last_sync FROM post_requests'
    );

    res.json({
      stats: {
        total_nodes: parseInt(nodesResult.rows[0].count),
        active_broadcasts: parseInt(broadcastsResult.rows[0].count),
        pending_approvals: parseInt(pendingResult.rows[0].count),
        monthly_revenue: parseFloat(revenueResult.rows[0].total),
        last_sync: lastSyncResult.rows[0].last_sync
      }
    });
  } catch (error) {
    console.error('Dashboard fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

/**
 * GET /api/admin/pending-posts
 * Get approval queue (pending post requests)
 */
router.get('/pending-posts', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM post_requests WHERE status = $1 
       ORDER BY created_at DESC`,
      ['pending']
    );

    res.json({
      posts: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Pending posts fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch pending posts' });
  }
});

/**
 * GET /api/admin/nodes
 * Get all registered nodes (searchable)
 */
router.get('/nodes', async (req, res) => {
  const { search } = req.query;

  try {
    let query = 'SELECT * FROM nodes ORDER BY created_at DESC';
    let params = [];

    if (search) {
      query = `SELECT * FROM nodes 
               WHERE node_id ILIKE $1 OR display_name ILIKE $1
               ORDER BY created_at DESC`;
      params = [`%${search}%`];
    }

    const result = await pool.query(query, params);

    res.json({
      nodes: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Nodes fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch nodes' });
  }
});

/**
 * GET /api/admin/node/:nodeId
 * Get detailed node information
 */
router.get('/node/:nodeId', async (req, res) => {
  const { nodeId } = req.params;

  try {
    // Get node info
    const nodeResult = await pool.query(
      'SELECT * FROM nodes WHERE node_id = $1',
      [nodeId]
    );

    if (nodeResult.rows.length === 0) {
      return res.status(404).json({ error: 'Node not found' });
    }

    // Get token history
    const tokensResult = await pool.query(
      'SELECT * FROM tokens WHERE node_id = $1 ORDER BY created_at DESC',
      [nodeId]
    );

    // Get payment history
    const paymentsResult = await pool.query(
      'SELECT * FROM payments WHERE node_id = $1 ORDER BY created_at DESC',
      [nodeId]
    );

    // Get post history
    const postsResult = await pool.query(
      'SELECT * FROM post_requests WHERE node_id = $1 ORDER BY created_at DESC LIMIT 20',
      [nodeId]
    );

    res.json({
      node: nodeResult.rows[0],
      tokens: tokensResult.rows,
      payments: paymentsResult.rows,
      recent_posts: postsResult.rows
    });
  } catch (error) {
    console.error('Node detail fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch node details' });
  }
});

/**
 * GET /api/admin/tokens
 * Get all tokens with filter options
 */
router.get('/tokens', async (req, res) => {
  const { status, node_id } = req.query;

  try {
    let query = 'SELECT * FROM tokens ORDER BY created_at DESC';
    let params = [];

    if (status && node_id) {
      query = 'SELECT * FROM tokens WHERE status = $1 AND node_id = $2 ORDER BY created_at DESC';
      params = [status, node_id];
    } else if (status) {
      query = 'SELECT * FROM tokens WHERE status = $1 ORDER BY created_at DESC';
      params = [status];
    } else if (node_id) {
      query = 'SELECT * FROM tokens WHERE node_id = $1 ORDER BY created_at DESC';
      params = [node_id];
    }

    const result = await pool.query(query, params);

    res.json({
      tokens: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Tokens fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch tokens' });
  }
});

/**
 * GET /api/admin/payments
 * Get payment log with optional filters
 */
router.get('/payments', async (req, res) => {
  const { method, startDate, endDate } = req.query;

  try {
    let query = `SELECT p.*, n.display_name FROM payments p 
                 LEFT JOIN nodes n ON p.node_id = n.node_id
                 WHERE 1=1`;
    let params = [];
    let paramCount = 1;

    if (method) {
      query += ` AND p.method = $${paramCount}`;
      params.push(method);
      paramCount++;
    }

    if (startDate) {
      query += ` AND p.created_at >= $${paramCount}::timestamp`;
      params.push(startDate);
      paramCount++;
    }

    if (endDate) {
      query += ` AND p.created_at <= $${paramCount}::timestamp`;
      params.push(endDate);
      paramCount++;
    }

    query += ' ORDER BY p.created_at DESC';

    const result = await pool.query(query, params);

    // Calculate totals
    const totalResult = await pool.query(
      'SELECT COALESCE(SUM(amount), 0) as total FROM payments'
    );

    res.json({
      payments: result.rows,
      count: result.rows.length,
      total_revenue: parseFloat(totalResult.rows[0].total)
    });
  } catch (error) {
    console.error('Payments fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

/**
 * GET /api/admin/broadcasts
 * Get all active broadcasts with countdown info
 */
router.get('/broadcasts', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT b.*, 
              (broadcast_timestamp + (duration_seconds || ' seconds')::interval) as expires_at
       FROM broadcasts b
       WHERE is_active = TRUE
       ORDER BY broadcast_timestamp DESC`
    );

    res.json({
      broadcasts: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Broadcasts fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch broadcasts' });
  }
});

/**
 * POST /api/admin/broadcast/expire/:messageId
 * Manually expire a broadcast
 */
router.post('/broadcast/expire/:messageId', async (req, res) => {
  const { messageId } = req.params;

  try {
    const result = await pool.query(
      'UPDATE broadcasts SET is_active = FALSE WHERE message_id = $1 RETURNING *',
      [messageId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Broadcast not found' });
    }

    res.json({
      message: 'Broadcast expired',
      broadcast: result.rows[0]
    });
  } catch (error) {
    console.error('Broadcast expiry error:', error);
    res.status(500).json({ error: 'Failed to expire broadcast' });
  }
});

export default router;
