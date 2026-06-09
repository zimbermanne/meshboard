const { Pool } = require("pg");
const { resolveDatabaseConfig, hasDatabaseConfig } = require("./resolveDatabaseConfig");
require("../loadEnv")();

const cfg = resolveDatabaseConfig();

if (!cfg) {
  console.error(
    "[db] No PostgreSQL configuration — link Postgres on Railway or set DATABASE_URL / DB_* locally."
  );
}

const pool = cfg
  ? new Pool(
      cfg.connectionString
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
    )
  : null;

if (cfg) {
  console.log(`[db] Pool ready — host=${cfg.host} db=${cfg.database} via=${cfg.resolvedFrom}`);
}

function requirePool() {
  if (!pool || !hasDatabaseConfig()) {
    const err = new Error(
      "Database not configured. Link PostgreSQL on Railway or run npm run migrate locally."
    );
    err.code = "DB_NOT_CONFIGURED";
    throw err;
  }
  return pool;
}

const proxy =
  pool ||
  new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === "query" || prop === "connect") {
          return () => {
            throw new Error(
              "Database not configured. Link PostgreSQL on Railway (DATABASE_PRIVATE_URL) or set DB_* locally."
            );
          };
        }
        return undefined;
      },
    }
  );

pool?.on("error", (err) => {
  console.error("Unexpected PostgreSQL pool error:", err);
});

module.exports = proxy;
module.exports.requirePool = requirePool;
