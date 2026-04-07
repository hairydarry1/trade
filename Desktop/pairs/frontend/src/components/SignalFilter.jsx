import React, { useState, useMemo } from "react";

export default function SignalFilter({ signals, children }) {
  const [filterPair, setFilterPair] = useState("");
  const [filterDirection, setFilterDirection] = useState("");

  const uniquePairs = useMemo(() => {
    const pairs = new Set(signals?.map(s => s.pair).filter(Boolean));
    return Array.from(pairs).sort();
  }, [signals]);

  const filteredSignals = useMemo(() => {
    if (!signals) return [];
    return signals.filter(s => {
      if (filterPair && s.pair !== filterPair) return false;
      if (filterDirection && s.direction !== filterDirection) return false;
      return true;
    });
  }, [signals, filterPair, filterDirection]);

  const child = React.Children.only(children);
  
  return (
    <>
      <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
        <select
          value={filterPair}
          onChange={(e) => setFilterPair(e.target.value)}
          style={{ flex: 1, padding: "4px 6px", fontSize: 10, background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 4, color: "var(--text)" }}
        >
          <option value="">All Pairs</option>
          {uniquePairs.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select
          value={filterDirection}
          onChange={(e) => setFilterDirection(e.target.value)}
          style={{ width: 70, padding: "4px 6px", fontSize: 10, background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 4, color: "var(--text)" }}
        >
          <option value="">All</option>
          <option value="BUY">BUY</option>
          <option value="SELL">SELL</option>
        </select>
      </div>
      {React.cloneElement(child, { signals: filteredSignals })}
    </>
  );
}
