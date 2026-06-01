import { sharedCss, Spinner, ErrorMsg, CountdownBar } from "../components/shared";
import { useApi } from "../hooks/useApi";
import { api }    from "../api/client";
import { useState } from "react";

export default function LiveBroadcasts() {
  const { data, loading, error, reload } = useApi(() => api.activePosts());
  const [expiring, setExpiring] = useState({});

  async function expire(id) {
    if (!confirm("Manually expire this broadcast?")) return;
    setExpiring(e => ({ ...e, [id]: true }));
    try {
      await api.expirePost(id);
      reload();
    } catch (e) {
      alert("Error: " + e.message);
    } finally {
      setExpiring(e => ({ ...e, [id]: false }));
    }
  }

  return (
    <>
      <style>{sharedCss}</style>
      <div className="section-head">
        <span className="section-title">Live Broadcasts</span>
        <button className="btn btn-ghost" onClick={reload} style={{fontSize:11}}>↺ Refresh</button>
      </div>
      {error && <ErrorMsg msg={error} />}
      {loading && <Spinner />}
      {!loading && data && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>ID</th><th>Sender</th><th>Message</th><th>Time Remaining</th><th>Action</th></tr>
            </thead>
            <tbody>
              {data.length === 0 && (
                <tr><td colSpan={5} style={{color:"var(--muted)",fontFamily:"var(--mono)",fontSize:12}}>No active broadcasts</td></tr>
              )}
              {data.map(b => (
                <tr key={b.id}>
                  <td><span className="mono">{b.id}</span></td>
                  <td style={{fontWeight:500}}>{b.sender_name}</td>
                  <td><div className="msg-text">{b.message_text}</div></td>
                  <td style={{minWidth:160}}>
                    <CountdownBar secondsRemaining={b.seconds_remaining} totalSeconds={b.total_seconds} />
                  </td>
                  <td>
                    <button className="btn btn-reject" style={{fontSize:11}} disabled={expiring[b.id]} onClick={() => expire(b.id)}>
                      {expiring[b.id] ? "…" : "Expire"}
                    </button>
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
