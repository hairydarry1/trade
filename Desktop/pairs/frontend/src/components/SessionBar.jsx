import React from "react";

export default function SessionBar({ session }) {
  if (!session) {
    return <div className="session-bar"><span className="session-tag closed">Loading...</span></div>;
  }

  const sessions = session.active || [];

  return (
    <div className="session-bar">
      {sessions.length > 0 ? (
        sessions.map(s => (
          <span key={s.key} className="session-tag active">{s.name}</span>
        ))
      ) : (
        <span className="session-tag closed">Closed</span>
      )}
      {session.isHighLiquidity && (
        <span className="session-tag active" style={{ background: "rgba(0,217,139,0.12)", color: "var(--green)", borderColor: "rgba(0,217,139,0.25)" }}>
          High Liquidity
        </span>
      )}
    </div>
  );
}
