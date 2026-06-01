import express from 'express';
import { pool } from '../db.js';
import { generateNodeId, generateMessageId, daysToSeconds, getPrice } from '../utils.js';

const router = express.Router();

router.post('/register', (req, res) => {
  const { node_id, display_name } = req.body;

  if (!node_id || !display_name) {
    return res.status(400).json({ error: 'Missing node_id or display_name' });
  }

  try {
    // Check if node already exists
    const existingNode = pool.query(
      'SELECT * FROM nodes WHERE node_id = ?',
      [node_id]
    );

    if (existingNode.rows.length > 0) {
      return res.status(200).json({
        message: 'Node already registered',
        node_id: node_id,
        credits: existingNode.rows[0].credits
      });
    }

    // Register new node
    const result = pool.query(
      'INSERT INTO nodes (node_id, display_name, credits) VALUES (?, ?, ?)',
      [node_id, display_name, 0]
    );

    // Fetch the inserted node
    const node = pool.query('SELECT * FROM nodes WHERE node_id = ?', [node_id]);

    res.status(201).json({
      message: 'Node registered successfully',
      node: node.rows[0]
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

/**
 * POST /api/post-request
 * Submit a broadcast request for approval
 */
router.post('/post-request', async (req, res) => {
  const { node_id, display_name, message, link, phone, duration_days, is_free } = req.body;

  if (!node_id || !message || !duration_days) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Verify node exists
    const nodeResult = await pool.query(
      'SELECT * FROM nodes WHERE node_id = $1',
      [node_id]
    );

    if (nodeResult.rows.length === 0) {
      return res.status(404).json({ error: 'Node not found' });
    }

    const node = nodeResult.rows[0];

    // If not free, check credits
    let cost = 0;
    if (!is_free) {
      cost = getPrice(duration_days);
      if (!cost) {
        return res.status(400).json({ error: 'Invalid duration' });
      }
      if (node.credits < cost) {
        return res.status(402).json({ error: 'Insufficient credits' });
      }
    } else {
      // Check if free post available this month
      const currentMonth = new Date().toISOString().substring(0, 7);
      const freePostResult = await pool.query(
        'SELECT * FROM free_posts WHERE node_id = $1 AND month_year = $2 AND used = TRUE',
        [node_id, currentMonth]
      );
      if (freePostResult.rows.length > 0) {
        return res.status(402).json({ error: 'Free monthly post already used' });
      }
    }

    // Create post request
    const postId = `POST-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const result = await pool.query(
      `INSERT INTO post_requests 
       (post_id, node_id, display_name, message, link, phone, duration_days, cost, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [postId, node_id, display_name, message, link || null, phone || null, duration_days, cost, 'pending']
    );

    res.status(201).json({
      message: 'Post request submitted',
      post_request: result.rows[0]
    });
  } catch (error) {
    console.error('Post request error:', error);
    res.status(500).json({ error: 'Post request failed' });
  }
});

/**
 * GET /api/broadcasts
 * Fetch all active approved broadcasts
 */
router.get('/broadcasts', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM broadcasts WHERE is_active = TRUE 
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
 * GET /api/credits/:nodeId
 * Get credit balance for a node
 */
router.get('/credits/:nodeId', async (req, res) => {
  const { nodeId } = req.params;

  try {
    const result = await pool.query(
      'SELECT node_id, credits FROM nodes WHERE node_id = $1',
      [nodeId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Node not found' });
    }

    res.json({
      node_id: result.rows[0].node_id,
      credits: result.rows[0].credits
    });
  } catch (error) {
    console.error('Credits fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch credits' });
  }
});

/**
 * POST /api/token/generate
 * Operator generates a credit token for a user
 */
router.post('/token/generate', async (req, res) => {
  const { node_id, amount, operator } = req.body;

  if (!node_id || !amount || !operator) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Verify node exists
    const nodeResult = await pool.query(
      'SELECT * FROM nodes WHERE node_id = $1',
      [node_id]
    );

    if (nodeResult.rows.length === 0) {
      return res.status(404).json({ error: 'Node not found' });
    }

    // Generate token
    const tokenId = `TXN-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${node_id.substring(5, 9)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours

    const result = await pool.query(
      `INSERT INTO tokens (token_id, node_id, credit_amount, expires_at, created_by, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [tokenId, node_id, amount, expiresAt, operator, 'pending']
    );

    // Log payment
    const paymentId = `PAY-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    await pool.query(
      `INSERT INTO payments (payment_id, node_id, amount, method, operator, token_id)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [paymentId, node_id, amount, 'cash', operator, tokenId]
    );

    res.status(201).json({
      message: 'Token generated successfully',
      token: result.rows[0],
      token_string: tokenId
    });
  } catch (error) {
    console.error('Token generation error:', error);
    res.status(500).json({ error: 'Token generation failed' });
  }
});

/**
 * POST /api/token/redeem
 * User redeems a token to add credits
 */
router.post('/token/redeem', async (req, res) => {
  const { token_id, node_id } = req.body;

  if (!token_id || !node_id) {
    return res.status(400).json({ error: 'Missing token_id or node_id' });
  }

  try {
    // Verify token
    const tokenResult = await pool.query(
      'SELECT * FROM tokens WHERE token_id = $1',
      [token_id]
    );

    if (tokenResult.rows.length === 0) {
      return res.status(404).json({ error: 'Token not found' });
    }

    const token = tokenResult.rows[0];

    // Validate token
    if (token.node_id !== node_id) {
      return res.status(403).json({ error: 'Token is not tied to this node ID' });
    }

    if (token.status !== 'pending') {
      return res.status(400).json({ error: `Token has already been ${token.status}` });
    }

    if (new Date() > new Date(token.expires_at)) {
      return res.status(400).json({ error: 'Token has expired' });
    }

    // Get current balance
    const nodeResult = await pool.query(
      'SELECT credits FROM nodes WHERE node_id = $1',
      [node_id]
    );

    const balanceBefore = nodeResult.rows[0].credits;
    const balanceAfter = parseFloat(balanceBefore) + parseFloat(token.credit_amount);

    // Update credits
    await pool.query(
      'UPDATE nodes SET credits = $1 WHERE node_id = $2',
      [balanceAfter, node_id]
    );

    // Log credit addition
    await pool.query(
      'INSERT INTO credits (node_id, amount, balance_before, balance_after) VALUES ($1, $2, $3, $4)',
      [node_id, token.credit_amount, balanceBefore, balanceAfter]
    );

    // Mark token as redeemed
    await pool.query(
      'UPDATE tokens SET status = $1, redeemed_at = CURRENT_TIMESTAMP WHERE token_id = $2',
      ['redeemed', token_id]
    );

    res.json({
      message: 'Token redeemed successfully',
      credits_added: token.credit_amount,
      new_balance: balanceAfter
    });
  } catch (error) {
    console.error('Token redemption error:', error);
    res.status(500).json({ error: 'Token redemption failed' });
  }
});

export default router;
