import { useState } from "react";
import { sharedCss, Spinner, ErrorMsg } from "../components/shared";
import { useApi } from "../hooks/useApi";
import { api }    from "../api/client";

export default function NodeRegistry() {
  const [search, setSearch] = useState("");
  const { data, loading, error } = useApi(() => api.nodes(search), [search]);

  return (
    <>
      <style>{sharedCss}</style>
      <div className="section-head">
        <span className="section-title">Node Registry</span>
        <input
          className="search-input"
          placeholder="Search name or NODE ID…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>
      {error && <ErrorMsg msg={error} />}
      {loading && <Spinner />}
      {!loading && data && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>NODE ID</th><th>Display Name</th><th>Registered</th><th>Last Seen</th><th>Balance</th><th>Spent</th><th>Posts</th></tr>
            </thead>
            <tbody>
              {data.length === 0 && (
                <tr><td colSpan={7} style={{color:"var(--muted)",fontFamily:"var(--mono)",fontSize:12}}>No nodes found</td></tr>
              )}
              {data.map(n => (
                <tr key={n.id}>
                  <td><span className="mono">{n.id}</span></td>
                  <td style={{fontWeight:500}}>{n.display_name}</td>
                  <td><span className="mono" style={{fontSize:11}}>{new Date(n.registered_at).toLocaleDateString()}</span></td>
                  <td><span className="mono" style={{fontSize:11}}>{n.last_seen_at ? new Date(n.last_seen_at).toLocaleString() : "—"}</span></td>
                  <td><span className="mono" style={{color: parseFloat(n.credit_balance) > 0 ? "var(--accent)" : "var(--muted)"}}>
                    ${parseFloat(n.credit_balance).toFixed(2)}
                  </span></td>
                  <td><span className="mono">${parseFloat(n.total_spent).toFixed(2)}</span></td>
                  <td><span className="mono">{n.total_posts ?? 0}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}