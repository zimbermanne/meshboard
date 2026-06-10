import { useState } from "react";
import { sharedCss } from "../components/shared";
import { useAuth } from "../context/AuthContext";
import { NODE_ID_RE } from "../api/client";

export default function UserProfile() {
  const { user, updateProfile } = useAuth();
  const [nodeId, setNodeId] = useState(user?.node_id || "");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSave(e) {
    e.preventDefault();
    setError("");
    setSaved(false);

    const trimmed = nodeId.trim().toUpperCase();
    if (trimmed && !NODE_ID_RE.test(trimmed)) {
      setError("Node ID must match format NODE-XXXX-XXXX");
      return;
    }

    setLoading(true);
    try {
      await updateProfile({ node_id: trimmed || null });
      setSaved(true);
    } catch (err) {
      setError(err.message || "Failed to save profile");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <style>{sharedCss}</style>
      <div className="section-head">
        <span className="section-title">Your Profile</span>
      </div>

      <div className="card" style={{ maxWidth: 480, marginBottom: 20 }}>
        <div className="card-label">Account</div>
        <div style={{ fontSize: 15, fontWeight: 600, marginTop: 8 }}>{user?.name}</div>
        <div style={{ fontSize: 12, color: "var(--muted)", fontFamily: "var(--mono)", marginTop: 4 }}>{user?.email}</div>
        <div style={{ fontSize: 12, color: "var(--muted)", fontFamily: "var(--mono)", marginTop: 2 }}>{user?.phone}</div>
        <div style={{ marginTop: 12 }}>
          <span className={`badge badge-${user?.role === "admin" ? "approved" : "pending"}`}>{user?.role || "user"}</span>
        </div>
      </div>

      {error && <div className="error-msg">{error}</div>}
      {saved && (
        <div className="alert" style={{ color: "var(--accent)", borderColor: "rgba(0,230,118,.3)", background: "rgba(0,230,118,.06)" }}>
          Profile saved.
        </div>
      )}

      <form onSubmit={handleSave} className="card" style={{ maxWidth: 480 }}>
        <div className="card-label" style={{ marginBottom: 12 }}>Mesh node</div>
        <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 16, lineHeight: 1.5 }}>
          Link the NODE ID from your mesh device. Required for posting and redeeming credit tokens.
        </p>
        <div className="input-group" style={{ marginBottom: 20 }}>
          <label className="input-label">Node ID</label>
          <input
            className="field"
            value={nodeId}
            onChange={(e) => setNodeId(e.target.value)}
            placeholder="NODE-XXXX-XXXX"
            style={{ width: "100%", letterSpacing: 1 }}
          />
        </div>
        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? "Saving…" : "Save node link"}
        </button>
      </form>
    </>
  );
}
