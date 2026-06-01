import express from 'express';
import { pool } from '../db.js';
import { generateJWT, verifyJWT, comparePassword, hashPassword } from '../utils.js';

const router = express.Router();

/**
 * POST /api/admin/login
 * Admin login with username and password
 */
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const jwtSecret = process.env.JWT_SECRET || 'dev-secret-key';

  if (!username || !password) {
    return res.status(400).json({ error: 'Missing username or password' });
  }

  try {
    // Check if user exists in database
    const result = await pool.query(
      'SELECT * FROM admin_users WHERE username = $1',
      [username]
    );

    if (result.rows.length === 0) {
      // For development: check against environment variables
      if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
        const token = generateJWT(username, jwtSecret);
        return res.json({
          token,
          username,
          message: 'Login successful'
        });
      }
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];
    const passwordMatch = await comparePassword(password, user.password_hash);

    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateJWT(username, jwtSecret);
    res.json({
      token,
      username,
      message: 'Login successful'
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

/**
 * Middleware to verify JWT token
 */
export function verifyToken(req, res, next) {
  const jwtSecret = process.env.JWT_SECRET || 'dev-secret-key';
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: 'Missing authorization header' });
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Missing token' });
  }

  const decoded = verifyJWT(token, jwtSecret);

  if (!decoded) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  req.user = decoded;
  next();
}

export default router;
