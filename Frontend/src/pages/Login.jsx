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

export default function Login({ onSwitchToRegister }) {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err.message || "Login failed");
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
          <div className="window-title">MeshBoard · Sign in</div>
          <div style={{ width: 64 }} />
        </div>

        <div className="auth-body">
          <div className="auth-card">
            <div className="logo-mark">MeshBoard</div>
            <div className="logo-sub" style={{ marginBottom: 20 }}>Mesh network dashboard</div>
            <h1 className="auth-title">Welcome back</h1>
            <p className="auth-sub">Sign in to view broadcasts, post messages, or manage the super-node.</p>

            {error && <div className="error-msg">{error}</div>}

            <form className="auth-form" onSubmit={handleSubmit}>
              <div className="input-group">
                <label className="input-label">Email</label>
                <input
                  className="field"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                />
              </div>
              <div className="input-group">
                <label className="input-label">Password</label>
                <input
                  className="field"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
              </div>
              <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: "100%", padding: "10px" }}>
                {loading ? "Signing in…" : "Sign in"}
              </button>
            </form>

            <div className="auth-footer">
              No account?{" "}
              <span className="auth-link" onClick={onSwitchToRegister}>
                Create one
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
