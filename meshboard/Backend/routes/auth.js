const router = require("express").Router();
const bcrypt = require("bcrypt");
const { v4: uuidv4 } = require("uuid");
const { body, validationResult } = require("express-validator");
const pool = require("../db/pool");
const { hasDatabaseConfig, getDatabaseDiagnostics } = require("../db/resolveDatabaseConfig");
const { signToken, requireAuth } = require("../middleware/auth");
const { provisionVirtualNode } = require("../utils/nodeProvision");

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: errors.array()[0]?.msg || "Validation failed",
      errors: errors.array(),
    });
  }
  next();
};

function dbUnavailable(res) {
  const diagnostics = getDatabaseDiagnostics();
  return res.status(503).json({
    error: "Database not configured",
    hint: diagnostics.hint,
    diagnostics,
  });
}

function publicUser(row) {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    role: row.role || "user",
    node_id: row.node_id || null,
    town: row.town || null,
    created_at: row.created_at,
  };
}

const USER_COLUMNS = "id, name, phone, email, password_hash, role, node_id, town, created_at";

// POST /api/auth/register — always creates a normal user account
router.post(
  "/register",
  [
    body("name").trim().notEmpty().withMessage("Name is required").isLength({ max: 120 }),
    body("phone").trim().notEmpty().withMessage("Phone number is required").isLength({ max: 30 }),
    body("email").trim().isEmail().withMessage("Valid email is required").normalizeEmail(),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters"),
    body("node_id")
      .optional()
      .matches(/^NODE-[A-Z0-9]{4}-[A-Z0-9]{4}$/)
      .withMessage("Invalid node ID format — only use this if you own real mesh hardware"),
    body("town")
      .trim()
      .notEmpty()
      .withMessage("Town is required")
      .isLength({ max: 60 })
      .customSanitizer((v) => v.toLowerCase()),
  ],
  validate,
  async (req, res) => {
    if (!hasDatabaseConfig()) return dbUnavailable(res);

    const { name, phone, email, password, node_id, town } = req.body;
    try {
      // Only validate/require an existing node if the user is deliberately
      // linking real hardware. Everyone else gets one auto-provisioned below.
      if (node_id) {
        const nodeRes = await pool.query("SELECT id FROM nodes WHERE id = $1", [node_id]);
        if (!nodeRes.rows.length) {
          return res.status(404).json({ error: "Node not registered — register your node first" });
        }
      }

      const existing = await pool.query(
        "SELECT id FROM dashboard_users WHERE email = $1 OR phone = $2 LIMIT 1",
        [email, phone]
      );
      if (existing.rows.length) {
        return res.status(409).json({ error: "An account with this email or phone already exists" });
      }

      // Auto-provision a virtual node so posting/credits work with zero setup
      // for users who don't own physical mesh hardware.
      const linkedNodeId = node_id || (await provisionVirtualNode(name)).id;

      const passwordHash = await bcrypt.hash(password, 10);
      const id = uuidv4();
      const { rows } = await pool.query(
        `INSERT INTO dashboard_users (id, name, phone, email, password_hash, role, node_id, town)
         VALUES ($1, $2, $3, $4, $5, 'user', $6, $7)
         RETURNING id, name, phone, email, role, node_id, town, created_at`,
        [id, name, phone, email, passwordHash, linkedNodeId, town]
      );

      const user = rows[0];
      const token = signToken(user);
      res.status(201).json({ user: publicUser(user), token });
    } catch (err) {
      if (err.code === "42P01") {
        return res.status(503).json({
          error: "Users table missing",
          hint: "Run npm run migrate in Backend/ or POST /api/setup/migrate.",
        });
      }
      res.status(500).json({ error: err.message || "Registration failed" });
    }
  }
);

// POST /api/auth/login
router.post(
  "/login",
  [
    body("email").trim().isEmail().withMessage("Valid email is required").normalizeEmail(),
    body("password").notEmpty().withMessage("Password is required"),
  ],
  validate,
  async (req, res) => {
    if (!hasDatabaseConfig()) return dbUnavailable(res);

    const { email, password } = req.body;
    try {
      const { rows } = await pool.query(
        `SELECT ${USER_COLUMNS} FROM dashboard_users WHERE email = $1`,
        [email]
      );
      if (!rows.length) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      const user = rows[0];
      const ok = await bcrypt.compare(password, user.password_hash);
      if (!ok) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      // Safety net for accounts created before auto-provisioning existed
      if (!user.node_id) {
        const node = await provisionVirtualNode(user.name);
        const updated = await pool.query(
          `UPDATE dashboard_users SET node_id = $1 WHERE id = $2 RETURNING ${USER_COLUMNS}`,
          [node.id, user.id]
        );
        Object.assign(user, updated.rows[0]);
      }

      const token = signToken(user);
      res.json({ user: publicUser(user), token });
    } catch (err) {
      if (err.code === "42P01") {
        return res.status(503).json({
          error: "Users table missing",
          hint: "Run npm run migrate in Backend/ or POST /api/setup/migrate.",
        });
      }
      res.status(500).json({ error: err.message || "Login failed" });
    }
  }
);

// GET /api/auth/me
router.get("/me", requireAuth, async (req, res) => {
  if (!hasDatabaseConfig()) return dbUnavailable(res);

  try {
    const { rows } = await pool.query(
      `SELECT id, name, phone, email, role, node_id, created_at FROM dashboard_users WHERE id = $1`,
      [req.user.sub]
    );
    if (!rows.length) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json({ user: publicUser(rows[0]) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/auth/profile — link node ID and/or set town (normal users)
router.patch(
  "/profile",
  requireAuth,
  [
    body("node_id")
      .optional({ values: "null" })
      .custom((value) => {
        if (value === null || value === undefined || value === "") return true;
        if (!/^NODE-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(value)) {
          throw new Error("Invalid node ID format");
        }
        return true;
      }),
    body("town")
      .optional()
      .trim()
      .notEmpty()
      .withMessage("Town cannot be blank")
      .isLength({ max: 60 })
      .customSanitizer((v) => v.toLowerCase()),
  ],
  validate,
  async (req, res) => {
    if (!hasDatabaseConfig()) return dbUnavailable(res);

    const { node_id, town } = req.body;
    if (node_id === undefined && town === undefined) {
      return res.status(400).json({ error: "Provide node_id and/or town to update" });
    }

    try {
      if (node_id) {
        const nodeRes = await pool.query("SELECT id FROM nodes WHERE id = $1", [node_id]);
        if (!nodeRes.rows.length) {
          return res.status(404).json({ error: "Node not registered" });
        }
      }

      // Build a dynamic SET clause so we only touch fields the caller actually sent
      const sets = [];
      const params = [];
      if (node_id !== undefined) {
        params.push(node_id);
        sets.push(`node_id = $${params.length}`);
      }
      if (town !== undefined) {
        params.push(town);
        sets.push(`town = $${params.length}`);
      }
      params.push(req.user.sub);

      const { rows } = await pool.query(
        `UPDATE dashboard_users SET ${sets.join(", ")} WHERE id = $${params.length}
         RETURNING id, name, phone, email, role, node_id, town, created_at`,
        params
      );
      if (!rows.length) return res.status(404).json({ error: "User not found" });

      const user = publicUser(rows[0]);
      const token = signToken(rows[0]);
      res.json({ user, token });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

module.exports = router;
