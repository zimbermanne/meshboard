import { useState } from "react";
import { sharedCss } from "../components/shared";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";

export default function RedeemToken() {
  const { user } = useAuth();
  const [tokenId, setTokenId] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setResult(null);

    if (!user?.node_id) {
      setError("Link your node ID in Profile before redeeming a token.");
      return;
    }

    setLoading(true);
    try {
      const data = await api.redeemToken({
        token_id: tokenId.trim().toUpperCase(),
        node_id: user.node_id,
      });
      setResult(data);
      setTokenId("");
    } catch (err) {
      setError(err.message || "Redemption failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <style>{sharedCss}{`
        .token-result{font-family:var(--mono);font-size:18px;font-weight:600;color:var(--accent);padding:14px;background:var(--accent-soft);border:1px dashed rgba(5,150,105,.25);border-radius:8px;text-align:center;margin-top:12px;}
      `}</style>
      <div className="section-head">
        <span className="section-title">Redeem Credit Token</span>
      </div>

      {!user?.node_id && (
        <div className="alert">Link your mesh node ID in Profile before redeeming tokens.</div>
      )}

      <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 20, maxWidth: 480 }}>
        Enter the token ID you received from an operator (e.g. TXN-XXXX-XXXX-XXXX). Credits are added to your linked node.
      </p>

      {error && <div className="error-msg">{error}</div>}

      {result && (
        <div className="card" style={{ marginBottom: 20, borderColor: "rgba(5,150,105,.25)" }}>
          <div className="card-label">Redeemed</div>
          <div className="token-result">${parseFloat(result.amount_credited).toFixed(2)} credited</div>
          <div style={{ fontSize: 12, color: "var(--muted)", fontFamily: "var(--mono)", marginTop: 8, textAlign: "center" }}>
            New balance: ${parseFloat(result.new_balance).toFixed(2)}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="card" style={{ maxWidth: 480 }}>
        {user?.node_id && (
          <div style={{ fontSize: 12, color: "var(--muted)", fontFamily: "var(--mono)", marginBottom: 16 }}>
            Node: <span style={{ color: "var(--accent)" }}>{user.node_id}</span>
          </div>
        )}
        <div className="input-group" style={{ marginBottom: 20 }}>
          <label className="input-label">Token ID</label>
          <input
            className="field"
            value={tokenId}
            onChange={(e) => setTokenId(e.target.value)}
            placeholder="TXN-XXXX-XXXX-XXXX"
            required
            style={{ width: "100%", letterSpacing: 1 }}
          />
        </div>
        <button className="btn btn-primary" type="submit" disabled={loading || !user?.node_id}>
          {loading ? "Redeeming…" : "Redeem token"}
        </button>
      </form>
    </>
  );
}
