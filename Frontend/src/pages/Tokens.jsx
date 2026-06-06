import { useState } from "react";
import { sharedCss, Spinner, ErrorMsg } from "../components/shared";
import { useApi } from "../hooks/useApi";
import { api }    from "../api/client";

export default function Tokens() {
  const { data: tokens, loading, error, reload } = useApi(() => api.tokens());
  const { data: nodes }  = useApi(() => api.nodes());

  const [form, setForm]       = useState({ node_id: "", amount: "", operator: "operator-01", method: "cash" });
  const [generated, setGenerated] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError]   = useState(null);

  async function generate() {
    if (!form.node_id || !form.amount) return setFormError("Node and amount are required");
    setSubmitting(true);
    setFormError(null);
    try {
      const result = await api.generateToken({ ...form, amount: parseFloat(form.amount) });
      setGenerated(result);
      reload();
      setForm(f => ({ ...f, node_id: "", amount: "" }));
    } catch (e) {
      setFormError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <style>{sharedCss}{`
        .token-box{background:var(--surface2);border:1px solid var(--border);border-radius:6px;padding:20px;margin-bottom:20px;}
        .token-display{font-family:var(--mono);font-size:20px;font-weight:600;color:var(--accent);letter-spacing:2px;padding:14px 16px;background:rgba(0,230,118,.06);border:1px dashed rgba(0,230,118,.3);border-radius:4px;margin:12px 0;text-align:center;}
      `}</style>

      <div className="section-head"><span className="section-title">Token Management</span></div>

      {/* Generator */}
      <div className="token-box">
        <div style={{fontSize:13,fontWeight:600,marginBottom:14}}>Generate New Token</div>
        {formError && <div className="error-msg" style={{marginBottom:12}}>⚠ {formError}</div>}
        <div className="input-row">
          <div className="input-group">
            <span className="input-label">Node</span>
            <select className="field" value={form.node_id} onChange={e => setForm(f=>({...f,node_id:e.target.value}))} style={{minWidth:240}}>
              <option value="">— Select node —</option>
              {(nodes||[]).map(n => <option key={n.id} value={n.id}>{n.display_name} ({n.id})</option>)}
            </select>
          </div>
          <div className="input-group">
            <span className="input-label">Amount (USD)</span>
            <input className="field" type="number" min="1" placeholder="e.g. 10" value={form.amount} onChange={e => setForm(f=>({...f,amount:e.target.value}))} style={{width:110}} />
          </div>
          <div className="input-group">
            <span className="input-label">Method</span>
            <select className="field" value={form.method} onChange={e => setForm(f=>({...f,method:e.target.value}))}>
              <option value="cash">Cash</option>
              <option value="mpesa">M-Pesa</option>
            </select>
          </div>
          <button className="btn btn-primary" disabled={submitting} onClick={generate}>
            {submitting ? "Generating…" : "Generate Token"}
          </button>
        </div>

        {generated && (
          <div style={{marginTop:14}}>
            <div style={{fontSize:11,color:"var(--muted)",fontFamily:"var(--mono)",marginBottom:4}}>TOKEN GENERATED — COMMUNICATE TO USER</div>
            <div className="token-display">{generated.token.id}</div>
            <div style={{fontSize:11,color:"var(--muted)",fontFamily:"var(--mono)"}}>
              Amount: ${generated.token.amount} · Expires: {new Date(generated.token.expires_at).toLocaleString()} · Payment: {generated.payment_id}
            </div>
          </div>
        )}
      </div>

      {/* History */}
      {error && <ErrorMsg msg={error} />}
      {loading && <Spinner />}
      {!loading && tokens && (
        <div className="table-wrap">
          <div className="table-header">
            <span className="table-title">Token History</span>
            <button className="btn btn-ghost" onClick={reload} style={{fontSize:11}}>↺ Refresh</button>
          </div>
          <table>
            <thead><tr><th>Token ID</th><th>Node</th><th>Amount</th><th>Created</th><th>Expires</th><th>Status</th></tr></thead>
            <tbody>
              {tokens.length === 0 && (
                <tr><td colSpan={6} style={{color:"var(--muted)",fontFamily:"var(--mono)",fontSize:12}}>No tokens yet — generate one above</td></tr>
              )}
              {tokens.map(t => (
                <tr key={t.id}>
                  <td><span className="mono">{t.id}</span></td>
                  <td><div>{t.display_name}</div><div className="node-id">{t.node_id}</div></td>
                  <td><span className="mono">${parseFloat(t.amount).toFixed(2)}</span></td>
                  <td><span className="mono" style={{fontSize:11}}>{new Date(t.created_at).toLocaleString()}</span></td>
                  <td><span className="mono" style={{fontSize:11}}>{new Date(t.expires_at).toLocaleString()}</span></td>
                  <td><span className={`badge badge-${t.status}`}>{t.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
