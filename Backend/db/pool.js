const { Pool } = require("pg");
const { resolveDatabaseConfig } = require("./resolveDatabaseConfig");
require("../loadEnv")();

const cfg = resolveDatabaseConfig();

if (!cfg) {
  console.error(
    "[db] No PostgreSQL configuration found. Link Postgres on Railway or set PGHOST/PGUSER/PGPASSWORD/PGDATABASE."
  );
}

const pool = new Pool(
  cfg
    ? cfg.connectionString
      ? {
          connectionString: cfg.connectionString,
          ssl: cfg.ssl,
          max: 10,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 5000,
        }
      : {
          host: cfg.host,
          port: parseInt(cfg.port, 10),
          database: cfg.database,
          user: cfg.user,
          password: cfg.password,
          ssl: cfg.ssl,
          max: 10,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 5000,
        }
    : {
        host: "localhost",
        port: 5432,
        database: "meshboard",
        user: "postgres",
        password: "",
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      }
);

if (cfg) {
  console.log(
    `[db] Pool ready — host=${cfg.host} db=${cfg.database} via=${cfg.resolvedFrom}`
  );
}

pool.on("error", (err) => {
  console.error("Unexpected PostgreSQL pool error:", err);
});

module.exports = pool;
