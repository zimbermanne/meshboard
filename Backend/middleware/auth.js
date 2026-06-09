const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "meshboard-dev-secret-change-in-production";
const JWT_EXPIRES = process.env.JWT_EXPIRES || "7d";

function signToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, name: user.name },
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

module.exports = { requireAuth, signToken, JWT_SECRET };
