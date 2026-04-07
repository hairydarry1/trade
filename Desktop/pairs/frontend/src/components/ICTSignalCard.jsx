import React, { useState } from "react";

export default function ICTSignalCard({ signal, onExecute, executionMode, compact = false, showDetails = false }) {
  const [showTargets, setShowTargets] = useState(false);
  
  if (!signal) return null;

  const isBuy = signal.direction === "BUY";
  
  const targets = signal.targets || [];
  const confirmations = signal.confirmations || {};

  return (
    <div className={`ict-signal-card ${isBuy ? "buy" : "sell"}`}>
      <div className="signal-header">
        <span className={`direction ${isBuy ? "buy" : "sell"}`}>
          {signal.direction}
        </span>
        <span className="pair">{signal.pair}</span>
        <span className="timezone">{signal.timezone}</span>
      </div>
      
      {!compact && (
        <div className="signal-levels">
          <div className="level">
            <span className="label">Entry</span>
            <span className="value">{signal.entry_price?.toFixed(5)}</span>
          </div>
          <div className="level">
            <span className="label">SL</span>
            <span className="value red">{signal.stop_loss?.toFixed(5)}</span>
          </div>
          <div className="level">
            <span className="label">TP</span>
            <span className="value green">{signal.take_profit?.toFixed(5)}</span>
          </div>
          <div className="level">
            <span className="label">R:R</span>
            <span className="value amber">{signal.risk_reward?.toFixed(1)}</span>
          </div>
        </div>
      )}
      
      {showDetails && confirmations.byStage && (
        <div className="confirmation-stages">
          <div className="stage">
            <span className="stage-num">S1</span>
            <span className={`stage-status ${confirmations.byStage.stage2 > 0 ? "pass" : "fail"}`}>
              Sweep
            </span>
          </div>
          <div className="stage">
            <span className="stage-num">S2</span>
            <span className={`stage-status ${confirmations.byStage.stage2 > 0 ? "pass" : "fail"}`}>
              {confirmations.byStage.stage2}/1
            </span>
          </div>
          <div className="stage">
            <span className="stage-num">S3</span>
            <span className={`stage-status ${confirmations.byStage.stage3 > 0 ? "pass" : "fail"}`}>
              {confirmations.byStage.stage3}/1
            </span>
          </div>
          <div className="stage">
            <span className="stage-num">S4</span>
            <span className={`stage-status ${confirmations.byStage.stage4 > 0 ? "pass" : "fail"}`}>
              {confirmations.byStage.stage4}/1
            </span>
          </div>
        </div>
      )}
      
      {targets.length > 0 && (
        <div className="targets-section">
          <button className="targets-toggle" onClick={() => setShowTargets(!showTargets)}>
            Targets {showTargets ? "▲" : "▼"}
          </button>
          {showTargets && (
            <div className="targets-list">
              {targets.map((tp, i) => (
                <div key={i} className="target">
                  <span className="tp-name">{tp.name}</span>
                  <span className="tp-price">{tp.price?.toFixed(5)}</span>
                  <span className="tp-rr">{tp.rr?.toFixed(1)}R</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      
      {!compact && onExecute && (
        <button 
          className={`execute-btn ${executionMode === "auto" ? "auto" : "manual"}`}
          onClick={onExecute}
        >
          {executionMode === "auto" ? "Auto Execute" : "Execute (Manual)"}
        </button>
      )}
    </div>
  );
}
