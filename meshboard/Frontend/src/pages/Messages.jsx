import { sharedCss, Spinner, CountdownBar } from "../components/shared";
import { useApi } from "../hooks/useApi";
import { api } from "../api/client";

export default function Messages() {
  const { data: active, loading: al, error: activeErr } = useApi(() => api.activePosts());
  const { data: pending, loading: pl, error: pendingErr } = useApi(() => api.posts("pending"));
  const { data: approved, loading: apl, error: approvedErr } = useApi(() => api.posts("approved"));

  const loading = al || pl || apl;
  const error = activeErr || pendingErr || approvedErr;

  if (loading) return <><style>{sharedCss}</style><Spinner /></>;

  const broadcasts = active || [];
  const pendingPosts = pending || [];
  const recentApproved = (approved || []).slice(0, 20);

  return (
    <>
      <style>{sharedCss}</style>
      <div className="section-head">
        <span className="section-title">Network Messages</span>
      </div>

      {error && <div className="error-msg">{error}</div>}

      <div className="grid-2" style={{ marginBottom: 24 }}>
        <div className="card">
          <div className="card-label">Live broadcasts</div>
          <div className="card-value accent">{broadcasts.length}</div>
          <div className="card-sub">Currently on air</div>
        </div>
        <div className="card">
          <div className="card-label">Pending approval</div>
          <div className={`card-value ${pendingPosts.length ? "amber" : ""}`}>{pendingPosts.length}</div>
          <div className="card-sub">Awaiting operator review</div>
        </div>
      </div>

      <div className="table-wrap" style={{ marginBottom: 24 }}>
        <div className="table-header">
          <span className="table-title">Live Broadcasts</span>
        </div>
        <table>
          <thead>
            <tr>
              <th>Sender</th>
              <th>Message</th>
              <th>Time left</th>
            </tr>
          </thead>
          <tbody>
            {broadcasts.length === 0 && (
              <tr>
                <td colSpan={3} style={{ color: "var(--muted)", fontFamily: "var(--mono)", fontSize: 12 }}>
                  No live broadcasts right now
                </td>
              </tr>
            )}
            {broadcasts.map((b) => (
              <tr key={b.id}>
                <td>
                  <div style={{ fontSize: 12 }}>{b.sender_name}</div>
                  <div className="node-id">{b.node_id}</div>
                </td>
                <td>
                  <div className="msg-text" style={{ maxWidth: 400, whiteSpace: "normal" }}>{b.message_text}</div>
                  {b.link && <div className="node-id">{b.link}</div>}
                </td>
                <td>
                  <CountdownBar secondsRemaining={b.seconds_remaining} totalSeconds={b.total_seconds} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="table-wrap" style={{ marginBottom: 24 }}>
        <div className="table-header">
          <span className="table-title">Pending Messages</span>
        </div>
        <table>
          <thead>
            <tr>
              <th>Sender</th>
              <th>Message</th>
              <th>Package</th>
            </tr>
          </thead>
          <tbody>
            {pendingPosts.length === 0 && (
              <tr>
                <td colSpan={3} style={{ color: "var(--muted)", fontFamily: "var(--mono)", fontSize: 12 }}>
                  No pending messages
                </td>
              </tr>
            )}
            {pendingPosts.map((p) => (
              <tr key={p.id}>
                <td>
                  <div style={{ fontSize: 12 }}>{p.sender_name}</div>
                  <div className="node-id">{p.node_id}</div>
                </td>
                <td>
                  <div className="msg-text" style={{ maxWidth: 400, whiteSpace: "normal" }}>{p.message_text}</div>
                </td>
                <td><span className="mono">{p.package_days}d</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="table-wrap">
        <div className="table-header">
          <span className="table-title">Recently Approved</span>
        </div>
        <table>
          <thead>
            <tr>
              <th>Sender</th>
              <th>Message</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {recentApproved.length === 0 && (
              <tr>
                <td colSpan={3} style={{ color: "var(--muted)", fontFamily: "var(--mono)", fontSize: 12 }}>
                  No approved messages yet
                </td>
              </tr>
            )}
            {recentApproved.map((p) => (
              <tr key={p.id}>
                <td>
                  <div style={{ fontSize: 12 }}>{p.sender_name}</div>
                </td>
                <td>
                  <div className="msg-text" style={{ maxWidth: 400, whiteSpace: "normal" }}>{p.message_text}</div>
                </td>
                <td>
                  <span className={`badge ${p.expires_at && new Date(p.expires_at) > new Date() ? "badge-approved" : "badge-expired"}`}>
                    {p.expires_at && new Date(p.expires_at) > new Date() ? "live" : "expired"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
