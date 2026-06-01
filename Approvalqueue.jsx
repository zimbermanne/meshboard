import { useState } from "react";
import { sharedCss, Spinner, ErrorMsg } from "../components/shared";
import { useApi } from "../hooks/useApi";
import { api }    from "../api/client";

export default function ApprovalQueue({ onApprove }) {
  const { data, loading, error, reload } = useApi(() => api.posts("pending"));
  const [busy, setBusy] = useState({});

  async function approve(id) {
    setBusy(b => ({ ...b, [id]: true }));
    try {
      await api.approvePost(id, "operator");
      reload();
      onApprove?.();
    } catch (e) {
      alert("Approve failed: " + e.message);
    } finally {
      setBusy(b => ({ ...b, [id]: false }));
    }
  }

  async function reject(id) {
    const reason = prompt("Rejection reason (optional):") ?? undefined;
    setBusy(b => ({ ...b, [id]: true }));
    try {
      await api.rejectPost(id, reason);
      reload();
      onApprove?.();
    } catch (e) {
      alert("Reject failed: " + e.message);
    } finally {
      setBusy(b => ({ ...b, [id]: false }));
    }
  }

  return (
    <>
      <style>{sharedCss}</style>
      <div className="section-head">
        <span className="section-title">Approval Queue</span>
        <button className="btn btn-ghost" onClick={reload} style={{fontSize:11}}>↺ Refresh</button>
      </div>

      {error && <ErrorMsg msg={error} />}
      {loading && <Spinner />}

      {!loading && data && (
        <>
          {data.length > 0 && (
            <div className="alert">⚠ {data.length} post{data.length > 1 ? "s" : ""} awaiting approval</div>
          )}
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Node</th><th>Message</th><th>Link / Phone</th>
                  <th>Pkg</th><th>Cost</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.length === 0 && (
                  <tr><td colSpan={6} style={{color:"var(--muted)",fontFamily:"var(--mono)",fontSize:12}}>Queue is empty</td></tr>
                )}
                {data.map(p => (
                  <tr key={p.id}>
                    <td>
                      <div style={{fontWeight:500}}>{p.sender_name}</div>
                      <div className="node-id">{p.node_id}</div>
                    </td>
                    <td><div style={{maxWidth:260}}>{p.message_text}</div></td>
                    <td>
                      <div style={{fontSize:11,color:"var(--muted)",fontFamily:"var(--mono)"}}>
                        {p.link && <div>🔗 {p.link}</div>}
                        {p.phone && <div>📞 {p.phone}</div>}
                      </div>
                    </td>
                    <td><span className="mono">{p.package_days}d</span></td>
                    <td>
                      <span className="mono">
                        {p.is_free_post
                          ? <span style={{color:"var(--muted)"}}>Free</span>
                          : `$${p.credit_cost}`}
                      </span>
                    </td>
                    <td>
                      <div style={{display:"flex",gap:6}}>
                        <button className="btn btn-approve" disabled={busy[p.id]} onClick={() => approve(p.id)}>
                          {busy[p.id] ? "…" : "Approve"}
                        </button>
                        <button className="btn btn-reject" disabled={busy[p.id]} onClick={() => reject(p.id)}>
                          {busy[p.id] ? "…" : "Reject"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}