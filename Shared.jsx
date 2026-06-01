export const sharedCss = `
  .card{background:var(--surface);border:1px solid var(--border);border-radius:6px;padding:20px;}
  .card-label{font-size:10px;font-family:var(--mono);letter-spacing:2px;text-transform:uppercase;color:var(--muted);margin-bottom:8px;}
  .card-value{font-size:28px;font-family:var(--mono);font-weight:600;line-height:1;}
  .card-value.accent{color:var(--accent);}
  .card-value.amber{color:var(--amber);}
  .card-value.red{color:var(--red);}
  .card-sub{font-size:11px;color:var(--muted);margin-top:6px;}
  .grid-4{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:24px;}
  .grid-2{display:grid;grid-template-columns:1fr 1fr;gap:16px;}
  .table-wrap{background:var(--surface);border:1px solid var(--border);border-radius:6px;overflow:hidden;}
  .table-header{padding:14px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;}
  .table-title{font-size:13px;font-weight:600;}
  table{width:100%;border-collapse:collapse;font-size:13px;}
  th{text-align:left;padding:10px 20px;font-size:10px;font-family:var(--mono);letter-spacing:1.5px;text-transform:uppercase;color:var(--muted);border-bottom:1px solid var(--border);font-weight:500;}
  td{padding:12px 20px;border-bottom:1px solid var(--border);vertical-align:middle;}
  tr:last-child td{border-bottom:none;}
  tr:hover td{background:var(--surface2);}
  .mono{font-family:var(--mono);font-size:12px;}
  .badge{display:inline-block;padding:2px 8px;border-radius:3px;font-size:10px;font-family:var(--mono);font-weight:600;letter-spacing:.5px;text-transform:uppercase;}
  .badge-pending{background:rgba(255,179,0,.15);color:var(--amber);}
  .badge-approved{background:rgba(0,230,118,.12);color:var(--accent);}
  .badge-rejected{background:rgba(255,82,82,.12);color:var(--red);}
  .badge-redeemed{background:rgba(64,196,255,.12);color:var(--blue);}
  .badge-expired{background:rgba(107,115,104,.2);color:var(--muted);}
  .btn{padding:7px 14px;border-radius:4px;font-size:12px;font-weight:600;font-family:var(--mono);cursor:pointer;border:none;transition:all .15s;}
  .btn-approve{background:rgba(0,230,118,.15);color:var(--accent);border:1px solid rgba(0,230,118,.3);}
  .btn-approve:hover{background:rgba(0,230,118,.25);}
  .btn-reject{background:rgba(255,82,82,.1);color:var(--red);border:1px solid rgba(255,82,82,.25);}
  .btn-reject:hover{background:rgba(255,82,82,.2);}
  .btn-primary{background:var(--accent);color:#0d0f0e;}
  .btn-primary:hover{background:var(--accent2);}
  .btn-ghost{background:transparent;color:var(--muted);border:1px solid var(--border);}
  .btn-ghost:hover{color:var(--text);}
  .btn:disabled{opacity:.4;cursor:not-allowed;}
  .section-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;}
  .section-title{font-size:16px;font-weight:600;}
  .alert{background:rgba(255,179,0,.08);border:1px solid rgba(255,179,0,.25);border-radius:5px;padding:10px 16px;font-size:12px;color:var(--amber);font-family:var(--mono);margin-bottom:20px;}
  .search-input{background:var(--surface2);border:1px solid var(--border);border-radius:4px;padding:7px 12px;font-size:13px;color:var(--text);font-family:var(--sans);outline:none;width:220px;}
  .search-input:focus{border-color:var(--accent);}
  .search-input::placeholder{color:var(--muted);}
  .field{background:var(--surface);border:1px solid var(--border);border-radius:4px;padding:8px 12px;font-size:13px;color:var(--text);font-family:var(--mono);outline:none;}
  .field:focus{border-color:var(--accent);}
  .input-group{display:flex;flex-direction:column;gap:5px;}
  .input-label{font-size:10px;font-family:var(--mono);letter-spacing:1.5px;text-transform:uppercase;color:var(--muted);}
  .input-row{display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap;}
  .node-id{font-family:var(--mono);font-size:11px;color:var(--muted);}
  .msg-text{max-width:300px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .countdown-wrap{display:flex;align-items:center;gap:8px;}
  .countdown-bar-bg{flex:1;height:4px;background:var(--surface2);border-radius:2px;overflow:hidden;}
  .countdown-bar-fill{height:100%;border-radius:2px;}
  .countdown-label{font-size:11px;font-family:var(--mono);color:var(--muted);white-space:nowrap;}
  .loading{padding:40px;text-align:center;color:var(--muted);font-family:var(--mono);font-size:13px;}
  .error-msg{padding:16px;background:rgba(255,82,82,.08);border:1px solid rgba(255,82,82,.2);border-radius:5px;color:var(--red);font-family:var(--mono);font-size:12px;margin-bottom:20px;}
`;

export function Spinner() {
  return <div className="loading">Loading…</div>;
}

export function ErrorMsg({ msg }) {
  return <div className="error-msg">⚠ {msg}</div>;
}

export function CountdownBar({ secondsRemaining, totalSeconds }) {
  const pct   = Math.max(0, Math.min(100, (secondsRemaining / totalSeconds) * 100));
  const color = pct > 30 ? "var(--accent)" : pct > 8 ? "var(--amber)" : "var(--red)";
  const label = secondsRemaining > 86400
    ? `${(secondsRemaining / 86400).toFixed(1)}d`
    : secondsRemaining > 3600
      ? `${Math.floor(secondsRemaining / 3600)}h`
      : `${Math.floor(secondsRemaining / 60)}m`;
  return (
    <div className="countdown-wrap">
      <div className="countdown-bar-bg">
        <div className="countdown-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="countdown-label">{label} left</span>
    </div>
  );
}