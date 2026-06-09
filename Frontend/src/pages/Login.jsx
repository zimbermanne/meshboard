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
      <div className="auth-shell">
        <div className="auth-card">
          <div className="logo-mark" style={{ fontFamily: "var(--mono)", color: "var(--accent)", fontSize: 18, fontWeight: 600 }}>
            MeshBoard
          </div>
          <div className="auth-sub">Super-Node Dashboard</div>
          <h1 className="auth-title">Sign in</h1>
          <p className="auth-sub" style={{ marginBottom: 16 }}>View network messages and broadcasts</p>

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
    </>
  );
}
