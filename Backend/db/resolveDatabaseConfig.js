/**
 * Resolve PostgreSQL connection settings for Railway and local dev.
 *
 * Railway injects PGHOST/PGPORT/PGUSER/PGPASSWORD/PGDATABASE from the Postgres plugin.
 * Never use RAILWAY_PRIVATE_DOMAIN — that is the *app* hostname, not Postgres.
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
    if (!url.hostname) return null;
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
    // Do NOT include RAILWAY_PRIVATE_DOMAIN — that points at this app, not Postgres.
    host: firstEnv("PGHOST", "POSTGRES_HOST", "DB_HOST"),
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
  if (lower.endsWith(".your-host")) return true;
  return false;
}

/** PGHOST must not be this backend service's own Railway internal hostname. */
function isAppSelfHost(host) {
  if (!host) return false;
  const h = host.toLowerCase();
  const appDomain = (process.env.RAILWAY_PRIVATE_DOMAIN || "").toLowerCase();
  if (appDomain && h === appDomain) return true;
  const service = (process.env.RAILWAY_SERVICE_NAME || "").toLowerCase();
  if (service && (h === `${service}.railway.internal` || h.startsWith(`${service}.`))) {
    return true;
  }
  return false;
}

function isValidPgHost(host) {
  return Boolean(host) && !isPlaceholderHost(host) && !isAppSelfHost(host);
}

function useSsl(host) {
  if (!host) return false;
  const lower = host.toLowerCase();
  return lower !== "localhost" && lower !== "127.0.0.1" && !lower.endsWith(".railway.internal");
}

function configFromUrl(rawUrl, parsed, resolvedFrom) {
  const host = parsed.host;
  return {
    connectionString: rawUrl.replace(/^postgres:\/\//i, "postgresql://"),
    ssl: useSsl(host) ? { rejectUnauthorized: false } : false,
    resolvedFrom,
    host,
    port: parsed.port,
    database: parsed.database,
  };
}

function configFromParts({ host, port, user, password, database }, resolvedFrom) {
  return {
    connectionString: buildConnectionString({ host, port, user, password, database }),
    ssl: useSsl(host) ? { rejectUnauthorized: false } : false,
    resolvedFrom,
    host,
    port,
    database,
  };
}

function resolveDatabaseConfig() {
  const parts = railwayPgParts();

  // 1. Prefer Railway internal URL, then public DATABASE_URL (valid hostname only)
  for (const [envKey, label] of [
    ["DATABASE_PRIVATE_URL", "DATABASE_PRIVATE_URL"],
    ["DATABASE_URL", "DATABASE_URL"],
  ]) {
    const raw = process.env[envKey];
    const parsed = parsePgUrl(raw);
    if (parsed && isValidPgHost(parsed.host)) {
      return configFromUrl(raw, parsed, label);
    }
  }

  const rawUrl = firstEnv("DATABASE_URL", "DATABASE_PRIVATE_URL");
  const parsed = parsePgUrl(rawUrl);

  let user = parts.user;
  let password = parts.password;
  let database = parts.database;
  let port = parts.port;
  let host = isValidPgHost(parts.host) ? parts.host : "";

  if (parsed) {
    user = parsed.user || user;
    password = parsed.password || password;
    database = parsed.database || database;
    port = parsed.port || port;
    if (isValidPgHost(parsed.host)) {
      return configFromUrl(rawUrl, parsed, "DATABASE_URL");
    }
  }

  // 2. DATABASE_URL placeholder host (e.g. "base") + real PGHOST from Postgres plugin
  if (host) {
    return configFromParts(
      { host, port, user, password, database },
      parsed ? "DATABASE_URL+PGHOST" : "PGHOST"
    );
  }

  // 3. Local dev
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
  const rawPgHost = parts.host;
  const selfHost = isAppSelfHost(rawPgHost);

  return {
    hasDatabaseUrl: Boolean(firstEnv("DATABASE_URL", "DATABASE_PRIVATE_URL")),
    hasDatabasePrivateUrl: Boolean(process.env.DATABASE_PRIVATE_URL),
    hasPgHost: Boolean(rawPgHost),
    pgHost: rawPgHost || null,
    pgDatabase: parts.database || null,
    resolved: Boolean(cfg),
    resolvedFrom: cfg?.resolvedFrom || null,
    resolvedHost: cfg?.host || null,
    resolvedDatabase: cfg?.resolvedDatabase || cfg?.database || null,
    misconfiguredPgHost: selfHost,
    railwayPrivateDomain: process.env.RAILWAY_PRIVATE_DOMAIN || null,
    placeholderHostAccepted:
      Boolean(parsePgUrl(firstEnv("DATABASE_URL"))?.host) &&
      isPlaceholderHost(parsePgUrl(firstEnv("DATABASE_URL"))?.host) &&
      isValidPgHost(rawPgHost),
    hint: selfHost
      ? "PGHOST points at the backend service. On Railway, reference PGHOST from the PostgreSQL plugin — not RAILWAY_PRIVATE_DOMAIN."
      : !cfg
        ? "Link PostgreSQL to this service and reference DATABASE_PRIVATE_URL or PGHOST from Postgres."
        : null,
  };
}

module.exports = {
  resolveDatabaseConfig,
  hasDatabaseConfig,
  getDatabaseDiagnostics,
  isPlaceholderHost,
  isAppSelfHost,
};
