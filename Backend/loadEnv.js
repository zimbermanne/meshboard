const path = require("path");
const fs = require("fs");
const dotenv = require("dotenv");

let loaded = false;

/** Load .env from Backend/ or repo root (meshboard/.env). */
function loadEnv() {
  if (loaded) return;
  const candidates = [
    path.join(__dirname, ".env"),
    path.join(__dirname, "..", ".env"),
  ];
  for (const envPath of candidates) {
    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath });
      loaded = true;
      return;
    }
  }
  dotenv.config();
  loaded = true;
}

module.exports = loadEnv;
