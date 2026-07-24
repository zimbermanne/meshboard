import { sharedCss, Spinner, ErrorMsg } from "../components/shared";
import { useApi } from "../hooks/useApi";
import { api }    from "../api/client";

export default function Payments() {
  const { data, loading, error } = useApi(() => api.payments());

  const payments = data?.payments || [];
  const total    = data?.total || 0;

  return (
    <>
      <style>{sharedCss}</style>
      <div className="section-head">
        <span className="section-title">Payment Log</span>
        <span style={{fontFamily:"var(--mono)",fontSize:13,color:"var(--accent)"}}>Total: {parseFloat(total).toFixed(2)} BSH</span>
      </div>
      {error && <ErrorMsg msg={error} />}
      {loading && <Spinner />}
      {!loading && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Payment ID</th><th>Node</th><th>Amount (BSH)</th><th>Method</th><th>Token</th><th>Date</th></tr>
            </thead>
            <tbody>
              {payments.length === 0 && (
                <tr><td colSpan={6} style={{color:"var(--muted)",fontFamily:"var(--mono)",fontSize:12}}>No payments yet</td></tr>
              )}
              {payments.map(p => (
                <tr key={p.id}>
                  <td><span className="mono">{p.id}</span></td>
                  <td><div>{p.display_name}</div><div className="node-id">{p.node_id}</div></td>
                  <td><span className="mono" style={{color:"var(--accent)"}}>{parseFloat(p.baosh_amount || p.amount || 0).toFixed(2)} BSH</span></td>
                  <td><span className={`badge ${p.method === "cash" ? "badge-approved" : "badge-redeemed"}`}>{p.method}</span></td>
                  <td><span className="mono" style={{fontSize:11}}>{p.token_id || "—"}</span></td>
                  <td><span className="mono" style={{fontSize:11}}>{new Date(p.created_at).toLocaleString()}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
