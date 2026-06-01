import express from 'express';
import { pool } from '../db.js';
import { generateMessageId, daysToSeconds, getPrice, getCurrentMonth } from '../utils.js';

const router = express.Router();

/**
 * POST /api/approve/:postId
 * Operator approves a post request
 */
router.post('/approve/:postId', async (req, res) => {
  const { postId } = req.params;
  const { operatorId } = req.body;

  if (!operatorId) {
    return res.status(400).json({ error: 'Missing operatorId' });
  }

  try {
    // Get post request
    const postResult = await pool.query(
      'SELECT * FROM post_requests WHERE post_id = $1',
      [postId]
    );

    if (postResult.rows.length === 0) {
      return res.status(404).json({ error: 'Post request not found' });
    }

    const post = postResult.rows[0];

    if (post.status !== 'pending') {
      return res.status(400).json({ error: `Post has already been ${post.status}` });
    }

    // Get node info
    const nodeResult = await pool.query(
      'SELECT credits FROM nodes WHERE node_id = $1',
      [post.node_id]
    );

    const node = nodeResult.rows[0];

    // For free posts, mark as used; for paid, deduct credits
    if (post.cost > 0) {
      if (node.credits < post.cost) {
        return res.status(402).json({ error: 'Insufficient credits for this approval' });
      }

      // Deduct credits
      const newBalance = node.credits - post.cost;
      await pool.query(
        'UPDATE nodes SET credits = $1, total_spent = total_spent + $2 WHERE node_id = $3',
        [newBalance, post.cost, post.node_id]
      );

      // Log credit deduction
      await pool.query(
        'INSERT INTO credits (node_id, amount, balance_before, balance_after) VALUES ($1, $2, $3, $4)',
        [post.node_id, -post.cost, node.credits, newBalance]
      );
    } else {
      // Mark free post as used
      const currentMonth = getCurrentMonth();
      await pool.query(
        `INSERT INTO free_posts (node_id, month_year, used)
         VALUES ($1, $2, TRUE)
         ON CONFLICT (node_id, month_year) DO UPDATE SET used = TRUE`,
        [post.node_id, currentMonth]
      );
    }

    // Create broadcast message
    const messageId = generateMessageId();
    const durationSeconds = daysToSeconds(post.duration_days);
    const broadcastTimestamp = new Date();

    await pool.query(
      `INSERT INTO broadcasts 
       (message_id, node_id, display_name, message, link, phone, duration_seconds, broadcast_timestamp, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE)`,
      [messageId, post.node_id, post.display_name, post.message, post.link, post.phone, durationSeconds, broadcastTimestamp]
    );

    // Update post request status
    await pool.query(
      'UPDATE post_requests SET status = $1, reviewed_at = CURRENT_TIMESTAMP, reviewed_by = $2 WHERE post_id = $3',
      ['approved', operatorId, postId]
    );

    res.json({
      message: 'Post approved successfully',
      message_id: messageId,
      broadcast: {
        message_id: messageId,
        display_name: post.display_name,
        message: post.message,
        link: post.link,
        phone: post.phone,
        duration_days: post.duration_days
      }
    });
  } catch (error) {
    console.error('Approval error:', error);
    res.status(500).json({ error: 'Approval failed' });
  }
});

/**
 * POST /api/reject/:postId
 * Operator rejects a post request
 */
router.post('/reject/:postId', async (req, res) => {
  const { postId } = req.params;
  const { operatorId, reason } = req.body;

  if (!operatorId) {
    return res.status(400).json({ error: 'Missing operatorId' });
  }

  try {
    // Get post request
    const postResult = await pool.query(
      'SELECT * FROM post_requests WHERE post_id = $1',
      [postId]
    );

    if (postResult.rows.length === 0) {
      return res.status(404).json({ error: 'Post request not found' });
    }

    const post = postResult.rows[0];

    if (post.status !== 'pending') {
      return res.status(400).json({ error: `Post has already been ${post.status}` });
    }

    // Update post request status
    await pool.query(
      'UPDATE post_requests SET status = $1, reviewed_at = CURRENT_TIMESTAMP, reviewed_by = $2, rejection_reason = $3 WHERE post_id = $4',
      ['rejected', operatorId, reason || null, postId]
    );

    res.json({
      message: 'Post rejected successfully',
      post_id: postId
    });
  } catch (error) {
    console.error('Rejection error:', error);
    res.status(500).json({ error: 'Rejection failed' });
  }
});

export default router;
