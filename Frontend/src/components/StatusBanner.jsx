import { useApi } from "../hooks/useApi";
import { api } from "../api/client";

export function StatusBanner({ stats, statsError }) {
  const { data: health } = useApi(() => api.health());

  if (statsError) {
    const isDb =
      health?.database === "disconnected" ||
      /database|PostgreSQL|PGHOST/i.test(statsError);
    const isBackendConfig =
      /BACKEND_URL|ENOTFOUND base|placeholder|Backend unreachable/i.test(statsError);
    return (
      <div className="error-msg" style={{ marginBottom: 20 }}>
        <div style={{ fontWeight: 600, marginBottom: 6 }}>
          {isDb ? "Database not connected" : "Cannot reach backend API"}
        </div>
        <div style={{ marginBottom: 8 }}>{statsError}</div>
        <div style={{ color: "var(--muted)", lineHeight: 1.6 }}>
          {isDb ? (
            <>
              The API is running but PostgreSQL is unreachable. On Railway, link Postgres and reference{" "}
              <code>DATABASE_PRIVATE_URL</code> or <code>PGHOST</code> from the PostgreSQL service.
              Locally: set <code>DB_*</code> in <code>.env</code>, then <code>npm run migrate</code> in{" "}
              <code>Backend/</code>.
            </>
          ) : isBackendConfig ? (
            <>
              Railway Frontend: set <code>BACKEND_URL=https://meshboard-super-node.up.railway.app</code>{" "}
              (no <code>/api</code> suffix). Remove placeholder values like <code>base</code>.
            </>
          ) : (
            <>
              Local dev: <code>cd Backend &amp;&amp; npm start</code> (port 8080), then{" "}
              <code>cd Frontend &amp;&amp; npm run dev</code> (port 5173). Vite proxies{" "}
              <code>/api</code> to the backend automatically.
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
