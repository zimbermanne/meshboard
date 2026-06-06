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

const server = http.createServer((req, res) => {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405, { "Content-Type": "text/plain" });
    res.end("Method Not Allowed");
    return;
  }

  let urlPath = decodeURIComponent(req.url.split("?")[0]);
  if (urlPath !== "/" && urlPath.endsWith("/")) urlPath = urlPath.slice(0, -1);

  // Fast liveness path for Railway healthcheck pipelines
  if (urlPath === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", dist: DIST_OK }));
    return;
  }

  if (!DIST_OK) {
    res.writeHead(503, { "Content-Type": "text/plain" });
    res.end("Build missing: check Railway build pipelines for compilation errors.");
    return;
  }

  // Strip leading slash — path.join(DIST, "/assets/foo.js") on Linux resolves to
  // "/assets/foo.js" (drops DIST), misses the file, and SPA fallback returns HTML → MIME error.
  const relPath  = urlPath === "/" ? "index.html" : urlPath.replace(/^\/+/, "");
  const filePath = path.resolve(DIST, relPath);
  const distRoot = path.resolve(DIST);
  if (filePath !== distRoot && !filePath.startsWith(distRoot + path.sep)) {
    res.writeHead(403); res.end("Forbidden"); return;
  }

  // 1. If exact static file asset exists, stream it out immediately
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext  = path.extname(filePath).toLowerCase();
    const mime = TYPES[ext] || "application/octet-stream";
    const isAsset = filePath.includes(path.join(DIST, "assets"));
    res.writeHead(200, {
      "Content-Type":  mime,
      "Cache-Control": isAsset ? "public, max-age=31536000, immutable" : "no-cache",
    });
    fs.createReadStream(filePath).pipe(res);
    return;
  }

  // 2. SPA Catch-All: Route everything else back to index.html for React Router tracking
  const fallbackIndex = path.join(DIST, "index.html");
  res.writeHead(200, { "Content-Type": "text/html", "Cache-Control": "no-cache" });
  fs.createReadStream(fallbackIndex).pipe(res);
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`[Frontend Server] Live on http://0.0.0.0:${PORT}`);
});