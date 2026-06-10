require("./loadEnv")();
const bcrypt = require("bcrypt");
const { v4: uuidv4 } = require("uuid");
const pool = require("./db/pool");

/**
 * Create or promote the first admin account.
 * Env: ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME (optional), ADMIN_PHONE (optional)
 */
async function seedAdmin() {
  const email = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "";
  const name = (process.env.ADMIN_NAME || "Administrator").trim();
  const phone = (process.env.ADMIN_PHONE || "+255700000000").trim();

  if (!email || !password) {
    console.error("✗ Set ADMIN_EMAIL and ADMIN_PASSWORD environment variables.");
    process.exit(1);
  }
  if (password.length < 6) {
    console.error("✗ ADMIN_PASSWORD must be at least 6 characters.");
    process.exit(1);
  }

  const existing = await pool.query(
    "SELECT id, email, role FROM dashboard_users WHERE email = $1",
    [email]
  );

  if (existing.rows.length) {
    const user = existing.rows[0];
    if (user.role === "admin") {
      console.log(`✓ ${email} is already an admin.`);
      return;
    }
    await pool.query("UPDATE dashboard_users SET role = 'admin' WHERE id = $1", [user.id]);
    console.log(`✓ Promoted existing user ${email} to admin.`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const id = uuidv4();
  await pool.query(
    `INSERT INTO dashboard_users (id, name, phone, email, password_hash, role)
     VALUES ($1, $2, $3, $4, $5, 'admin')`,
    [id, name, phone, email, passwordHash]
  );
  console.log(`✓ Created admin account: ${email}`);
}

if (require.main === module) {
  seedAdmin()
    .then(() => pool.end())
    .catch((err) => {
      console.error("✗ seed-admin failed:", err.message);
      process.exit(1);
    });
}

module.exports = seedAdmin;
