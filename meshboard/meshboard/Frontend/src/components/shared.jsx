export const sharedCss = `
  .card{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:20px;}
  .card-label{font-size:11px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:var(--muted);margin-bottom:8px;}
  .card-value{font-size:28px;font-family:var(--mono);font-weight:600;line-height:1;color:var(--text);}
  .card-value.accent{color:var(--accent);}
  .card-value.amber{color:var(--amber);}
  .card-value.red{color:var(--red);}
  .card-sub{font-size:12px;color:var(--muted);margin-top:6px;}
  .grid-4{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:24px;}
  .grid-2{display:grid;grid-template-columns:1fr 1fr;gap:16px;}
  @media (max-width: 1100px){.grid-4{grid-template-columns:repeat(2,1fr);}}
  @media (max-width: 640px){.grid-4,.grid-2{grid-template-columns:1fr;}}
  .table-wrap{background:var(--surface-raised);border:1px solid var(--border);border-radius:12px;overflow:hidden;}
  .table-header{padding:14px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;background:var(--surface);}
  .table-title{font-size:13px;font-weight:600;color:var(--text);}
  table{width:100%;border-collapse:collapse;font-size:13px;}
  th{text-align:left;padding:10px 20px;font-size:11px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;color:var(--muted);border-bottom:1px solid var(--border);background:var(--surface);}
  td{padding:12px 20px;border-bottom:1px solid var(--border);vertical-align:middle;color:var(--text-body);}
  tr:last-child td{border-bottom:none;}
  tr:hover td{background:var(--surface);}
  .mono{font-family:var(--mono);font-size:12px;}
  .badge{display:inline-block;padding:2px 8px;border-radius:6px;font-size:10px;font-family:var(--mono);font-weight:600;letter-spacing:.03em;text-transform:uppercase;}
  .badge-pending{background:var(--amber-soft);color:var(--amber);}
  .badge-approved{background:var(--accent-soft);color:var(--accent);}
  .badge-rejected{background:var(--red-soft);color:var(--red);}
  .badge-redeemed{background:var(--blue-soft);color:var(--blue);}
  .badge-expired{background:var(--surface-hover);color:var(--muted);}
  .badge-revoked{background:var(--red-soft);color:var(--red);}
  .badge-user{background:var(--blue-soft);color:var(--blue);}
  .btn{padding:7px 14px;border-radius:8px;font-size:12px;font-weight:500;font-family:var(--sans);cursor:pointer;border:1px solid transparent;transition:all .15s;}
  .btn-approve{background:var(--accent-soft);color:var(--accent);border-color:rgba(5,150,105,.2);}
  .btn-approve:hover{background:rgba(5,150,105,.18);}
  .btn-reject{background:var(--red-soft);color:var(--red);border-color:rgba(225,29,72,.15);}
  .btn-reject:hover{background:rgba(225,29,72,.16);}
  .btn-primary{background:var(--text);color:var(--bg);border-color:var(--text);}
  .btn-primary:hover{background:#333;}
  .btn-ghost{background:var(--surface);color:var(--subtle);border-color:var(--border);}
  .btn-ghost:hover{background:var(--surface-hover);color:var(--text);}
  .btn-pill{font-size:11px;padding:5px 10px;background:var(--surface);color:var(--subtle);border:1px solid var(--border);border-radius:8px;}
  .btn-pill:hover{background:var(--surface-hover);}
  .btn:disabled{opacity:.45;cursor:not-allowed;}
  .section-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;}
  .section-title{font-size:16px;font-weight:600;color:var(--text);}
  .alert{background:var(--amber-soft);border:1px solid rgba(217,119,6,.2);border-radius:12px;padding:12px 16px;font-size:13px;color:var(--amber);margin-bottom:20px;line-height:1.5;}
  .search-input{background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:8px 12px;font-size:13px;color:var(--text);font-family:var(--sans);outline:none;width:220px;}
  .search-input:focus{border-color:var(--border-strong);}
  .search-input::placeholder{color:var(--muted-light);}
  .field{background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:8px 12px;font-size:13px;color:var(--text);font-family:var(--mono);outline:none;}
  .field:focus{border-color:var(--border-strong);}
  .input-group{display:flex;flex-direction:column;gap:6px;}
  .input-label{font-size:11px;font-weight:500;letter-spacing:0.04em;text-transform:uppercase;color:var(--muted);}
  .input-row{display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap;}
  .node-id{font-family:var(--mono);font-size:11px;color:var(--muted);}
  .msg-text{max-width:300px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .countdown-wrap{display:flex;align-items:center;gap:8px;}
  .countdown-bar-bg{flex:1;height:4px;background:var(--surface-hover);border-radius:2px;overflow:hidden;}
  .countdown-bar-fill{height:100%;border-radius:2px;}
  .countdown-label{font-size:11px;font-family:var(--mono);color:var(--muted);white-space:nowrap;}
  .loading{padding:40px;text-align:center;color:var(--muted);font-size:13px;}
  .error-msg{padding:14px 16px;background:var(--red-soft);border:1px solid rgba(225,29,72,.15);border-radius:12px;color:var(--red);font-size:13px;margin-bottom:20px;line-height:1.5;}
  .prompt-card{background:var(--surface);border:1px solid var(--border);padding:16px;border-radius:12px;max-width:640px;}
  .file-row{display:flex;align-items:center;justify-content:space-between;border:1px solid var(--border);background:var(--surface-raised);padding:10px 12px;border-radius:8px;font-size:12px;}
`;

export function Spinner() {
  return <div className="loading">Loading…</div>;
}

export function ErrorMsg({ msg }) {
  return <div className="error-msg">{msg}</div>;
}

export function CountdownBar({ secondsRemaining, totalSeconds }) {
  const pct = Math.max(0, Math.min(100, (secondsRemaining / totalSeconds) * 100));
  const color = pct > 30 ? "var(--accent)" : pct > 8 ? "var(--amber)" : "var(--red)";
  const label =
    secondsRemaining > 86400
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
