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

let authToken = null;

export function setAuthToken(token) {
  authToken = token || null;
}

async function req(method, path, body, { auth = true } = {}) {
  const url = `${BASE}${path}`;
  const headers = {};
  if (body) headers["Content-Type"] = "application/json";
  if (auth && authToken) headers.Authorization = `Bearer ${authToken}`;

  let res;
  try {
    res = await fetch(url, {
      method,
      headers,
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
    if (res.status === 401 && auth) {
      throw new Error(data.error || "Please log in again.");
    }
    if (res.status === 403) {
      throw new Error(data.error || "You do not have permission for this action.");
    }
    const hint =
      data.hint ||
      (/\/api\/nodes\/(stats|posts|tokens|payments|sync)/.test(url)
        ? " VITE_API_BASE_URL should end with /api, not /api/nodes."
        : "");
    const detail =
      data.error ||
      data.message ||
      (data.diagnostics?.hint ? `${data.diagnostics.hint}` : "") ||
      `HTTP ${res.status}`;
    throw new Error(detail + (hint && !String(detail).includes(hint) ? hint : ""));
  }
  return data;
}

export const api = {
  health:         ()           => req("GET",   "/health", undefined, { auth: false }),
  register:       (body)       => req("POST",  "/auth/register", body, { auth: false }),
  login:          (body)       => req("POST",  "/auth/login", body, { auth: false }),
  me:             ()           => req("GET",   "/auth/me"),
  updateProfile:  (body)       => req("PATCH", "/auth/profile", body),

  stats:          ()           => req("GET",   "/stats"),

  nodes:          (search)     => req("GET",   `/nodes${search ? `?search=${encodeURIComponent(search)}` : ""}`),
  node:           (id)         => req("GET",   `/nodes/${id}`),
  registerNode:   (body)       => req("POST",  "/nodes/register", body),
  updateName:     (id, name)   => req("PATCH", `/nodes/${id}/display-name`, { display_name: name }),
  deactivateNode: (id, reason) => req("POST",  `/nodes/${id}/deactivate`, { reason }),
  reactivateNode: (id)         => req("POST",  `/nodes/${id}/reactivate`),

  posts:          (status)     => req("GET",   `/posts${status ? `?status=${status}` : ""}`),
  myPosts:        ()           => req("GET",   "/posts/mine"),
  activePosts:    ()           => req("GET",   "/posts/active"),
  submitPost:     (body)       => req("POST",  "/posts", body),
  approvePost:    (id, op)     => req("POST",  `/posts/${id}/approve`, { operator: op }),
  rejectPost:     (id, reason) => req("POST",  `/posts/${id}/reject`, { reason }),
  renewPost:      (id)         => req("POST",  `/posts/${id}/renew`),
  expirePost:     (id)         => req("POST",  `/posts/${id}/expire`),
  deletePost:     (id, reason) => req("POST",  `/posts/${id}/delete`, { reason }),

  tokens:         (params)     => req("GET",   `/tokens${params ? "?" + new URLSearchParams(params) : ""}`),
  generateToken:  (body)       => req("POST",  "/tokens/generate", body),
  revokeToken:    (id)         => req("POST",  `/tokens/revoke/${id}`),
  redeemToken:    (body)       => req("POST",  "/tokens/redeem", body, { auth: false }),

  payments:       (params)     => req("GET",   `/payments${params ? "?" + new URLSearchParams(params) : ""}`),
  paymentStats:   ()           => req("GET",   "/payments/stats"),

  syncStatus:     ()           => req("GET",   "/sync/status"),
  sync:           (body)       => req("POST",  "/sync", body),

  adminUsers:     ()           => req("GET",   "/admin/users"),
  updateUser:     (id, body)   => req("PATCH", `/admin/users/${id}`, body),
  deleteUser:     (id)         => req("DELETE", `/admin/users/${id}`),
};

export { NODE_ID_RE, normalizeApiBase };
