import React from "react";

export default function PairSelector({ pairs, selected, onChange }) {
  return (
    <div className="pair-selector">
      <select value={selected} onChange={e => onChange(e.target.value)}>
        {pairs.map(p => (
          <option key={p.symbol} value={p.symbol}>{p.display || p.symbol}</option>
        ))}
      </select>
    </div>
  );
}
