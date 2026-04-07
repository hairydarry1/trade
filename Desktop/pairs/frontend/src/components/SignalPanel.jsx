import React, { useState } from "react";

export default function SignalPanel({ signal, onLogTrade }) {
  const [lotSize, setLotSize] = useState(0.01);
  const [isLogging, setIsLogging] = useState(false);

  if (!signal) {
    return (
      <div className="card">
        <div className="card-title"><div className="dot" style={{ background: "var(--amber)" }} />Latest Signal</div>
        <div className="no-data">Scanning for liquidity sweeps...</div>
      </div>
    );
  }

  const handleLogTrade = async () => {
    setIsLogging(true);
    try {
      await onLogTrade({ ...signal, lot_size: lotSize });
    } finally {
      setIsLogging(false);
    }
  };

  return (
    <div className="card">
      <div className="card-title"><div className="dot" style={{ background: signal.direction === "BUY" ? "var(--green)" : "var(--red)" }} />Latest Signal</div>
      <div className={`signal-card ${signal.direction === "SELL" ? "sell" : ""}`}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span className={`signal-direction ${signal.direction === "BUY" ? "buy" : "sell"}`}>{signal.direction}</span>
          <span style={{ fontSize: 10, color: "var(--muted2)", fontFamily: "var(--font-ui)" }}>
            {signal.pair} · {signal.timeframe}
          </span>
        </div>
        <div className="signal-detail">
          <span>Entry <span style={{ color: "var(--text)" }}>{signal.entry_price?.toFixed(5)}</span></span>
          <span>Stop Loss <span style={{ color: "var(--red)" }}>{signal.stop_loss?.toFixed(5)}</span></span>
          <span>Take Profit <span style={{ color: "var(--green)" }}>{signal.take_profit?.toFixed(5)}</span></span>
          <span>Risk/Reward <span style={{ color: "var(--amber)" }}>1:{signal.risk_reward}</span></span>
          {signal.sweep_level && <span>Sweep Level <span>{signal.sweep_level?.toFixed(5)}</span></span>}
          {signal.fib_level && <span>79% Fib <span>{signal.fib_level?.toFixed(5)}</span></span>}
          {signal.session && <span>Session <span style={{ color: "var(--cyan)" }}>{signal.session}</span></span>}
        </div>
        <div style={{ marginTop: 8 }}>
          <span style={{ fontSize: 10, color: "var(--muted2)" }}>Lot Size:</span>
          <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
            {[0.01, 0.05, 0.1, 0.2, 0.5].map(preset => (
              <button
                key={preset}
                onClick={() => setLotSize(preset)}
                aria-label={`Set lot size to ${preset}`}
                aria-pressed={lotSize === preset}
                style={{
                  flex: 1,
                  padding: "4px 2px",
                  fontSize: 10,
                  background: lotSize === preset ? "var(--amber)" : "var(--bg)",
                  border: "1px solid var(--border)",
                  borderRadius: 3,
                  color: lotSize === preset ? "#000" : "var(--muted2)",
                  cursor: "pointer",
                }}
              >
                {preset}
              </button>
            ))}
          </div>
        </div>
        {onLogTrade && (
          <button 
            onClick={handleLogTrade} 
            disabled={isLogging}
            aria-label="Log this trade"
            style={{ marginTop: 10, width: "100%", padding: "8px", background: "var(--green)", border: "none", borderRadius: 6, color: "#000", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-ui)", opacity: isLogging ? 0.6 : 1 }}
          >
            {isLogging ? "Logging..." : "Log Trade"}
          </button>
        )}
      </div>
    </div>
  );
}
