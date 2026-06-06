import { useState } from "react";
import Overview      from "./pages/Overview";
import ApprovalQueue from "./pages/ApprovalQueue";
import LiveBroadcasts from "./pages/LiveBroadcasts";
import NodeRegistry  from "./pages/NodeRegistry";
import Tokens        from "./pages/Tokens";
import Payments      from "./pages/Payments";
import { useApi }    from "./hooks/useApi";
import { api }       from "./api/client";
import { StatusBanner } from "./components/StatusBanner";

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap');
  :root {
    --bg:#0d0f0e;--surface:#141716;--surface2:#1c1f1d;--border:#2a2e2b;
    --accent:#00e676;--accent2:#69f0ae;--amber:#ffb300;--red:#ff5252;--blue:#40c4ff;
    --text:#e8ede9;--muted:#6b7368;
    --mono:'IBM Plex Mono',monospace;--sans:'IBM Plex Sans',sans-serif;
  }
  *{box-sizing:border-box;margin:0;padding:0;}
  body{background:var(--bg);color:var(--text);font-family:var(--sans);min-height:100vh;}
  .shell{display:flex;min-height:100vh;}
  .sidebar{width:220px;min-height:100vh;background:var(--surface);border-right:1px solid var(--border);display:flex;flex-direction:column;flex-shrink:0;}
  .sidebar-logo{padding:24px 20px 20px;border-bottom:1px solid var(--border);}
  .logo-mark{font-family:var(--mono);font-size:18px;font-weight:600;color:var(--accent);letter-spacing:-0.5px;}
  .logo-sub{font-size:10px;color:var(--muted);font-family:var(--mono);letter-spacing:2px;text-transform:uppercase;margin-top:2px;}
  .sidebar-status{padding:12px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px;font-size:12px;color:var(--muted);font-family:var(--mono);}
  .status-dot{width:7px;height:7px;border-radius:50%;background:var(--accent);box-shadow:0 0 6px var(--accent);animation:pulse 2s infinite;}
  @keyframes pulse{0%,100%{opacity:1;}50%{opacity:.4;}}
  .nav{flex:1;padding:12px 0;}
  .nav-item{display:flex;align-items:center;gap:10px;padding:10px 20px;font-size:13px;font-weight:500;color:var(--muted);cursor:pointer;border-left:2px solid transparent;transition:all .15s;user-select:none;}
  .nav-item:hover{color:var(--text);background:var(--surface2);}
  .nav-item.active{color:var(--accent);border-left-color:var(--accent);background:rgba(0,230,118,.06);}
  .nav-badge{margin-left:auto;background:var(--red);color:#fff;font-size:10px;font-family:var(--mono);font-weight:600;padding:1px 6px;border-radius:10px;}
  .nav-icon{font-size:15px;width:18px;text-align:center;}
  .sidebar-footer{padding:16px 20px;border-top:1px solid var(--border);font-size:11px;color:var(--muted);font-family:var(--mono);}
  .main{flex:1;display:flex;flex-direction:column;overflow:hidden;}
  .topbar{height:52px;border-bottom:1px solid var(--border);display:flex;align-items:center;padding:0 28px;gap:16px;background:var(--surface);}
  .topbar-title{font-size:14px;font-weight:600;}
  .topbar-right{margin-left:auto;display:flex;align-items:center;gap:12px;}
  .sync-info{font-size:11px;color:var(--muted);font-family:var(--mono);}
  .content{flex:1;padding:28px;overflow-y:auto;}
  ::-webkit-scrollbar{width:5px;}
  ::-webkit-scrollbar-track{background:transparent;}
  ::-webkit-scrollbar-thumb{background:var(--border);border-radius:3px;}
`;

const NAV_ITEMS = [
  { id: "overview",   icon: "◈", label: "Overview"        },
  { id: "queue",      icon: "⊞", label: "Approval Queue"  },
  { id: "broadcasts", icon: "◉", label: "Live Broadcasts" },
  { id: "nodes",      icon: "⬡", label: "Node Registry"   },
  { id: "tokens",     icon: "◆", label: "Tokens"          },
  { id: "payments",   icon: "⊕", label: "Payment Log"     },
];

const PAGES = { overview: Overview, queue: ApprovalQueue, broadcasts: LiveBroadcasts, nodes: NodeRegistry, tokens: Tokens, payments: Payments };

export default function App() {
  const [active, setActive] = useState("overview");
  const { data: stats, reload: reloadStats, error: statsError, loading: statsLoading } = useApi(() => api.stats());
  const pendingCount = stats?.pending_approval || 0;
  const Page = PAGES[active];
  const now  = new Date().toLocaleString("en-GB", { hour12: false, hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short", year: "numeric" });

  return (
    <>
      <style>{CSS}</style>
      <div className="shell">
        <aside className="sidebar">
          <div className="sidebar-logo">
            <div className="logo-mark">MeshBoard</div>
            <div className="logo-sub">Super-Node</div>
          </div>
          <div className="sidebar-status">
            <div className="status-dot" style={statsError ? { background: "var(--red)", boxShadow: "0 0 6px var(--red)" } : undefined} />
            {statsError ? "API OFFLINE" : "ONLINE"}
          </div>
          {statsError && (
            <div style={{ padding: "8px 20px", fontSize: 10, color: "var(--red)", fontFamily: "var(--mono)", borderBottom: "1px solid var(--border)", lineHeight: 1.4 }}>
              {statsError}
            </div>
          )}
          <nav className="nav">
            {NAV_ITEMS.map(item => (
              <div key={item.id} className={`nav-item ${active === item.id ? "active" : ""}`} onClick={() => setActive(item.id)}>
                <span className="nav-icon">{item.icon}</span>
                <span>{item.label}</span>
                {item.id === "queue" && pendingCount > 0 && (
                  <span className="nav-badge">{pendingCount}</span>
                )}
              </div>
            ))}
          </nav>
          <div className="sidebar-footer">
            {import.meta.env.VITE_SUPERNODE_ID || "SUPERNODE-ARUSHA-01"}
          </div>
        </aside>

        <div className="main">
          <div className="topbar">
            <span className="topbar-title">{NAV_ITEMS.find(n => n.id === active)?.label}</span>
            <div className="topbar-right">
              <span className="sync-info">{now}</span>
              <button
                onClick={reloadStats}
                style={{ padding:"5px 10px", fontSize:11, background:"transparent", color:"var(--muted)", border:"1px solid var(--border)", borderRadius:4, cursor:"pointer", fontFamily:"var(--mono)" }}
              >
                ↺ Refresh
              </button>
            </div>
          </div>
          <div className="content">
            {!statsLoading && <StatusBanner stats={stats} statsError={statsError} />}
            <Page onApprove={reloadStats} />
          </div>
        </div>
      </div>
    </>
  );
}
