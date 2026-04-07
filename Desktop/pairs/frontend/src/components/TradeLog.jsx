import React, { useEffect, useState, useCallback } from "react";
import { api } from "../api/client.js";
import ConfirmDialog from "./ConfirmDialog.jsx";

export default function TradeLog({ onUpdate }) {
  const [trades, setTrades] = useState([]);
  const [updating, setUpdating] = useState(null);
  const [error, setError] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({ open: false, trade: null, result: null });
  const [notes, setNotes] = useState({});

  const fetchTrades = useCallback(async () => {
    try {
      const data = await api.getTrades();
      setTrades(data || []);
      setError(null);
    } catch (err) {
      console.error("Failed to load trades:", err);
      setError("Failed to load trades");
    }
  }, []);

  useEffect(() => {
    fetchTrades();
    const interval = setInterval(fetchTrades, 30000);
    return () => clearInterval(interval);
  }, [fetchTrades]);

  const handleNotesChange = (tradeId, value) => {
    setNotes(prev => ({ ...prev, [tradeId]: value }));
  };

  const handleSaveNotes = async (tradeId) => {
    try {
      await api.updateTradeNotes(tradeId, notes[tradeId]);
    } catch (err) {
      console.error("Failed to save notes:", err);
      setError("Failed to save notes");
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleResultClick = (trade, result) => {
    setConfirmDialog({ open: true, trade, result });
  };

  const handleResultConfirm = async () => {
    const { trade, result } = confirmDialog;
    setConfirmDialog({ open: false, trade: null, result: null });
    setUpdating(trade.id);
    setError(null);
    
    const exitPrice = result === "WIN" ? trade.take_profit : trade.stop_loss;
    const stake = trade.lot_size || 0.01;
    const riskReward = Math.abs(trade.take_profit - trade.entry_price) / Math.abs(trade.entry_price - trade.stop_loss);
    const payout = stake * (1 + riskReward);
    const pnl = result === "WIN" ? (payout - stake) : -stake;
    
    try {
      await api.updateTradeResult(trade.id, result, pnl, exitPrice);
      await fetchTrades();
      if (onUpdate) onUpdate();
    } catch (err) {
      console.error("Failed to update trade:", err);
      setError("Failed to update trade");
    } finally {
      setUpdating(null);
    }
  };

  const handleExport = () => {
    const headers = ["Pair", "Direction", "Entry", "SL", "TP", "Lot", "Result", "PnL", "Date", "Notes"];
    const rows = trades.map(t => [
      t.pair,
      t.direction,
      t.entry_price,
      t.stop_loss,
      t.take_profit,
      t.lot_size || 0.01,
      t.result || "OPEN",
      t.pnl || 0,
      t.created_at || "",
      t.notes || "",
    ]);
    const csv = [headers.join(","), ...rows.map(r => `"${r.join('","')}"`)].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `trades_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (error) {
    return (
      <div className="card">
        <div className="card-title"><div className="dot" style={{ background: "var(--amber)" }} />Trade Log</div>
        <div className="no-data" style={{ color: "var(--red)" }}>{error}</div>
        <button onClick={fetchTrades} style={{ marginTop: 8, padding: "6px 12px", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 4, color: "var(--muted2)", cursor: "pointer" }}>Retry</button>
      </div>
    );
  }

  if (!trades.length) {
    return (
      <div className="card">
        <div className="card-title"><div className="dot" style={{ background: "var(--amber)" }} />Trade Log</div>
        <div className="no-data">No trades logged yet. Execute a signal to start trading.</div>
      </div>
    );
  }

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div className="card-title"><div className="dot" style={{ background: "var(--amber)" }} />Trade Log</div>
        <div style={{ display: "flex", gap: 4 }}>
          <button onClick={fetchTrades} aria-label="Refresh trades" style={{ padding: "4px 8px", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 4, color: "var(--muted2)", cursor: "pointer", fontSize: 10 }}>Refresh</button>
          <button onClick={handleExport} aria-label="Export trades to CSV" style={{ padding: "4px 8px", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 4, color: "var(--muted2)", cursor: "pointer", fontSize: 10 }}>Export</button>
        </div>
      </div>
      {trades.map((t, i) => (
        <div key={t.id || i} className={`trade-log-item ${t.result?.toLowerCase() || ""}`}>
          <div className="trade-log-header">
            <span className="trade-log-pair">{t.pair} {t.direction}</span>
            {t.result && (
              <span className={`trade-log-pnl ${t.pnl >= 0 ? "pos" : "neg"}`}>
                {t.pnl >= 0 ? "+" : ""}{t.pnl?.toFixed(2)}
              </span>
            )}
          </div>
          <div className="trade-log-meta">
            Entry: {t.entry_price?.toFixed(5)} · SL: {t.stop_loss?.toFixed(5)} · TP: {t.take_profit?.toFixed(5)}
            {t.result && <span> · {t.result}</span>}
          </div>
          <div style={{ marginTop: 6 }}>
            <input
              type="text"
              placeholder="Add notes..."
              value={notes[t.id] ?? t.notes ?? ""}
              onChange={(e) => handleNotesChange(t.id, e.target.value)}
              onBlur={() => handleSaveNotes(t.id)}
              style={{ width: "100%", padding: "4px 6px", fontSize: 10, background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 3, color: "var(--text)" }}
            />
          </div>
          {!t.result && (
            <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
              <button 
                onClick={() => handleResultClick(t, "WIN")} 
                disabled={updating === t.id}
                aria-label="Mark as WIN"
                style={{ flex: 1, padding: "6px", background: "var(--green)", border: "none", borderRadius: 4, color: "#000", fontSize: 11, fontWeight: 600, cursor: "pointer", opacity: updating === t.id ? 0.5 : 1 }}
              >
                WIN
              </button>
              <button 
                onClick={() => handleResultClick(t, "LOSS")} 
                disabled={updating === t.id}
                aria-label="Mark as LOSS"
                style={{ flex: 1, padding: "6px", background: "var(--red)", border: "none", borderRadius: 4, color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer", opacity: updating === t.id ? 0.5 : 1 }}
              >
                LOSS
              </button>
            </div>
          )}
        </div>
      ))}
      <ConfirmDialog
        isOpen={confirmDialog.open}
        title={confirmDialog.result === "WIN" ? "Confirm WIN" : "Confirm LOSS"}
        message={`Mark this trade as ${confirmDialog.result}? This action cannot be undone.`}
        onConfirm={handleResultConfirm}
        onCancel={() => setConfirmDialog({ open: false, trade: null, result: null })}
        confirmLabel={confirmDialog.result === "WIN" ? "Yes, it's a WIN" : "Yes, it's a LOSS"}
      />
    </div>
  );
}
