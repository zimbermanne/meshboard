import { useState } from "react";
import { sharedCss } from "../components/shared";
import { useAuth } from "../context/AuthContext";
import { api, NODE_ID_RE } from "../api/client";

export default function SubmitPost() {
  const { user } = useAuth();
  const [form, setForm] = useState({
    message_text: "",
    package_days: "2",
    link: "",
    phone: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess(null);

    if (!user?.node_id) {
      setError("Link your node ID in Profile before posting.");
      return;
    }
    if (!NODE_ID_RE.test(user.node_id)) {
      setError("Your linked node ID is invalid. Update it in Profile.");
      return;
    }

    setLoading(true);
    try {
      const post = await api.submitPost({
        node_id: user.node_id,
        message_text: form.message_text.trim(),
        package_days: parseInt(form.package_days, 10),
        link: form.link.trim() || undefined,
        phone: form.phone.trim() || undefined,
      });
      setSuccess(post);
      setForm({ message_text: "", package_days: "2", link: "", phone: "" });
    } catch (err) {
      setError(err.message || "Failed to submit post");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <style>{sharedCss}</style>
      <div className="section-head">
        <span className="section-title">Submit a Post</span>
      </div>

      {!user?.node_id && (
        <div className="alert">Link your mesh node ID in Profile before you can post.</div>
      )}

      {user?.node_id && (
        <div style={{ fontSize: 12, color: "var(--muted)", fontFamily: "var(--mono)", marginBottom: 16 }}>
          Posting as <span style={{ color: "var(--accent)" }}>{user.node_id}</span>
        </div>
      )}

      {error && <div className="error-msg">{error}</div>}

      {success && (
        <div className="card" style={{ marginBottom: 20, borderColor: "rgba(5,150,105,.25)" }}>
          <div className="card-label">Submitted</div>
          <div style={{ fontSize: 13, marginTop: 8 }}>
            Post <span className="mono">{success.id}</span> is pending admin approval.
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="card" style={{ maxWidth: 560 }}>
        <div className="input-group" style={{ marginBottom: 16 }}>
          <label className="input-label">Message (max 280)</label>
          <textarea
            className="field"
            rows={4}
            maxLength={280}
            value={form.message_text}
            onChange={(e) => setForm((f) => ({ ...f, message_text: e.target.value }))}
            placeholder="Your broadcast message…"
            required
            style={{ width: "100%", resize: "vertical", fontFamily: "var(--sans)" }}
          />
        </div>
        <div className="input-row" style={{ marginBottom: 16 }}>
          <div className="input-group">
            <label className="input-label">Package (days)</label>
            <select
              className="field"
              value={form.package_days}
              onChange={(e) => setForm((f) => ({ ...f, package_days: e.target.value }))}
            >
              {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                <option key={d} value={d}>{d} day{d > 1 ? "s" : ""}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="input-group" style={{ marginBottom: 16 }}>
          <label className="input-label">Link (optional)</label>
          <input
            className="field"
            type="url"
            value={form.link}
            onChange={(e) => setForm((f) => ({ ...f, link: e.target.value }))}
            placeholder="https://…"
            style={{ width: "100%" }}
          />
        </div>
        <div className="input-group" style={{ marginBottom: 20 }}>
          <label className="input-label">Phone (optional)</label>
          <input
            className="field"
            type="tel"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            placeholder="+255…"
            style={{ width: "100%" }}
          />
        </div>
        <button className="btn btn-primary" type="submit" disabled={loading || !user?.node_id}>
          {loading ? "Submitting…" : "Submit for approval"}
        </button>
      </form>
    </>
  );
}
