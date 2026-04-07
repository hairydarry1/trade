import React, { useEffect, useState } from "react";
import { api } from "../api/client.js";

function fmt(num) {
  if (num == null || isNaN(num)) return "—";
  return num >= 0 ? `+${num.toFixed(2)}` : num.toFixed(2);
}

function pct(num) {
  if (num == null || isNaN(num)) return "—";
  return `${num.toFixed(1)}%`;
}

function getDate(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split("T")[0];
}

export default function BacktestPanel() {
  const [runs, setRuns] = useState([]);
  const [selectedRun, setSelectedRun] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [config, setConfig] = useState({
    pairs: ["frxEURUSD", "frxGBPUSD", "frxUSDJPY", "frxAUDUSD", "frxUSDCAD"],
    timeframes: ["1H", "4H", "D"],
    startDate: getDate(90),
    endDate: getDate(0),
  });

  useEffect(() => {
    loadRuns();
  }, []);

  const loadRuns = async () => {
    try {
      const data = await api.getBacktestRuns();
      setRuns(data || []);
      if (data.length > 0 && !selectedRun) {
        selectRun(data[0].id);
      }
    } catch (e) {
      console.error("Failed to load runs:", e);
    }
  };

  const selectRun = async (id) => {
    try {
      const { stats: s } = await api.getBacktestStats(id);
      setSelectedRun(id);
      setStats(s);
    } catch (e) {
      console.error("Failed to load stats:", e);
    }
  };

  const startBacktest = async () => {
    setRunning(true);
    setLoading(true);
    try {
      const result = await api.runBacktest(config);
      await loadRuns();
      selectRun(result.runId);
      setRunning(false);
    } catch (e) {
      console.error("Backtest failed:", e);
      setRunning(false);
    }
    setLoading(false);
  };

  const exportCSV = async () => {
    if (!selectedRun) return;
    try {
      const csv = await api.exportBacktestCSV(selectedRun);
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `backtest_${selectedRun}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Export failed:", e);
    }
  };

  return (
    <div className="card">
      <div className="card-title">
        <div className="dot" style={{ background: "var(--amber)" }} />
        Backtest
      </div>

      <div style={{ marginBottom: 16, padding: 12, background: "var(--bg)", borderRadius: 4 }}>
        <div style={{ fontSize: 11, color: "var(--muted2)", marginBottom: 8 }}>Configuration</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 10, color: "var(--muted2)" }}>Start Date</label>
            <input
              type="date"
              value={config.startDate}
              onChange={(e) => setConfig({ ...config, startDate: e.target.value })}
              style={{ width: "100%", padding: "6px", background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 4, color: "var(--text)", fontSize: 11 }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 10, color: "var(--muted2)" }}>End Date</label>
            <input
              type="date"
              value={config.endDate}
              onChange={(e) => setConfig({ ...config, endDate: e.target.value })}
              style={{ width: "100%", padding: "6px", background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 4, color: "var(--text)", fontSize: 11 }}
            />
          </div>
        </div>
        <button
          onClick={startBacktest}
          disabled={running || loading}
          style={{ width: "100%", padding: "8px", background: running ? "var(--muted2)" : "var(--amber)", border: "none", borderRadius: 4, color: "#000", fontSize: 12, fontWeight: 600, cursor: running ? "not-allowed" : "pointer" }}
        >
          {running ? "Running..." : "Run Backtest"}
        </button>
      </div>

      {runs.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: "var(--muted2)", marginBottom: 8 }}>Previous Runs</div>
          <select
            value={selectedRun}
            onChange={(e) => selectRun(parseInt(e.target.value))}
            style={{ width: "100%", padding: "6px", background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 4, color: "var(--text)", fontSize: 11 }}
          >
            {runs.map((r) => (
              <option key={r.id} value={r.id}>
                {r.start_date} - {r.end_date} | {r.total_signals} signals | {r.status}
              </option>
            ))}
          </select>
        </div>
      )}

      {stats && (
        <>
          <div className="analytics-grid" style={{ marginBottom: 16 }}>
            <div className="stat-box">
              <div className={`stat-value ${stats.totalR >= 0 ? "green" : "red"}`}>
                {fmt(stats.totalR)}R
              </div>
              <div className="stat-label">Total PnL</div>
            </div>
            <div className="stat-box">
              <div className="stat-value">{pct(stats.winRate)}</div>
              <div className="stat-label">Win Rate</div>
            </div>
            <div className="stat-box">
              <div className="stat-value">{stats.total || 0}</div>
              <div className="stat-label">Signals</div>
            </div>
            <div className="stat-box">
              <div className="stat-value red">{fmt(-stats.maxDrawdown)}R</div>
              <div className="stat-label">Max DD</div>
            </div>
          </div>

          {stats.pairStats && Object.keys(stats.pairStats).length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: "var(--muted2)", marginBottom: 8 }}>By Pair</div>
              <table style={{ width: "100%", fontSize: 10, borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ color: "var(--muted2)" }}>
                    <th style={{ textAlign: "left", padding: 4 }}>Pair</th>
                    <th style={{ textAlign: "right", padding: 4 }}>Trades</th>
                    <th style={{ textAlign: "right", padding: 4 }}>Win Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(stats.pairStats).map(([pair, s]) => (
                    <tr key={pair}>
                      <td style={{ padding: 4 }}>{pair}</td>
                      <td style={{ textAlign: "right", padding: 4 }}>{s.total}</td>
                      <td style={{ textAlign: "right", padding: 4, color: s.winRate >= 50 ? "var(--green)" : "var(--red)" }}>
                        {pct(s.winRate)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {stats.tfStats && Object.keys(stats.tfStats).length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: "var(--muted2)", marginBottom: 8 }}>By Timeframe</div>
              <table style={{ width: "100%", fontSize: 10, borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ color: "var(--muted2)" }}>
                    <th style={{ textAlign: "left", padding: 4 }}>TF</th>
                    <th style={{ textAlign: "right", padding: 4 }}>Trades</th>
                    <th style={{ textAlign: "right", padding: 4 }}>Win Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(stats.tfStats).map(([tf, s]) => (
                    <tr key={tf}>
                      <td style={{ padding: 4 }}>{tf}</td>
                      <td style={{ textAlign: "right", padding: 4 }}>{s.total}</td>
                      <td style={{ textAlign: "right", padding: 4, color: s.winRate >= 50 ? "var(--green)" : "var(--red)" }}>
                        {pct(s.winRate)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <button
            onClick={exportCSV}
            style={{ width: "100%", padding: "8px", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 4, color: "var(--text)", fontSize: 11, cursor: "pointer" }}
          >
            Export CSV
          </button>
        </>
      )}

      {!stats && !loading && (
        <div className="no-data">Run a backtest to see results</div>
      )}
    </div>
  );
}