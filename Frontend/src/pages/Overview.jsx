import { sharedCss, Spinner, CountdownBar } from "../components/shared";
import { useApi } from "../hooks/useApi";
import { api }    from "../api/client";

export default function Overview() {
  const { data: stats, loading: sl } = useApi(() => api.stats());
  const { data: active,    loading: al }             = useApi(() => api.activePosts());
  const { data: postsData, loading: pl }             = useApi(() => api.posts("pending"));

  if (sl) return <><style>{sharedCss}</style><Spinner /></>;

  const posts = postsData || [];
  const broadcasts = active || [];

  return (
    <>
      <style>{sharedCss}</style>
      <div className="section-head"><span className="section-title">Network Overview</span></div>

      <div className="grid-4">
        <div className="card">
          <div className="card-label">Registered Nodes</div>
          <div className="card-value accent">{stats?.total_nodes ?? "—"}</div>
        </div>
        <div className="card">
          <div className="card-label">Live Broadcasts</div>
          <div className="card-value">{stats?.active_broadcasts ?? "—"}</div>
        </div>
        <div className="card">
          <div className="card-label">Pending Approval</div>
          <div className={`card-value ${stats?.pending_approval > 0 ? "amber" : ""}`}>{stats?.pending_approval ?? "—"}</div>
          {stats?.pending_approval > 0 && <div className="card-sub">Needs review</div>}
        </div>
        <div className="card">
          <div className="card-label">Revenue (This Month)</div>
          <div className="card-value accent">{parseFloat(stats?.revenue?.this_month || 0).toFixed(2)} BSH</div>
          <div className="card-sub">All time: {parseFloat(stats?.revenue?.all_time || 0).toFixed(2)} BSH</div>
        </div>
      </div>

      <div className="grid-2">
        <div className="table-wrap">
          <div className="table-header"><span className="table-title">Pending Approvals</span></div>
          {pl ? <Spinner /> : (
            <table>
              <thead><tr><th>Node</th><th>Message</th><th>Pkg</th></tr></thead>
              <tbody>
                {posts.length === 0 && (
                  <tr><td colSpan={3} style={{color:"var(--muted)",fontFamily:"var(--mono)",fontSize:12}}>No pending posts</td></tr>
                )}
                {posts.slice(0,5).map(p => (
                  <tr key={p.id}>
                    <td><div style={{fontSize:12}}>{p.sender_name}</div><div className="node-id">{p.node_id}</div></td>
                    <td><div className="msg-text">{p.message_text}</div></td>
                    <td><span className="mono">{p.package_days}d</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="table-wrap">
          <div className="table-header"><span className="table-title">Live Broadcasts</span></div>
          {al ? <Spinner /> : (
            <table>
              <thead><tr><th>Sender</th><th>Time Remaining</th></tr></thead>
              <tbody>
                {broadcasts.length === 0 && (
                  <tr><td colSpan={2} style={{color:"var(--muted)",fontFamily:"var(--mono)",fontSize:12}}>No active broadcasts</td></tr>
                )}
                {broadcasts.slice(0,5).map(b => (
                  <tr key={b.id}>
                    <td>
                      <div style={{fontSize:12}}>{b.sender_name}</div>
                      <div className="msg-text" style={{fontSize:11,color:"var(--muted)"}}>{b.message_text}</div>
                    </td>
                    <td>
                      <CountdownBar secondsRemaining={b.seconds_remaining} totalSeconds={b.total_seconds} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
