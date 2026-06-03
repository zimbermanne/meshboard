// Frontend/src/api/client.js
//
// IMPORTANT: In Railway production, set the environment variable:
//   VITE_API_BASE_URL = https://your-backend.up.railway.app/api
//
// In local dev, the Vite proxy (vite.config.js) forwards /api → localhost:4000

const BASE = import.meta.env.VITE_API_BASE_URL || "/api";

// Log the base URL once on load so it shows in browser console
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
    // This is the "Failed to fetch" error — usually:
    //  1. Backend is down
    //  2. VITE_API_BASE_URL is wrong / missing in Railway env vars
    //  3. CORS preflight blocked
    throw new Error(
      `Network error — cannot reach ${url}. ` +
      `Check that VITE_API_BASE_URL is set correctly and the backend is running. ` +
      `(${networkErr.message})`
    );
  }

  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error(`Bad response from ${url} — status ${res.status}, body not JSON`);
  }

  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export const api = {
  // Stats
  stats:          ()           => req("GET",   "/stats"),

  // Nodes
  nodes:          (search)     => req("GET",   `/nodes${search ? `?search=${encodeURIComponent(search)}` : ""}`),
  node:           (id)         => req("GET",   `/nodes/${id}`),
  registerNode:   (body)       => req("POST",  "/nodes/register", body),
  updateName:     (id, name)   => req("PATCH", `/nodes/${id}/display-name`, { display_name: name }),
  deactivateNode: (id, reason) => req("POST",  `/nodes/${id}/deactivate`, { reason }),
  reactivateNode: (id)         => req("POST",  `/nodes/${id}/reactivate`),

  // Posts
  posts:          (status)     => req("GET",   `/posts${status ? `?status=${status}` : ""}`),
  activePosts:    ()           => req("GET",   "/posts/active"),
  submitPost:     (body)       => req("POST",  "/posts", body),
  approvePost:    (id, op)     => req("POST",  `/posts/${id}/approve`, { operator: op }),
  rejectPost:     (id, reason) => req("POST",  `/posts/${id}/reject`, { reason }),
  expirePost:     (id)         => req("POST",  `/posts/${id}/expire`),
  deletePost:     (id, reason) => req("POST",  `/posts/${id}/delete`, { reason }),

  // Tokens
  tokens:         (params)     => req("GET",   `/tokens${params ? "?" + new URLSearchParams(params) : ""}`),
  generateToken:  (body)       => req("POST",  "/tokens/generate", body),
  redeemToken:    (body)       => req("POST",  "/tokens/redeem", body),

  // Payments
  payments:       (params)     => req("GET",   `/payments${params ? "?" + new URLSearchParams(params) : ""}`),
  paymentStats:   ()           => req("GET",   "/payments/stats"),

  // Sync
  syncStatus:     ()           => req("GET",   "/sync/status"),
  sync:           (body)       => req("POST",  "/sync", body),
};
