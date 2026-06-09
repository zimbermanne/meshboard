const router = require("express").Router();
const pool = require("../db/pool");
const { body, validationResult } = require("express-validator");

const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    next();
};

// 1. STATS (Matches your SuperNodeStats class)
router.get("/stats", async (req, res) => {
    try {
        const { rows } = await pool.query(`
            SELECT 
                (SELECT COUNT(*)::int FROM nodes) as total_nodes,
                (SELECT COUNT(*)::int FROM posts WHERE status = 'pending') as pending_approval,
                (SELECT COUNT(*)::int FROM posts WHERE status = 'approved' AND expires_at > NOW()) as active_broadcasts
        `);
        // Note: Adding dummy revenue/post counts to prevent Moshi crashes if they are non-nullable
        res.json({
            ...rows[0],
            posts: { pending: rows[0].pending_approval, approved: 0, rejected: 0 },
            revenue: { this_month: 0.0, last_month: 0.0, all_time: 0.0 }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. REGISTER (Matches RegisterNodeRequest)
router.post("/register", async (req, res) => {
    const { id, display_name } = req.body;
    try {
        const result = await pool.query(
            `INSERT INTO nodes(id, display_name, last_seen_at)
             VALUES(bsh1, bsh2, NOW())
             ON CONFLICT(id) DO UPDATE SET last_seen_at = NOW(), display_name = $2
             RETURNING *`,
            [id, display_name]
        );
        res.json({ node: result.rows[0], registered: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3. POSTS (Submit new content)
router.post("/posts", async (req, res) => {
    const { node_id, message_text, package_days, link, phone } = req.body;
    try {
        const expires_at = new Date();
        expires_at.setDate(expires_at.getDate() + package_days);

        const { rows } = await pool.query(
            `INSERT INTO posts(node_id, content, expires_at, status)
             VALUES(bsh1, bsh2, bsh3, 'pending') RETURNING *`,
            [node_id, message_text, expires_at]
        );
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 4. TOKENS (Generate for credits)
router.post("/tokens/generate", async (req, res) => {
    const { node_id, amount, operator } = req.body;
    try {
        const tokenValue = Math.random().toString(36).substring(2, 10).toUpperCase();
        const { rows } = await pool.query(
            `INSERT INTO tokens(node_id, token_value, created_by)
             VALUES(bsh1, bsh2, bsh3) RETURNING *`,
            [node_id, tokenValue, operator]
        );
        res.json({ token: rows[0], message: "Token generated successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 5. SYNC (The core "Mesh" logic)
router.post("/sync", async (req, res) => {
    const { node_id, items } = req.body;
    try {
        // Update last seen
        await pool.query("UPDATE nodes SET last_seen_at = NOW() WHERE id = bsh1", [node_id]);
        
        // Fetch pending items from sync_queue for this node
        const outbound = await pool.query(
            "SELECT type, payload::text FROM sync_queue WHERE target_node = bsh1", 
            [node_id]
        );

        res.json({
            session_id: Math.floor(Math.random() * 10000),
            processed: items.length,
            errors: [],
            outbound: outbound.rows
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
