import { sharedCss, Spinner, CountdownBar } from "../components/shared";
import { useApi } from "../hooks/useApi";
import { api } from "../api/client";

export default function UserFeed() {
  const { data: active, loading, error, reload } = useApi(() => api.activePosts());
  const { data: mine } = useApi(() => api.myPosts());

  if (loading) return <><style>{sharedCss}</style><Spinner /></>;

  const broadcasts = active || [];
  const myPosts = mine || [];
  const pending = myPosts.filter((p) => p.status === "pending");

  return (
    <>
      <style>{sharedCss}</style>
      <div className="section-head">
        <span className="section-title">Network Feed</span>
        <button className="btn btn-ghost" onClick={reload} style={{ fontSize: 11 }}>↺ Refresh</button>
      </div>

      {error && <div className="error-msg">{error}</div>}

      <div className="grid-2" style={{ marginBottom: 24 }}>
        <div className="card">
          <div className="card-label">Live broadcasts</div>
          <div className="card-value accent">{broadcasts.length}</div>
          <div className="card-sub">Messages on air right now</div>
        </div>
        <div className="card">
          <div className="card-label">Your pending posts</div>
          <div className={`card-value ${pending.length ? "amber" : ""}`}>{pending.length}</div>
          <div className="card-sub">Awaiting admin approval</div>
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

      {myPosts.length > 0 && (
        <div className="table-wrap">
          <div className="table-header">
            <span className="table-title">Your Posts</span>
          </div>
          <table>
            <thead>
              <tr>
                <th>Message</th>
                <th>Package</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {myPosts.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div className="msg-text" style={{ maxWidth: 400, whiteSpace: "normal" }}>{p.message_text}</div>
                  </td>
                  <td><span className="mono">{p.package_days}d</span></td>
                  <td>
                    <span className={`badge badge-${p.status === "approved" ? "approved" : p.status}`}>{p.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
