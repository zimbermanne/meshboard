/**
 * Resolve PostgreSQL connection settings for Railway and local dev.
 */
require("../loadEnv")();

const PLACEHOLDER_DB_HOSTS = new Set([
  "base",
  "host",
  "hostname",
  "your-host",
  "",
]);

function isLocalDev() {
  return process.env.NODE_ENV !== "production" && !process.env.RAILWAY_ENVIRONMENT;
}

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

function isRailway() {
  return Boolean(process.env.RAILWAY_ENVIRONMENT);
}

function railwayPgParts() {
  // On Railway, only trust Postgres plugin vars — never local DB_* fallbacks.
  if (isRailway()) {
    return {
      host: firstEnv("PGHOST", "POSTGRES_HOST"),
      port: firstEnv("PGPORT", "POSTGRES_PORT") || "5432",
      user: firstEnv("PGUSER", "POSTGRES_USER") || "postgres",
      password: firstEnv("PGPASSWORD", "POSTGRES_PASSWORD"),
      database: firstEnv("PGDATABASE", "POSTGRES_DB") || "railway",
    };
  }
  return {
    host: firstEnv("PGHOST", "POSTGRES_HOST", "DB_HOST"),
    port: firstEnv("PGPORT", "POSTGRES_PORT", "DB_PORT") || "5432",
    user: firstEnv("PGUSER", "POSTGRES_USER", "DB_USER") || "postgres",
    password: firstEnv("PGPASSWORD", "POSTGRES_PASSWORD", "DB_PASSWORD"),
    database: firstEnv("PGDATABASE", "POSTGRES_DB", "DB_NAME") || "railway",
  };
}

function listPollutingDbVars() {
  const bad = [];
  const check = (key, value) => {
    if (!value) return;
    const host = parsePgUrl(value)?.host || value;
    if (isPlaceholderHost(host) || isAppSelfHost(host)) bad.push(key);
  };
  for (const key of [
    "PGHOST",
    "POSTGRES_HOST",
    "DB_HOST",
    "DATABASE_URL",
    "DATABASE_PRIVATE_URL",
  ]) {
    check(key, process.env[key]);
  }
  if (isRailway() && firstEnv("DB_HOST", "DB_NAME")) {
    bad.push("DB_* (local dev only — remove from Railway Backend)");
  }
  return bad;
}

function isPlaceholderHost(host) {
  if (!host) return true;
  const lower = host.toLowerCase();
  if (PLACEHOLDER_DB_HOSTS.has(lower)) return true;
  if (lower.endsWith(".your-host")) return true;
  // localhost is valid locally, never valid on Railway containers
  if ((lower === "localhost" || lower === "127.0.0.1") && !isLocalDev()) return true;
  return false;
}

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

function localDevConfig(parts) {
  const host = firstEnv("DB_HOST") || "localhost";
  return {
    host,
    port: parseInt(firstEnv("DB_PORT") || "5432", 10),
    database: firstEnv("DB_NAME") || "meshboard",
    user: firstEnv("DB_USER") || "postgres",
    password: firstEnv("DB_PASSWORD") || "",
    ssl: false,
    resolvedFrom: "DB_*",
  };
}

function resolveDatabaseConfig() {
  const parts = railwayPgParts();

  // Local dev — prefer DATABASE_URL / DB_*; ignore Railway-style PGHOST pollution
  if (isLocalDev()) {
    const localUrl = firstEnv("DATABASE_URL", "DATABASE_PRIVATE_URL");
    const parsed = parsePgUrl(localUrl);
    if (parsed && (parsed.host === "localhost" || parsed.host === "127.0.0.1")) {
      return configFromUrl(localUrl, parsed, "DATABASE_URL");
    }
    return localDevConfig(parts);
  }

  // Railway / production
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
  const host = isValidPgHost(parts.host) ? parts.host : "";

  if (parsed) {
    user = parsed.user || user;
    password = parsed.password || password;
    database = parsed.database || database;
    port = parsed.port || port;
    if (isValidPgHost(parsed.host)) {
      return configFromUrl(rawUrl, parsed, "DATABASE_URL");
    }
  }

  if (host) {
    return configFromParts(
      { host, port, user, password, database },
      parsed ? "DATABASE_URL+PGHOST" : "PGHOST"
    );
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
  const localhostOnRailway =
    Boolean(process.env.RAILWAY_ENVIRONMENT) &&
    (rawPgHost === "localhost" || rawPgHost === "127.0.0.1");

  const polluting = listPollutingDbVars();
  return {
    hasDatabaseUrl: Boolean(firstEnv("DATABASE_URL", "DATABASE_PRIVATE_URL")),
    hasDatabasePrivateUrl: Boolean(process.env.DATABASE_PRIVATE_URL),
    hasPgHost: Boolean(rawPgHost),
    pgHost: rawPgHost || null,
    pgDatabase: parts.database || null,
    resolved: Boolean(cfg),
    resolvedFrom: cfg?.resolvedFrom || null,
    resolvedHost: cfg?.host || null,
    resolvedDatabase: cfg?.database || null,
    misconfiguredPgHost: selfHost || localhostOnRailway,
    pollutingVariables: polluting.length ? polluting : null,
    railwayPrivateDomain: process.env.RAILWAY_PRIVATE_DOMAIN || null,
    hint: localhostOnRailway
      ? "Delete PGHOST=localhost on the Backend service. Variables → Add Reference → PostgreSQL → PGHOST and DATABASE_PRIVATE_URL."
      : selfHost
        ? "PGHOST points at the backend service. Reference Postgres variables from the PostgreSQL plugin."
        : !cfg
          ? polluting.length
            ? `Remove or replace on Railway Backend: ${polluting.join(", ")}. Then Add Reference from PostgreSQL (DATABASE_PRIVATE_URL, PGHOST, PGUSER, PGPASSWORD, PGDATABASE).`
            : "Link PostgreSQL and set DATABASE_PRIVATE_URL or Postgres PGHOST/PGUSER/PGPASSWORD."
          : null,
  };
}

module.exports = {
  resolveDatabaseConfig,
  hasDatabaseConfig,
  getDatabaseDiagnostics,
  isPlaceholderHost,
  isAppSelfHost,
  isLocalDev,
  isRailway,
};
