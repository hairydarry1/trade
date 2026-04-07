import React from "react";

const CHECKS = [
  { key: "BOS", label: "Break of Structure" },
  { key: "FVG", label: "Fair Value Gap" },
  { key: "SMT", label: "SMT Divergence" },
  { key: "FIB_79", label: "79% Fib" },
  { key: "CANDLE", label: "Candle Pattern" },
];

export default function ConfirmationChecklist({ signal }) {
  if (!signal) return null;

  let summary = {};
  try {
    if (signal.confirmation_summary) {
      summary = typeof signal.confirmation_summary === "string"
        ? JSON.parse(signal.confirmation_summary)
        : signal.confirmation_summary;
    } else if (signal.confirmations) {
      const list = typeof signal.confirmations === "string"
        ? JSON.parse(signal.confirmations || "[]")
        : signal.confirmations;
      for (const c of list) {
        if (c.type) summary[c.type] = "PASS";
      }
    }
  } catch { summary = {}; }

  const passedCount = CHECKS.filter(c => summary[c.key] === "PASS").length;

  return (
    <div className="card">
      <div className="card-title"><div className="dot" style={{ background: "var(--purple)" }} />Confirmations</div>
      <div className="checklist">
        {CHECKS.map(c => (
          <div key={c.key} className={`check-item ${summary[c.key] === "PASS" ? "active" : ""}`}>
            <div className={`check-badge ${summary[c.key] === "PASS" ? "pass" : "fail"}`}>
              {summary[c.key] === "PASS" ? "✓" : "—"}
            </div>
            <span className="check-label">{c.label}</span>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 8, fontSize: 11, color: passedCount >= 3 ? "var(--green)" : "var(--red)", fontFamily: "var(--font-ui)" }}>
        {passedCount}/5 confirmations {passedCount >= 3 ? "✓ Signal valid" : "— Need 3 minimum"}
      </div>
    </div>
  );
}
