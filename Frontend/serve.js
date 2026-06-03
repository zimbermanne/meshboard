const http = require("http");
const fs   = require("fs");
const path = require("path");

const PORT    = parseInt(process.env.PORT || "3000");
const DIST    = path.join(__dirname, "dist");
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

  // Normalise trailing slash
  if (urlPath !== "/" && urlPath.endsWith("/")) urlPath = urlPath.slice(0, -1);

  let filePath = path.join(DIST, urlPath);

  // Security: prevent path traversal outside dist
  if (!filePath.startsWith(DIST)) {
    res.writeHead(403); res.end("Forbidden"); return;
  }

  // Try exact file, then .html extension, then index.html (SPA fallback)
  const candidates = [filePath, filePath + ".html", path.join(DIST, "index.html")];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      const ext  = path.extname(candidate).toLowerCase();
      const mime = TYPES[ext] || "application/octet-stream";
      // Cache assets (hashed filenames) for 1 year, HTML for 0
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
  console.log(`MeshBoard frontend serving dist/ on http://0.0.0.0:${PORT}`);
});
