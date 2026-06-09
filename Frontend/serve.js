const http = require("http");
const fs   = require("fs");
const path = require("path");

const PORT    = parseInt(process.env.PORT || "3000", 10);
const DIST    = path.join(__dirname, "dist");
const DIST_OK = fs.existsSync(path.join(DIST, "index.html"));
const TYPES   = {
  ".html": "text/html",
  ".js":   "application/javascript",
  ".mjs":  "application/javascript",
  ".css":  "text/css",
  ".svg":  "image/svg+xml",
  ".png":  "image/png",
  ".jpg":  "image/jpeg",
  ".ico":  "image/x-icon",
  ".json": "application/json",
  ".woff": "font/woff",
  ".woff2":"font/woff2",
  ".ttf":  "font/ttf",
};

function backendOrigin() {
  const raw =
    process.env.BACKEND_URL ||
    process.env.VITE_API_BASE_URL ||
    "http://localhost:8080";
  return raw.trim().replace(/\/+$/, "").replace(/\/api$/i, "");
}

const BACKEND = backendOrigin();
const HEALTH_PROBE_MS = parseInt(process.env.HEALTH_PROBE_TIMEOUT_MS || "5000", 10);

async function probeBackendHealth() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HEALTH_PROBE_MS);
  try {
    const res = await fetch(`${BACKEND}/api/health`, { signal: controller.signal });
    const data = await res.json().catch(() => ({}));
    return {
      reachable: res.ok || res.status === 503,
      database: data.database || "unknown",
      backendStatus: data.status,
    };
  } catch (err) {
    return {
      reachable: false,
      database: "disconnected",
      error: err.message || String(err),
    };
  } finally {
    clearTimeout(timer);
  }
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    if (req.method === "GET" || req.method === "HEAD") return resolve(undefined);
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

async function proxyApi(req, res, urlPath) {
  const qs     = req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";
  const target = `${BACKEND}${urlPath}${qs}`;
  const body   = await readBody(req);
  const headers = {};
  if (req.headers["content-type"]) headers["Content-Type"] = req.headers["content-type"];
  if (req.headers["accept"]) headers["Accept"] = req.headers["accept"];

  try {
    const upstream = await fetch(target, {
      method: req.method,
      headers,
      body: body && body.length ? body : undefined,
    });
    const text = await upstream.text();
    res.writeHead(upstream.status, {
      "Content-Type": upstream.headers.get("content-type") || "application/json",
    });
    res.end(text);
  } catch (err) {
    console.error("[proxy]", target, err.message);
    res.writeHead(502, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: `Backend unreachable (${BACKEND}): ${err.message}` }));
  }
}

const server = http.createServer(async (req, res) => {
  let urlPath = decodeURIComponent(req.url.split("?")[0]);
  if (urlPath !== "/" && urlPath.endsWith("/")) urlPath = urlPath.slice(0, -1);

  if (urlPath === "/health") {
    const probe = await probeBackendHealth();
    const backendOk = probe.reachable && probe.database === "connected";
    const body = {
      status: backendOk ? "ok" : "degraded",
      dist: DIST_OK,
      backend: BACKEND,
      backendReachable: probe.reachable,
      database: probe.database,
    };
    if (probe.error) body.error = probe.error;
    res.writeHead(backendOk ? 200 : 503, { "Content-Type": "application/json" });
    res.end(JSON.stringify(body));
    return;
  }

  // Proxy API to backend — avoids CORS and fixes /api returning index.html when
  // VITE_API_BASE_URL was not baked in at build time.
  if (urlPath === "/api" || urlPath.startsWith("/api/")) {
    proxyApi(req, res, urlPath);
    return;
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405, { "Content-Type": "text/plain" });
    res.end("Method Not Allowed");
    return;
  }

  if (!DIST_OK) {
    res.writeHead(503, { "Content-Type": "text/plain" });
    res.end("Build missing: check Railway build logs for compilation errors.");
    return;
  }

  const relPath  = urlPath === "/" ? "index.html" : urlPath.replace(/^\/+/, "");
  const filePath = path.resolve(DIST, relPath);
  const distRoot = path.resolve(DIST);
  if (filePath !== distRoot && !filePath.startsWith(distRoot + path.sep)) {
    res.writeHead(403); res.end("Forbidden"); return;
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext  = path.extname(filePath).toLowerCase();
    const mime = TYPES[ext] || "application/octet-stream";
    const assetsDir = path.join(distRoot, "assets") + path.sep;
    const isAsset = filePath.startsWith(assetsDir);
    res.writeHead(200, {
      "Content-Type":  mime,
      "Cache-Control": isAsset ? "public, max-age=31536000, immutable" : "no-cache",
    });
    fs.createReadStream(filePath).pipe(res);
    return;
  }

  const fallbackIndex = path.join(DIST, "index.html");
  res.writeHead(200, { "Content-Type": "text/html", "Cache-Control": "no-cache" });
  fs.createReadStream(fallbackIndex).pipe(res);
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`[Frontend] http://0.0.0.0:${PORT} | dist=${DIST_OK} | backend=${BACKEND}`);
});
