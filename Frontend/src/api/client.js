// Frontend/src/api/client.js
//
// Production (Railway): leave VITE_API_BASE_URL unset — serve.js proxies /api → BACKEND_URL.
// Set BACKEND_URL on the Frontend Railway service (runtime, no rebuild needed).
//
// Local dev: leave unset; Vite on :5173 proxies /api → http://localhost:8080

const NODE_ID_RE = /^NODE-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
const PLACEHOLDER_HOSTS = new Set(["base", "backend", "host"]);

function normalizeApiBase(raw) {
  const trimmed = (raw || "").trim();
  if (!trimmed) return "/api";

  if (trimmed.startsWith("/")) {
    let base = trimmed.replace(/\/+$/, "");
    base = base.replace(/\/(nodes|posts|tokens|payments|sync|stats)$/i, "");
    if (!base.endsWith("/api")) {
      if (base === "" || base === "/") return "/api";
      return `${base}/api`;
    }
    return base;
  }

  if (!/^https?:\/\//i.test(trimmed)) {
    console.warn("[api] Ignoring invalid VITE_API_BASE_URL — use /api or https://host.up.railway.app/api");
    return "/api";
  }
  try {
    const { hostname } = new URL(trimmed);
    if (PLACEHOLDER_HOSTS.has(hostname.toLowerCase())) return "/api";
  } catch {
    return "/api";
  }

  let base = trimmed.replace(/\/+$/, "");
  base = base.replace(/\/(nodes|posts|tokens|payments|sync|stats)$/i, "");
  if (!base.endsWith("/api")) return `${base}/api`;
  return base;
}

const BASE = normalizeApiBase(import.meta.env.VITE_API_BASE_URL);

console.log("[api] base URL:", BASE);

async function req(method, path, body) {
  const url = `${BASE}${path}`;
  let res;
  try {
    res = await fetch(url, {
      method,
      headers: body ? { "Content-Type": "application/json" } : {},
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (networkErr) {
    throw new Error(
      `Network error — cannot reach ${url}. ` +
      `Set VITE_API_BASE_URL to your backend URL ending in /api (e.g. https://host.up.railway.app/api). ` +
      `(${networkErr.message})`
    );
  }

  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    const preview = text.slice(0, 80).replace(/\s+/g, " ");
    throw new Error(
      `Bad response from ${url} (HTTP ${res.status}). Expected JSON, got: ${preview || "(empty)"}. ` +
      `If deployed, set BACKEND_URL on the Frontend Railway service (serve.js proxies /api).`
    );
  }

  if (!res.ok) {
    const hint =
      data.hint ||
      (/\/api\/nodes\/(stats|posts|tokens|payments|sync)/.test(url)
        ? " VITE_API_BASE_URL should end with /api, not /api/nodes."
        : "");
    throw new Error((data.error || `HTTP ${res.status}`) + hint);
  }
  return data;
}

export const api = {
  health:         ()           => req("GET",   "/health"),
  stats:          ()           => req("GET",   "/stats"),

  nodes:          (search)     => req("GET",   `/nodes${search ? `?search=${encodeURIComponent(search)}` : ""}`),
  node:           (id)         => req("GET",   `/nodes/${id}`),
  registerNode:   (body)       => req("POST",  "/nodes/register", body),
  updateName:     (id, name)   => req("PATCH", `/nodes/${id}/display-name`, { display_name: name }),
  deactivateNode: (id, reason) => req("POST",  `/nodes/${id}/deactivate`, { reason }),
  reactivateNode: (id)         => req("POST",  `/nodes/${id}/reactivate`),

  posts:          (status)     => req("GET",   `/posts${status ? `?status=${status}` : ""}`),
  activePosts:    ()           => req("GET",   "/posts/active"),
  submitPost:     (body)       => req("POST",  "/posts", body),
  approvePost:    (id, op)     => req("POST",  `/posts/${id}/approve`, { operator: op }),
  rejectPost:     (id, reason) => req("POST",  `/posts/${id}/reject`, { reason }),
  expirePost:     (id)         => req("POST",  `/posts/${id}/expire`),
  deletePost:     (id, reason) => req("POST",  `/posts/${id}/delete`, { reason }),

  tokens:         (params)     => req("GET",   `/tokens${params ? "?" + new URLSearchParams(params) : ""}`),
  generateToken:  (body)       => req("POST",  "/tokens/generate", body),
  redeemToken:    (body)       => req("POST",  "/tokens/redeem", body),

  payments:       (params)     => req("GET",   `/payments${params ? "?" + new URLSearchParams(params) : ""}`),
  paymentStats:   ()           => req("GET",   "/payments/stats"),

  syncStatus:     ()           => req("GET",   "/sync/status"),
  sync:           (body)       => req("POST",  "/sync", body),
};

export { NODE_ID_RE, normalizeApiBase };
