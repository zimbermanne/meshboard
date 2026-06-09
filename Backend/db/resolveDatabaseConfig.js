/**
 * Resolve PostgreSQL connection settings for Railway and local dev.
 *
 * Railway often injects PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE when Postgres
 * is linked. DATABASE_URL may still contain placeholder hosts like "base" if set manually.
 */
require("../loadEnv")();

const PLACEHOLDER_DB_HOSTS = new Set([
  "base",
  "host",
  "hostname",
  "your-host",
  "localhost",
  "",
]);

function firstEnv(...keys) {
  for (const key of keys) {
    const value = process.env[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value).trim();
    }
  }
  return "";
}

function parsePgUrl(raw) {
  if (!raw) return null;
  try {
    const normalized = raw.replace(/^postgres:\/\//i, "postgresql://");
    const url = new URL(normalized);
    return {
      host: url.hostname,
      port: url.port || "5432",
      user: decodeURIComponent(url.username || "postgres"),
      password: decodeURIComponent(url.password || ""),
      database: url.pathname.replace(/^\//, "").split("?")[0] || "railway",
    };
  } catch {
    return null;
  }
}

function buildConnectionString({ host, port, user, password, database }) {
  const encUser = encodeURIComponent(user || "postgres");
  const encPass = encodeURIComponent(password || "");
  return `postgresql://${encUser}:${encPass}@${host}:${port}/${database}`;
}

function railwayPgParts() {
  return {
    host: firstEnv("PGHOST", "POSTGRES_HOST", "RAILWAY_PRIVATE_DOMAIN", "DB_HOST"),
    port: firstEnv("PGPORT", "POSTGRES_PORT", "DB_PORT") || "5432",
    user: firstEnv("PGUSER", "POSTGRES_USER", "DB_USER") || "postgres",
    password: firstEnv("PGPASSWORD", "POSTGRES_PASSWORD", "DB_PASSWORD"),
    database: firstEnv("PGDATABASE", "POSTGRES_DB", "DB_NAME") || "railway",
  };
}

function isPlaceholderHost(host) {
  if (!host) return true;
  const lower = host.toLowerCase();
  if (PLACEHOLDER_DB_HOSTS.has(lower)) return true;
  if (lower === "host" || lower.endsWith(".your-host")) return true;
  return false;
}

function useSsl(host) {
  if (!host) return false;
  const lower = host.toLowerCase();
  return lower !== "localhost" && lower !== "127.0.0.1";
}

function resolveDatabaseConfig() {
  const parts = railwayPgParts();
  const rawUrl = firstEnv("DATABASE_URL", "DATABASE_PRIVATE_URL");
  const parsed = parsePgUrl(rawUrl);

  let host = parts.host;
  let port = parts.port;
  let user = parts.user;
  let password = parts.password;
  let database = parts.database;

  if (parsed) {
    if (!isPlaceholderHost(parsed.host)) {
      return {
        connectionString: rawUrl.replace(/^postgres:\/\//i, "postgresql://"),
        ssl: useSsl(parsed.host) ? { rejectUnauthorized: false } : false,
        resolvedFrom: "DATABASE_URL",
        host: parsed.host,
        port: parsed.port,
        database: parsed.database,
      };
    }
    // DATABASE_URL has placeholder host — merge credentials with Railway PGHOST
    user = parsed.user || user;
    password = parsed.password || password;
    database = parsed.database || database;
    port = parsed.port || port;
    if (!host && !isPlaceholderHost(parsed.host)) host = parsed.host;
  }

  if (!host || isPlaceholderHost(host)) {
    if (parts.host && !isPlaceholderHost(parts.host)) {
      host = parts.host;
    }
  }

  if (host && !isPlaceholderHost(host)) {
    const connectionString = buildConnectionString({ host, port, user, password, database });
    return {
      connectionString,
      ssl: useSsl(host) ? { rejectUnauthorized: false } : false,
      resolvedFrom: parsed ? "DATABASE_URL+PGHOST" : "PGHOST",
      host,
      port,
      database,
    };
  }

  // Local dev fallback (no SSL)
  if (process.env.NODE_ENV !== "production") {
    const localHost = parts.host || "localhost";
    return {
      host: localHost,
      port: parseInt(parts.port || "5432", 10),
      database: parts.database || "meshboard",
      user: parts.user || "postgres",
      password: parts.password || "",
      ssl: false,
      resolvedFrom: "DB_*",
    };
  }

  return null;
}

function hasDatabaseConfig() {
  const cfg = resolveDatabaseConfig();
  if (!cfg) return false;
  if (cfg.connectionString) return true;
  return Boolean(cfg.host && cfg.database);
}

function getDatabaseDiagnostics() {
  const cfg = resolveDatabaseConfig();
  const parts = railwayPgParts();
  return {
    hasDatabaseUrl: Boolean(firstEnv("DATABASE_URL", "DATABASE_PRIVATE_URL")),
    hasPgHost: Boolean(parts.host),
    pgHost: parts.host || null,
    pgDatabase: parts.database || null,
    resolved: Boolean(cfg),
    resolvedFrom: cfg?.resolvedFrom || null,
    resolvedHost: cfg?.host || null,
    resolvedDatabase: cfg?.database || null,
    placeholderHostAccepted:
      Boolean(parsePgUrl(firstEnv("DATABASE_URL"))?.host) &&
      isPlaceholderHost(parsePgUrl(firstEnv("DATABASE_URL"))?.host) &&
      Boolean(parts.host),
  };
}

module.exports = {
  resolveDatabaseConfig,
  hasDatabaseConfig,
  getDatabaseDiagnostics,
  isPlaceholderHost,
};
