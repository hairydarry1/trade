import React, { useState, useMemo } from "react";

export default function PositionSizeCalculator() {
  const [accountSize, setAccountSize] = useState(10000);
  const [riskPercent, setRiskPercent] = useState(1);
  const [entryPrice, setEntryPrice] = useState("");
  const [stopLoss, setStopLoss] = useState("");
  const [takeProfit, setTakeProfit] = useState("");
  const [pair, setPair] = useState("frxEURUSD");

  const pairPipValues = {
    "frxEURUSD": 0.0001,
    "frxGBPUSD": 0.0001,
    "frxUSDJPY": 0.01,
    "frxUSDCHF": 0.0001,
    "frxAUDUSD": 0.0001,
    "frxUSDCAD": 0.0001,
    "frxNZDUSD": 0.0001,
  };

  const pipValue = pairPipValues[pair] || 0.0001;

  const calculation = useMemo(() => {
    if (!entryPrice || !stopLoss || !accountSize || !riskPercent) {
      return null;
    }
    
    const entry = parseFloat(entryPrice);
    const sl = parseFloat(stopLoss);
    const tp = takeProfit ? parseFloat(takeProfit) : null;
    
    if (isNaN(entry) || isNaN(sl) || isNaN(accountSize) || isNaN(riskPercent)) {
      return null;
    }

    const riskAmount = accountSize * (riskPercent / 100);
    const priceDiff = Math.abs(entry - sl);
    
    if (priceDiff === 0) return null;
    
    const pips = priceDiff / pipValue;
    const lotSize = riskAmount / (pips * 10);
    const standardLots = lotSize;
    const miniLots = lotSize * 10;
    const microLots = lotSize * 100;
    
    let potentialProfit = 0;
    let riskReward = "0";
    
    if (tp && !isNaN(tp)) {
      const tpDiff = Math.abs(tp - entry);
      const tpPips = tpDiff / pipValue;
      const tpProfit = (tpPips * 10 * lotSize);
      potentialProfit = tpProfit;
      riskReward = pips > 0 ? (tpProfit / riskAmount).toFixed(2) : "0";
    } else {
      const isLong = sl < entry;
      const rrByDirection = isLong ? (entry - sl) : (sl - entry);
      potentialProfit = (rrByDirection / pipValue) * 10 * lotSize;
      riskReward = pips > 0 ? (potentialProfit / riskAmount).toFixed(2) : "0";
    }

    return {
      lotSize: lotSize.toFixed(2),
      standardLots: standardLots.toFixed(2),
      miniLots: miniLots.toFixed(1),
      microLots: microLots.toFixed(0),
      riskAmount: riskAmount.toFixed(2),
      pips: pips.toFixed(1),
      potentialProfit: potentialProfit.toFixed(2),
      riskReward,
    };
  }, [accountSize, riskPercent, entryPrice, stopLoss, takeProfit, pipValue]);

  const presets = [0.5, 1, 2, 3];

  const handleAccountChange = (value) => {
    const num = parseFloat(value);
    if (!isNaN(num) && num > 0) {
      setAccountSize(num);
    } else if (value === "") {
      setAccountSize(0);
    }
  };

  return (
    <div className="card">
      <div className="card-title"><div className="dot" style={{ background: "var(--amber)" }} />Position Size Calculator</div>
      
      <div style={{ display: "grid", gap: 10 }}>
        <div>
          <label style={{ fontSize: 10, color: "var(--muted2)", display: "block", marginBottom: 4 }}>Account Size ($)</label>
          <input
            type="number"
            value={accountSize}
            onChange={(e) => handleAccountChange(e.target.value)}
            style={{ width: "100%", padding: "8px", fontSize: 12, background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 4, color: "var(--text)" }}
          />
        </div>

        <div>
          <label style={{ fontSize: 10, color: "var(--muted2)", display: "block", marginBottom: 4 }}>Risk (%)</label>
          <div style={{ display: "flex", gap: 4 }}>
            {presets.map(p => (
              <button
                key={p}
                onClick={() => setRiskPercent(p)}
                style={{
                  flex: 1,
                  padding: "6px",
                  fontSize: 11,
                  background: riskPercent === p ? "var(--amber)" : "var(--bg)",
                  border: "1px solid var(--border)",
                  borderRadius: 4,
                  color: riskPercent === p ? "#000" : "var(--muted2)",
                  cursor: "pointer",
                }}
              >
                {p}%
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <div>
            <label style={{ fontSize: 10, color: "var(--muted2)", display: "block", marginBottom: 4 }}>Entry Price</label>
            <input
              type="number"
              step="0.00001"
              value={entryPrice}
              onChange={(e) => setEntryPrice(e.target.value)}
              placeholder="1.08500"
              style={{ width: "100%", padding: "8px", fontSize: 12, background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 4, color: "var(--text)" }}
            />
          </div>
          <div>
            <label style={{ fontSize: 10, color: "var(--muted2)", display: "block", marginBottom: 4 }}>Stop Loss</label>
            <input
              type="number"
              step="0.00001"
              value={stopLoss}
              onChange={(e) => setStopLoss(e.target.value)}
              placeholder="1.08300"
              style={{ width: "100%", padding: "8px", fontSize: 12, background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 4, color: "var(--text)" }}
            />
          </div>
        </div>

        <div>
          <label style={{ fontSize: 10, color: "var(--muted2)", display: "block", marginBottom: 4 }}>Take Profit (optional)</label>
          <input
            type="number"
            step="0.00001"
            value={takeProfit}
            onChange={(e) => setTakeProfit(e.target.value)}
            placeholder="1.09000"
            style={{ width: "100%", padding: "8px", fontSize: 12, background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 4, color: "var(--text)" }}
          />
        </div>

        <div>
          <label style={{ fontSize: 10, color: "var(--muted2)", display: "block", marginBottom: 4 }}>Pair</label>
          <select
            value={pair}
            onChange={(e) => setPair(e.target.value)}
            style={{ width: "100%", padding: "8px", fontSize: 12, background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 4, color: "var(--text)" }}
          >
            {Object.keys(pairPipValues).map(p => (
              <option key={p} value={p}>{p.replace('frx', '')}</option>
            ))}
          </select>
        </div>

        {calculation && (
          <div style={{ marginTop: 8, padding: 12, background: "var(--bg3)", borderRadius: 6, border: "1px solid var(--border)" }}>
            <div style={{ fontSize: 11, color: "var(--amber)", marginBottom: 8, fontWeight: 600 }}>RESULTS</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "var(--green)" }}>{calculation.lotSize}</div>
                <div style={{ fontSize: 10, color: "var(--muted2)" }}>Standard Lots</div>
              </div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text)" }}>${calculation.riskAmount}</div>
                <div style={{ fontSize: 10, color: "var(--muted2)" }}>Risk Amount</div>
              </div>
              <div>
                <div style={{ fontSize: 14, color: "var(--text)" }}>{calculation.pips} pips</div>
                <div style={{ fontSize: 10, color: "var(--muted2)" }}>Stop Loss</div>
              </div>
              <div>
                <div style={{ fontSize: 14, color: "var(--cyan)" }}>1:{calculation.riskReward}</div>
                <div style={{ fontSize: 10, color: "var(--muted2)" }}>Risk:Reward</div>
              </div>
            </div>
            <div style={{ marginTop: 8, fontSize: 10, color: "var(--muted2)" }}>
              = {calculation.miniLots} mini lots ({calculation.microLots} micro lots)
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
