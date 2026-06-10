import { useState } from "react";
import { useApi } from "../hooks/useApi";
import { api } from "../api/client";
import { StatusBanner } from "./StatusBanner";
import { useAuth } from "../context/AuthContext";

function WindowBar({ title }) {
  return (
    <div className="window-bar">
      <div className="window-dots">
        <div className="window-dot red" />
        <div className="window-dot yellow" />
        <div className="window-dot green" />
      </div>
      <div className="window-title">{title}</div>
      <div style={{ width: 64 }} />
    </div>
  );
}

function NavItem({ item, active, pendingCount, onClick }) {
  const badge = item.id === "queue" && pendingCount > 0 ? pendingCount : null;
  return (
    <div className={`nav-item ${active ? "active" : ""}`} onClick={onClick}>
      <span className="nav-item-icon">{item.icon}</span>
      <div className="nav-item-body">
        <div className="nav-item-title">{item.label}</div>
        {item.sub && <div className="nav-item-sub">{item.sub}</div>}
      </div>
      {badge != null && <span className="nav-badge">{badge}</span>}
    </div>
  );
}

export default function AppShell({ navGroups, pages, defaultPage, showStats, windowTitle }) {
  const { user, logout } = useAuth();
  const [active, setActive] = useState(defaultPage);
  const { data: stats, reload: reloadStats, error: statsError, loading: statsLoading } = useApi(
    () => (showStats ? api.stats() : Promise.resolve(null)),
    [showStats]
  );
  const pendingCount = stats?.pending_approval || 0;
  const Page = pages[active];
  const activeLabel = navGroups.flatMap((g) => g.items).find((n) => n.id === active)?.label || "";
  const now = new Date().toLocaleString("en-GB", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "short",
  });
  const supernodeId = import.meta.env.VITE_SUPERNODE_ID || "SUPERNODE-ARUSHA-01";

  return (
    <div className="app-root">
      <WindowBar title={windowTitle} />

      <div className="app-body">
        <aside className="sidebar">
          <div className="sidebar-brand">
            <div className="logo-mark">MeshBoard</div>
            <div className="logo-sub">{user?.role === "admin" ? "Super-Node Console" : "Member Portal"}</div>
          </div>

          {showStats && (
            <div className="sidebar-status-row">
              <div className={`status-dot ${statsError ? "offline" : ""}`} />
              <span>{statsError ? "API offline" : "Network online"}</span>
              {pendingCount > 0 && (
                <span style={{ marginLeft: "auto", color: "var(--amber)", fontSize: 11 }}>
                  {pendingCount} pending
                </span>
              )}
            </div>
          )}

          {navGroups.map((group) => (
            <div key={group.label} className="nav-group">
              <div className="nav-group-label">
                {group.label} {group.count != null ? group.count : group.items.length}
              </div>
              {group.items.map((item) => (
                <NavItem
                  key={item.id}
                  item={item}
                  active={active === item.id}
                  pendingCount={pendingCount}
                  onClick={() => setActive(item.id)}
                />
              ))}
            </div>
          ))}

          <div className="sidebar-footer">
            <div className="sidebar-user">
              <strong>{user?.name}</strong>
              {user?.email}
              <span className={`role-pill ${user?.role === "admin" ? "admin" : ""}`}>
                {user?.role || "user"}
              </span>
            </div>
            <div style={{ fontSize: 10, color: "var(--muted)", fontFamily: "var(--mono)", marginTop: 10 }}>
              {supernodeId}
            </div>
          </div>
        </aside>

        <main className="workspace">
          <header className="workspace-header">
            <h1 className="workspace-title">{activeLabel}</h1>
            <div className="workspace-actions">
              <span style={{ fontSize: 11, color: "var(--muted)", fontFamily: "var(--mono)" }}>{now}</span>
              {showStats && (
                <button type="button" className="btn btn-ghost" onClick={reloadStats} style={{ fontSize: 11 }}>
                  ↺ Refresh
                </button>
              )}
              <button type="button" className="btn btn-ghost" onClick={logout} style={{ fontSize: 11, color: "var(--red)" }}>
                Log out
              </button>
            </div>
          </header>

          <div className="workspace-scroll">
            {showStats && !statsLoading && <StatusBanner stats={stats} statsError={statsError} />}
            <Page onApprove={showStats ? reloadStats : undefined} />
          </div>

          <div className="workspace-dock">
            <div className="dock-inner">
              <div className="dock-meta">
                {user?.node_id ? `Node ${user.node_id}` : supernodeId}
              </div>
              <div className="dock-pills">
                {showStats && (
                  <button type="button" className="btn btn-pill" onClick={reloadStats}>
                    Sync stats
                  </button>
                )}
                <button type="button" className="btn btn-pill" onClick={logout}>
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
