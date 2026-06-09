#!/usr/bin/env node
/**
 * MeshBoard connectivity agent — verifies Backend→PostgreSQL and Frontend→Backend.
 *
 * Usage:
 *   npm run connectivity
 *   npm run connectivity:local
 *   BACKEND_URL=https://... FRONTEND_URL=https://... node scripts/connectivity-agent.js
 */

const TIMEOUT_MS = parseInt(process.env.CONNECTIVITY_TIMEOUT_MS || "10000", 10);

function normalizeOrigin(raw, fallback) {
  const value = (raw || fallback || "").trim().replace(/\/+$/, "").replace(/\/api$/i, "");
  return value || fallback;
}

function parseArgs(argv) {
  const local = argv.includes("--local");
  return { local };
}

async function fetchJson(url, timeoutMs = TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    const text = await res.text();
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      throw new Error(`Non-JSON response (HTTP ${res.status}): ${text.slice(0, 120)}`);
    }
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    if (err.name === "AbortError") {
      throw new Error(`Timeout after ${timeoutMs}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

async function checkHttp(name, url, assertFn) {
  const row = { name, url, status: "FAIL", detail: "" };
  try {
    const { ok, status, data } = await fetchJson(url);
    const message = assertFn({ ok, status, data });
    if (message) {
      row.detail = message;
      return row;
    }
    row.status = "PASS";
    row.detail = `HTTP ${status}`;
    return row;
  } catch (err) {
    row.detail = err.message || String(err);
    return row;
  }
}

async function checkDirectPostgres() {
  const name = "Direct PostgreSQL (DATABASE_URL)";
  const row = { name, url: "(pg pool)", status: "FAIL", detail: "" };
  try {
    const pool = require("../Backend/db/pool");
    await pool.query("SELECT 1");
    row.status = "PASS";
    row.detail = "SELECT 1 ok";
    await pool.end();
    return row;
  } catch (err) {
    row.detail = err.message || String(err);
    try {
      const pool = require("../Backend/db/pool");
      await pool.end();
    } catch {
      /* ignore */
    }
    return row;
  }
}

function printTable(rows) {
  const nameWidth = Math.max(4, ...rows.map((r) => r.name.length));
  const statusWidth = 4;
  console.log("");
  console.log(`${"Check".padEnd(nameWidth)}  ${"Status".padEnd(statusWidth)}  URL / detail`);
  console.log(`${"-".repeat(nameWidth)}  ${"-".repeat(statusWidth)}  ${"-".repeat(40)}`);
  for (const row of rows) {
    console.log(`${row.name.padEnd(nameWidth)}  ${row.status.padEnd(statusWidth)}  ${row.url}`);
    if (row.detail) console.log(`${"".padEnd(nameWidth)}  ${"".padEnd(statusWidth)}  ${row.detail}`);
  }
  console.log("");
}

async function main() {
  const { local } = parseArgs(process.argv.slice(2));

  const backendUrl = normalizeOrigin(
    process.env.BACKEND_URL,
    local ? "http://localhost:8080" : "http://localhost:8080"
  );
  const frontendUrl = process.env.FRONTEND_URL
    ? normalizeOrigin(process.env.FRONTEND_URL, "")
    : local
      ? "http://localhost:5173"
      : "";

  console.log("[connectivity-agent] MeshBoard stack probe");
  console.log(`  BACKEND_URL=${backendUrl}`);
  console.log(`  FRONTEND_URL=${frontendUrl || "(skipped)"}`);
  if (process.env.DATABASE_URL) console.log("  DATABASE_URL=(set — direct DB check enabled)");

  const rows = [];

  rows.push(
    await checkHttp("Backend liveness", `${backendUrl}/health`, ({ ok, data }) => {
      if (!ok) return `Expected HTTP 2xx, got failure`;
      if (data.status !== "ok") return `Expected status "ok", got ${JSON.stringify(data.status)}`;
      return null;
    })
  );

  rows.push(
    await checkHttp("Backend → PostgreSQL", `${backendUrl}/api/health`, ({ ok, data }) => {
      if (data.database === "connected") return null;
      if (!ok && data.database === "disconnected") {
        return data.error || "database disconnected";
      }
      return `Expected database "connected", got ${JSON.stringify(data.database)}`;
    })
  );

  if (frontendUrl) {
    rows.push(
      await checkHttp("Frontend liveness", `${frontendUrl}/health`, ({ ok, data }) => {
        if (!ok && data.status === "degraded") {
          return data.database ? `degraded: database=${data.database}` : "frontend degraded";
        }
        if (!ok) return `Expected HTTP 2xx, got failure`;
        if (data.status !== "ok" && data.status !== "degraded") {
          return `Unexpected status ${JSON.stringify(data.status)}`;
        }
        if (data.dist === false) return "Frontend dist/ build missing";
        return null;
      })
    );

    rows.push(
      await checkHttp(
        "Frontend → Backend (proxy)",
        `${frontendUrl}/api/health`,
        ({ ok, data }) => {
          if (data.database === "connected") return null;
          if (!ok && data.database === "disconnected") {
            return data.error || "database disconnected via proxy";
          }
          if (!ok && data.error) return data.error;
          return `Expected database "connected", got ${JSON.stringify(data.database)}`;
        }
      )
    );
  }

  if (process.env.DATABASE_URL) {
    rows.push(await checkDirectPostgres());
  }

  printTable(rows);

  const failed = rows.filter((r) => r.status !== "PASS");
  if (failed.length) {
    console.error(`[connectivity-agent] ${failed.length} check(s) FAILED`);
    process.exit(1);
  }
  console.log(`[connectivity-agent] All ${rows.length} check(s) PASSED`);
  process.exit(0);
}

main().catch((err) => {
  console.error("[connectivity-agent] Fatal:", err.message || err);
  process.exit(1);
});
