import React, { useEffect, useState, useCallback } from "react";
import { api } from "../api/client.js";

export default function RiskPanel() {
  const [risk, setRisk] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updating, setUpdating] = useState(false);

  const fetchRisk = useCallback(async () => {
    try {
      const data = await api.getRisk();
      setRisk(data);
      setError(null);
    } catch (err) {
      console.error("Failed to load risk data:", err);
      setError("Failed to load risk data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRisk();
  }, [fetchRisk]);

  const handleReset = async () => {
    setUpdating(true);
    try {
      await api.resetRisk();
      await fetchRisk();
    } catch (err) {
      console.error("Failed to reset risk:", err);
      setError("Failed to reset risk");
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="card">
        <div className="card-title"><div className="dot" style={{ background: "var(--red)" }} />Risk Management</div>
        <div className="no-data">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <div className="card-title"><div className="dot" style={{ background: "var(--red)" }} />Risk Management</div>
        <div className="no-data" style={{ color: "var(--red)" }}>{error}</div>
        <button onClick={fetchRisk} style={{ marginTop: 8, padding: "6px 12px", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 4, color: "var(--muted2)", cursor: "pointer" }}>Retry</button>
      </div>
    );
  }

  if (!risk) {
    return (
      <div className="card">
        <div className="card-title"><div className="dot" style={{ background: "var(--red)" }} />Risk Management</div>
        <div className="no-data">No risk data available</div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-title"><div className="dot" style={{ background: "var(--red)" }} />Risk Management</div>
      <div className="analytics-grid">
        <div className="stat-box">
          <div className={`stat-value ${(risk.daily_pnl || 0) >= 0 ? "green" : "red"}`}>
            {risk.daily_pnl != null ? (risk.daily_pnl >= 0 ? `+${risk.daily_pnl.toFixed(2)}` : risk.daily_pnl.toFixed(2)) : "—"}
          </div>
          <div className="stat-label">Daily P&L</div>
        </div>
        <div className="stat-box">
          <div className="stat-value">{risk.max_daily_loss?.toFixed(2) || "—"}</div>
          <div className="stat-label">Max DD</div>
        </div>
        <div className="stat-box">
          <div className="stat-value">{risk.trades_today || 0}</div>
          <div className="stat-label">Trades Today</div>
        </div>
        <div className="stat-box">
          <div className="stat-value">{risk.max_trades_per_day || "—"}</div>
          <div className="stat-label">Max Daily</div>
        </div>
      </div>
      {(risk.daily_pnl < 0 || risk.trades_today >= (risk.max_trades_per_day || 3)) && (
        <div style={{ marginTop: 8, padding: "8px", background: "rgba(255,45,85,0.15)", borderRadius: 4, fontSize: 11, color: "var(--red)" }}>
          {risk.daily_pnl < 0 && "Daily loss limit reached. "}
          {risk.trades_today >= (risk.max_trades_per_day || 3) && "Max trades reached."}
        </div>
      )}
      <button 
        onClick={handleReset} 
        disabled={updating}
        style={{ marginTop: 10, width: "100%", padding: "8px", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--muted2)", fontSize: 11, cursor: "pointer", opacity: updating ? 0.5 : 1 }}
      >
        {updating ? "Resetting..." : "Reset Daily Limits"}
      </button>
    </div>
  );
}
