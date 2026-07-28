const jwt = require("jsonwebtoken");

const INSECURE_DEV_SECRET = "meshboard-dev-secret-change-in-production";

if (!process.env.JWT_SECRET) {
  if (process.env.NODE_ENV === "production") {
    // Refuse to boot with a guessable secret in production — a missing
    // JWT_SECRET here previously meant every token (including admin ones)
    // was signed with a public, hardcoded string.
    throw new Error(
      "JWT_SECRET is not set. Refusing to start in production with an insecure default. " +
      "Set JWT_SECRET in your environment (e.g. Railway variables) and redeploy."
    );
  }
  console.warn(
    "[auth] WARNING: JWT_SECRET is not set. Using an insecure development-only " +
    "default — tokens will not be valid across restarts and this must never " +
    "be used in production."
  );
}

const JWT_SECRET = process.env.JWT_SECRET || INSECURE_DEV_SECRET;
const JWT_EXPIRES = process.env.JWT_EXPIRES || "7d";

function signToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role || "user",
      node_id: user.node_id || null,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  );
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: "Authentication required", hint: "Log in to access the dashboard." });
  }
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired session", hint: "Please log in again." });
  }
}

async function requireAdmin(req, res, next) {
  if (req.user?.role === "admin") {
    return next();
  }

  try {
    const pool = require("../db/pool");
    const { rows } = await pool.query(
      "SELECT role FROM dashboard_users WHERE id = $1",
      [req.user.sub]
    );
    if (rows[0]?.role === "admin") {
      req.user.role = "admin";
      return next();
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }

  return res.status(403).json({
    error: "Admin access required",
    hint: "This action requires an administrator account.",
  });
}

module.exports = { requireAuth, requireAdmin, signToken, JWT_SECRET };
