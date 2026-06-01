const BASE = import.meta.env.VITE_API_BASE_URL || "/api";

async function req(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export const api = {
  // Stats
  stats:          ()         => req("GET",   "/stats"),

  // Nodes
  nodes:          (search)   => req("GET",   `/nodes${search ? `?search=${encodeURIComponent(search)}` : ""}`),
  node:           (id)       => req("GET",   `/nodes/${id}`),
  registerNode:   (body)     => req("POST",  "/nodes/register", body),
  updateName:     (id, name) => req("PATCH", `/nodes/${id}/display-name`, { display_name: name }),

  // Posts
  posts:          (status)   => req("GET",   `/posts${status ? `?status=${status}` : ""}`),
  activePosts:    ()         => req("GET",   "/posts/active"),
  submitPost:     (body)     => req("POST",  "/posts", body),
  approvePost:    (id, op)   => req("POST",  `/posts/${id}/approve`, { operator: op }),
  rejectPost:     (id, reason) => req("POST",`/posts/${id}/reject`, { reason }),
  expirePost:     (id)       => req("POST",  `/posts/${id}/expire`),

  // Tokens
  tokens:         (params)   => req("GET",   `/tokens${params ? "?" + new URLSearchParams(params) : ""}`),
  generateToken:  (body)     => req("POST",  "/tokens/generate", body),
  redeemToken:    (body)     => req("POST",  "/tokens/redeem", body),

  // Payments
  payments:       (params)   => req("GET",   `/payments${params ? "?" + new URLSearchParams(params) : ""}`),
  paymentStats:   ()         => req("GET",   "/payments/stats"),

  // Sync
  syncStatus:     ()         => req("GET",   "/sync/status"),
  sync:           (body)     => req("POST",  "/sync", body),
};
