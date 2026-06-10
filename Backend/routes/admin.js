const router = require("express").Router();
const pool = require("../db/pool");
const { body, validationResult } = require("express-validator");
const { requireAuth, requireAdmin } = require("../middleware/auth");

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  next();
};

router.use(requireAuth, requireAdmin);

function publicUser(row) {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    role: row.role || "user",
    node_id: row.node_id || null,
    created_at: row.created_at,
  };
}

// GET /api/admin/users
router.get("/users", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, name, phone, email, role, node_id, created_at
       FROM dashboard_users
       ORDER BY created_at DESC`
    );
    res.json(rows.map(publicUser));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/admin/users/:id — change role or linked node
router.patch(
  "/users/:id",
  body("role").optional().isIn(["user", "admin"]),
  body("node_id")
    .optional({ values: "null" })
    .matches(/^NODE-[A-Z0-9]{4}-[A-Z0-9]{4}$/)
    .withMessage("Invalid node ID format"),
  validate,
  async (req, res) => {
    const { id } = req.params;
    const { role, node_id } = req.body;

    if (role === undefined && node_id === undefined) {
      return res.status(400).json({ error: "Provide role and/or node_id to update" });
    }

    try {
      if (node_id) {
        const nodeRes = await pool.query("SELECT id FROM nodes WHERE id = $1", [node_id]);
        if (!nodeRes.rows.length) {
          return res.status(404).json({ error: "Node not registered" });
        }
      }

      const sets = [];
      const params = [];
      if (role !== undefined) {
        params.push(role);
        sets.push(`role = $${params.length}`);
      }
      if (node_id !== undefined) {
        params.push(node_id);
        sets.push(`node_id = $${params.length}`);
      }
      params.push(id);

      const { rows } = await pool.query(
        `UPDATE dashboard_users SET ${sets.join(", ")} WHERE id = $${params.length}
         RETURNING id, name, phone, email, role, node_id, created_at`,
        params
      );
      if (!rows.length) return res.status(404).json({ error: "User not found" });
      res.json({ user: publicUser(rows[0]) });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// DELETE /api/admin/users/:id
router.delete("/users/:id", async (req, res) => {
  const { id } = req.params;
  if (id === req.user.sub) {
    return res.status(400).json({ error: "You cannot delete your own account" });
  }
  try {
    const { rows } = await pool.query(
      "DELETE FROM dashboard_users WHERE id = $1 RETURNING id, email",
      [id]
    );
    if (!rows.length) return res.status(404).json({ error: "User not found" });
    res.json({ deleted: rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
