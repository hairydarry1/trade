import React from "react";
import { api } from "../api/client.js";

export default function ICTPositionManager({ positions, onClose, accountType }) {
  const handleClose = async (positionId) => {
    try {
      await api.closeICTPosition(positionId, "manual");
      onClose();
    } catch (err) {
      console.error("Failed to close position:", err);
    }
  };

  if (!positions || positions.length === 0) {
    return null;
  }

  return (
    <div className="ict-positions">
      <div className="section-title">Open Positions ({accountType})</div>
      {positions.map((pos, i) => (
        <div key={pos.id || i} className={`position-card ${pos.direction === "BUY" ? "buy" : "sell"}`}>
          <div className="position-header">
            <span className={`direction ${pos.direction === "BUY" ? "buy" : "sell"}`}>
              {pos.direction}
            </span>
            <span className="pair">{pos.pair}</span>
            <span className="lot">Lot: {pos.lot_size}</span>
          </div>
          <div className="position-levels">
            <div className="level">
              <span className="label">Entry</span>
              <span className="value">{pos.entry_price?.toFixed(5)}</span>
            </div>
            <div className="level">
              <span className="label">SL</span>
              <span className="value red">{pos.stop_loss?.toFixed(5)}</span>
            </div>
            <div className="level">
              <span className="label">TP</span>
              <span className="value green">{pos.take_profit?.toFixed(5)}</span>
            </div>
          </div>
          <button className="close-btn" onClick={() => handleClose(pos.id)}>
            Close Position
          </button>
        </div>
      ))}
    </div>
  );
}
