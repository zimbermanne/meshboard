import { useState } from "react";
import { sharedCss } from "../components/shared";
import { useAuth } from "../context/AuthContext";

const AUTH_CSS = `
  .auth-shell{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;background:var(--bg);}
  .auth-card{width:100%;max-width:400px;background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:32px;}
  .auth-title{font-size:20px;font-weight:600;margin-bottom:4px;}
  .auth-sub{font-size:12px;color:var(--muted);font-family:var(--mono);margin-bottom:24px;}
  .auth-form{display:flex;flex-direction:column;gap:16px;}
  .auth-form .field{width:100%;}
  .auth-footer{margin-top:20px;font-size:13px;color:var(--muted);text-align:center;}
  .auth-link{color:var(--accent);cursor:pointer;font-weight:500;}
  .auth-link:hover{text-decoration:underline;}
`;

export default function Register({ onSwitchToLogin }) {
  const { register } = useAuth();
  const [form, setForm] = useState({ name: "", phone: "", email: "", password: "", confirm: "", node_id: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirm) {
      setError("Passwords do not match");
      return;
    }
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    try {
      await register({
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        password: form.password,
        ...(form.node_id.trim() ? { node_id: form.node_id.trim().toUpperCase() } : {}),
      });
    } catch (err) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <style>{sharedCss}{AUTH_CSS}</style>
      <div className="auth-shell">
        <div className="auth-card">
          <div className="logo-mark" style={{ fontFamily: "var(--mono)", color: "var(--accent)", fontSize: 18, fontWeight: 600 }}>
            MeshBoard
          </div>
          <div className="auth-sub">Super-Node Dashboard</div>
          <h1 className="auth-title">Create account</h1>
          <p className="auth-sub" style={{ marginBottom: 16 }}>Create a member account to view posts and redeem tokens</p>

          {error && <div className="error-msg">{error}</div>}

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="input-group">
              <label className="input-label">Full name</label>
              <input className="field" type="text" value={form.name} onChange={update("name")} placeholder="Jane Doe" required />
            </div>
            <div className="input-group">
              <label className="input-label">Phone number</label>
              <input className="field" type="tel" value={form.phone} onChange={update("phone")} placeholder="+255 7XX XXX XXX" required />
            </div>
            <div className="input-group">
              <label className="input-label">Email</label>
              <input className="field" type="email" value={form.email} onChange={update("email")} placeholder="you@example.com" required autoComplete="email" />
            </div>
            <div className="input-group">
              <label className="input-label">Password</label>
              <input className="field" type="password" value={form.password} onChange={update("password")} placeholder="At least 6 characters" required autoComplete="new-password" />
            </div>
            <div className="input-group">
              <label className="input-label">Confirm password</label>
              <input className="field" type="password" value={form.confirm} onChange={update("confirm")} placeholder="Repeat password" required autoComplete="new-password" />
            </div>
            <div className="input-group">
              <label className="input-label">Node ID (optional)</label>
              <input className="field" type="text" value={form.node_id} onChange={update("node_id")} placeholder="NODE-XXXX-XXXX" />
            </div>
            <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: "100%", padding: "10px" }}>
              {loading ? "Creating account…" : "Create account"}
            </button>
          </form>

          <div className="auth-footer">
            Already have an account?{" "}
            <span className="auth-link" onClick={onSwitchToLogin}>
              Sign in
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
