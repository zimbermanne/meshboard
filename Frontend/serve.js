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
  let urlPath = req.url.split("?")[0];
  if (urlPath !== "/" && urlPath.endsWith("/")) urlPath = urlPath.slice(0, -1);

  // Fast liveness for Railway (does not depend on dist/)
  if (urlPath === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", dist: DIST_OK }));
    return;
  }

  if (!DIST_OK) {
    res.writeHead(503, { "Content-Type": "text/plain" });
    res.end("Build missing: run npm run build (check Railway build logs)");
    return;
  }

  let filePath = path.join(DIST, urlPath);
  if (!filePath.startsWith(DIST)) {
    res.writeHead(403); res.end("Forbidden"); return;
  }

  const candidates = [filePath, filePath + ".html", path.join(DIST, "index.html")];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      const ext  = path.extname(candidate).toLowerCase();
      const mime = TYPES[ext] || "application/octet-stream";
      const isAsset = candidate.includes(path.join(DIST, "assets"));
      res.writeHead(200, {
        "Content-Type":  mime,
        "Cache-Control": isAsset ? "public, max-age=31536000, immutable" : "no-cache",
      });
      fs.createReadStream(candidate).pipe(res);
      return;
    }
  }

  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("Not found");
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`MeshBoard frontend on http://0.0.0.0:${PORT}`);
  if (!DIST_OK) {
    console.error("[fatal] dist/index.html missing — Vite build did not run. Check NPM_CONFIG_PRODUCTION and build logs.");
  } else {
    console.log(`Serving ${DIST}`);
  }
});

server.on("error", (err) => {
  console.error("[fatal]", err.message);
  process.exit(1);
});
