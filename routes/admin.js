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
router.get('/dashboard', (req, res) => {
  try {
    const nodesResult = pool.query('SELECT COUNT(*) as count FROM nodes');
    const broadcastsResult = pool.query('SELECT COUNT(*) as count FROM broadcasts WHERE is_active = 1');
    const pendingResult = pool.query('SELECT COUNT(*) as count FROM post_requests WHERE status = ?', ['pending']);
    const revenueResult = pool.query(
      'SELECT COALESCE(SUM(amount), 0) as total FROM payments'
    );

    const lastSyncResult = pool.query(
      'SELECT MAX(created_at) as last_sync FROM post_requests'
    );

    res.json({
      stats: {
        total_nodes: nodesResult.rows[0].count,
        active_broadcasts: broadcastsResult.rows[0].count,
        pending_approvals: pendingResult.rows[0].count,
        monthly_revenue: revenueResult.rows[0].total,
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
router.get('/pending-posts', (req, res) => {
  try {
    const result = pool.query(
      `SELECT * FROM post_requests WHERE status = ? 
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
router.get('/nodes', (req, res) => {
  const { search } = req.query;

  try {
    let query = 'SELECT * FROM nodes ORDER BY created_at DESC';
    let params = [];

    if (search) {
      query = `SELECT * FROM nodes 
               WHERE node_id LIKE ? OR display_name LIKE ?
               ORDER BY created_at DESC`;
      params = [`%${search}%`, `%${search}%`];
    }

    const result = pool.query(query, params);

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
router.get('/node/:nodeId', (req, res) => {
  const { nodeId } = req.params;

  try {
    // Get node info
    const nodeResult = pool.query(
      'SELECT * FROM nodes WHERE node_id = ?',
      [nodeId]
    );

    if (nodeResult.rows.length === 0) {
      return res.status(404).json({ error: 'Node not found' });
    }

    // Get token history
    const tokensResult = pool.query(
      'SELECT * FROM tokens WHERE node_id = ? ORDER BY created_at DESC',
      [nodeId]
    );

    // Get payment history
    const paymentsResult = pool.query(
      'SELECT * FROM payments WHERE node_id = ? ORDER BY created_at DESC',
      [nodeId]
    );

    // Get post history
    const postsResult = pool.query(
      'SELECT * FROM post_requests WHERE node_id = ? ORDER BY created_at DESC LIMIT 20',
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
router.get('/tokens', (req, res) => {
  const { status, node_id } = req.query;

  try {
    let query = 'SELECT * FROM tokens ORDER BY created_at DESC';
    let params = [];

    if (status && node_id) {
      query = 'SELECT * FROM tokens WHERE status = ? AND node_id = ? ORDER BY created_at DESC';
      params = [status, node_id];
    } else if (status) {
      query = 'SELECT * FROM tokens WHERE status = ? ORDER BY created_at DESC';
      params = [status];
    } else if (node_id) {
      query = 'SELECT * FROM tokens WHERE node_id = ? ORDER BY created_at DESC';
      params = [node_id];
    }

    const result = pool.query(query, params);

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
router.get('/payments', (req, res) => {
  const { method, startDate, endDate } = req.query;

  try {
    let query = `SELECT p.*, n.display_name FROM payments p 
                 LEFT JOIN nodes n ON p.node_id = n.node_id
                 WHERE 1=1`;
    let params = [];

    if (method) {
      query += ` AND p.method = ?`;
      params.push(method);
    }

    if (startDate) {
      query += ` AND p.created_at >= ?`;
      params.push(startDate);
    }

    if (endDate) {
      query += ` AND p.created_at <= ?`;
      params.push(endDate);
    }

    query += ' ORDER BY p.created_at DESC';

    const result = pool.query(query, params);

    // Calculate totals
    const totalResult = pool.query(
      'SELECT COALESCE(SUM(amount), 0) as total FROM payments'
    );

    res.json({
      payments: result.rows,
      count: result.rows.length,
      total_revenue: totalResult.rows[0].total
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
router.get('/broadcasts', (req, res) => {
  try {
    const result = pool.query(
      `SELECT * FROM broadcasts
       WHERE is_active = 1
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
router.post('/broadcast/expire/:messageId', (req, res) => {
  const { messageId } = req.params;

  try {
    const result = pool.query(
      'UPDATE broadcasts SET is_active = 0 WHERE message_id = ? RETURNING *',
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
