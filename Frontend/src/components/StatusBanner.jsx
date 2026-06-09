import { useApi } from "../hooks/useApi";
import { api } from "../api/client";

export function StatusBanner({ stats, statsError }) {
  const { data: health } = useApi(() => api.health());

  if (statsError) {
    const isDb = health?.database === "disconnected";
    const isBackendConfig =
      /BACKEND_URL|ENOTFOUND base|placeholder/i.test(statsError) ||
      statsError.includes("Backend unreachable");
    return (
      <div className="error-msg" style={{ marginBottom: 20 }}>
        <div style={{ fontWeight: 600, marginBottom: 6 }}>
          {isDb ? "Database not connected" : "Cannot reach backend API"}
        </div>
        <div style={{ marginBottom: 8 }}>{statsError}</div>
        <div style={{ color: "var(--muted)", lineHeight: 1.6 }}>
          {isDb ? (
            <>
              The API is running but PostgreSQL is unreachable. Check <code>DATABASE_URL</code> on Railway,
              or locally run PostgreSQL and set <code>DB_*</code> in <code>.env</code>, then{" "}
              <code>npm run migrate</code> in <code>Backend/</code>.
            </>
          ) : isBackendConfig ? (
            <>
              Railway Frontend service: set <code>BACKEND_URL</code> to your backend public URL with{" "}
              <strong>no</strong> <code>/api</code> suffix, e.g.{" "}
              <code>https://meshboard-super-node.up.railway.app</code>. Remove any{" "}
              <code>VITE_API_BASE_URL=base</code> or placeholder value. Leave{" "}
              <code>VITE_API_BASE_URL</code> unset so the dashboard uses the <code>/api</code> proxy.
            </>
          ) : (
            <>
              Local dev: start the backend with <code>cd Backend &amp;&amp; npm start</code> (port 8080),
              then <code>cd Frontend &amp;&amp; npm run dev</code> (port 5173). Vite proxies{" "}
              <code>/api</code> automatically.
            </>
          )}
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const isEmpty =
    stats.total_nodes === 0 &&
    stats.pending_approval === 0 &&
    stats.active_broadcasts === 0;

  if (!isEmpty) return null;

  return (
    <div className="alert" style={{ marginBottom: 20, lineHeight: 1.6 }}>
      <div style={{ fontWeight: 600, marginBottom: 6 }}>Connected — database is empty</div>
      The API is working but there is no data yet. To populate the dashboard locally, run in{" "}
      <code>Backend/</code>: <code>npm run migrate</code> then <code>npm run seed</code>.
      In production, nodes register via the mobile app and posts appear in the Approval Queue.
    </div>
  );
}
