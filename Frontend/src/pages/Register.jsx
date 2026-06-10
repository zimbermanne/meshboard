import { useState } from "react";
import { sharedCss } from "../components/shared";
import { useAuth } from "../context/AuthContext";

const AUTH_CSS = `
  .auth-root{min-height:100vh;display:flex;flex-direction:column;background:var(--bg);}
  .auth-body{flex:1;display:flex;align-items:center;justify-content:center;padding:32px 24px;}
  .auth-card{width:100%;max-width:420px;background:var(--bg);border:1px solid var(--border-strong);border-radius:12px;padding:28px;box-shadow:0 1px 3px rgba(0,0,0,.04);}
  .auth-title{font-size:20px;font-weight:600;color:var(--text);margin-bottom:4px;}
  .auth-sub{font-size:13px;color:var(--muted);margin-bottom:24px;line-height:1.5;}
  .auth-form{display:flex;flex-direction:column;gap:16px;}
  .auth-form .field{width:100%;}
  .auth-footer{margin-top:24px;font-size:13px;color:var(--muted);text-align:center;}
  .auth-link{color:var(--text);cursor:pointer;font-weight:500;text-decoration:underline;text-underline-offset:2px;}
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
      <div className="auth-root">
        <div className="window-bar">
          <div className="window-dots">
            <div className="window-dot red" />
            <div className="window-dot yellow" />
            <div className="window-dot green" />
          </div>
          <div className="window-title">MeshBoard · Create account</div>
          <div style={{ width: 64 }} />
        </div>

        <div className="auth-body">
          <div className="auth-card">
            <div className="logo-mark">MeshBoard</div>
            <div className="logo-sub" style={{ marginBottom: 20 }}>Member registration</div>
            <h1 className="auth-title">Create account</h1>
            <p className="auth-sub">Join the mesh to view posts, submit broadcasts, and redeem credit tokens.</p>

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
      </div>
    </>
  );
}
