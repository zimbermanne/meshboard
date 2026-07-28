import { useState } from "react";
import { sharedCss, Spinner, ErrorMsg } from "../components/shared";
import { useApi } from "../hooks/useApi";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function AdminUsers() {
  const { user: me } = useAuth();
  const { data: users, loading, error, reload } = useApi(() => api.adminUsers());
  const [busy, setBusy] = useState({});

  async function toggleRole(id, currentRole) {
    const next = currentRole === "admin" ? "user" : "admin";
    if (!confirm(`Change this account to ${next}?`)) return;
    setBusy((b) => ({ ...b, [id]: true }));
    try {
      await api.updateUser(id, { role: next });
      reload();
    } catch (e) {
      alert(e.message);
    } finally {
      setBusy((b) => ({ ...b, [id]: false }));
    }
  }

  async function removeUser(id, email) {
    if (!confirm(`Delete account ${email}? This cannot be undone.`)) return;
    setBusy((b) => ({ ...b, [id]: true }));
    try {
      await api.deleteUser(id);
      reload();
    } catch (e) {
      alert(e.message);
    } finally {
      setBusy((b) => ({ ...b, [id]: false }));
    }
  }

  return (
    <>
      <style>{sharedCss}</style>
      <div className="section-head">
        <span className="section-title">User Accounts</span>
        <button className="btn btn-ghost" onClick={reload} style={{ fontSize: 11 }}>↺ Refresh</button>
      </div>

      {error && <ErrorMsg msg={error} />}
      {loading && <Spinner />}

      {!loading && users && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Node</th>
                <th>Role</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ color: "var(--muted)", fontFamily: "var(--mono)", fontSize: 12 }}>
                    No users yet
                  </td>
                </tr>
              )}
              {users.map((u) => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 500 }}>{u.name}</td>
                  <td><span className="mono" style={{ fontSize: 11 }}>{u.email}</span></td>
                  <td><span className="node-id">{u.node_id || "—"}</span></td>
                  <td>
                    <span className={`badge badge-${u.role === "admin" ? "approved" : "pending"}`}>{u.role}</span>
                  </td>
                  <td><span className="mono" style={{ fontSize: 11 }}>{new Date(u.created_at).toLocaleDateString()}</span></td>
                  <td style={{ display: "flex", gap: 8 }}>
                    <button
                      className="btn btn-ghost"
                      style={{ fontSize: 11 }}
                      disabled={busy[u.id] || u.id === me?.id}
                      onClick={() => toggleRole(u.id, u.role)}
                    >
                      {u.role === "admin" ? "Demote" : "Make admin"}
                    </button>
                    <button
                      className="btn btn-reject"
                      style={{ fontSize: 11 }}
                      disabled={busy[u.id] || u.id === me?.id}
                      onClick={() => removeUser(u.id, u.email)}
                    >
                      Delete
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
