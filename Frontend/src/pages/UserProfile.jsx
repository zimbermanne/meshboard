import { useState } from "react";
import { sharedCss } from "../components/shared";
import { useAuth } from "../context/AuthContext";
import { NODE_ID_RE } from "../api/client";

export default function UserProfile() {
  const { user, updateProfile } = useAuth();
  const [nodeId, setNodeId] = useState(user?.node_id || "");
  const [town, setTown] = useState(user?.town || "");
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
    if (!town) {
      setError("Please select your town");
      return;
    }

    setLoading(true);
    try {
      // Only send node_id if the user actually entered something — never
      // clear it to null, since every account needs a linked node to post.
      await updateProfile({ town, ...(trimmed ? { node_id: trimmed } : {}) });
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
          {user?.town && <span className="badge" style={{ marginLeft: 8, textTransform: "capitalize" }}>{user.town}</span>}
        </div>
      </div>

      {error && <div className="error-msg">{error}</div>}
      {saved && (
        <div className="alert" style={{ color: "var(--accent)", borderColor: "rgba(5,150,105,.25)", background: "var(--accent-soft)" }}>
          Profile saved.
        </div>
      )}

      <form onSubmit={handleSave} className="card" style={{ maxWidth: 480 }}>
        <div className="card-label" style={{ marginBottom: 12 }}>Town</div>
        <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 16, lineHeight: 1.5 }}>
          Controls which local listings you see and which town your posts appear in.
        </p>
        <div className="input-group" style={{ marginBottom: 20 }}>
          <label className="input-label">Your town</label>
          <select className="field" value={town} onChange={(e) => setTown(e.target.value)} style={{ width: "100%" }}>
            <option value="" disabled>Select your town</option>
            <option value="arusha">Arusha</option>
            <option value="moshi">Moshi</option>
            <option value="karatu">Karatu</option>
            <option value="same">Same</option>
            <option value="mwanga">Mwanga</option>
          </select>
        </div>

        <div className="card-label" style={{ marginBottom: 12 }}>Mesh hardware (optional)</div>
        <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 16, lineHeight: 1.5 }}>
          Your account already works — this is only for relinking to a physical mesh device you own. Leave blank to keep using your account as-is.
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
          {loading ? "Saving…" : "Save profile"}
        </button>
      </form>
    </>
  );
}
