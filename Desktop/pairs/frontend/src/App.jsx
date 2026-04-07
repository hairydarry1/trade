import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useWebSocket } from "./hooks/useWebSocket.js";
import { useSignalSound } from "./hooks/useSignalSound.js";
import { api } from "./api/client.js";
import { ErrorBoundary } from "./components/ErrorBoundary.jsx";
import PairSelector from "./components/PairSelector.jsx";
import CandleChart from "./components/CandleChart.jsx";
import SignalPanel from "./components/SignalPanel.jsx";
import ConfirmationChecklist from "./components/ConfirmationChecklist.jsx";
import TradeLog from "./components/TradeLog.jsx";
import Analytics from "./components/Analytics.jsx";
import SessionBar from "./components/SessionBar.jsx";
import Toast from "./components/Toast.jsx";
import RiskPanel from "./components/RiskPanel.jsx";
import LoadingSpinner from "./components/LoadingSpinner.jsx";
import PriceAlerts from "./components/PriceAlerts.jsx";
import ThemeToggle from "./components/ThemeToggle.jsx";
import PositionSizeCalculator from "./components/PositionSizeCalculator.jsx";
import CalendarHeatmap from "./components/CalendarHeatmap.jsx";
import TradeJournal from "./components/TradeJournal.jsx";
import MultiChartGrid from "./components/MultiChartGrid.jsx";
import AccountManager from "./components/AccountManager.jsx";
import ICTSignalPanel from "./components/ICTSignalPanel.jsx";
import BacktestPanel from "./components/BacktestPanel.jsx";

const TIMEFRAMES = ["1M", "5M", "15M", "1H", "4H", "D"];

export default function App() {
  const ws = useWebSocket();
  const { playSound } = useSignalSound(true);
  const [pairs, setPairs] = useState([]);
  const [selectedPair, setSelectedPair] = useState("frxEURUSD");
  const [selectedTF, setSelectedTF] = useState("1H");
  const [candles, setCandles] = useState([]);
  const [signals, setSignals] = useState([]);
  const [trades, setTrades] = useState([]);
  const [latestSignal, setLatestSignal] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [session, setSession] = useState(null);
  const [sidebarTab, setSidebarTab] = useState("signals");
  const [loading, setLoading] = useState({ pairs: true, candles: false, signals: true });
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const [scanLoading, setScanLoading] = useState(false);
  const [showMultiChart, setShowMultiChart] = useState(false);
  const abortControllerRef = useRef(null);

  useEffect(() => {
    api.getPairs()
      .then(p => { setPairs(p); setLoading(prev => ({ ...prev, pairs: false })); })
      .catch(err => { setError("Failed to load pairs"); setLoading(prev => ({ ...prev, pairs: false })); console.error("Failed to load pairs:", err); });
    api.getSignals()
      .then(s => { setSignals(s || []); setLoading(prev => ({ ...prev, signals: false })); })
      .catch(err => { console.error("Failed to load signals:", err); setLoading(prev => ({ ...prev, signals: false })); });
    api.getAnalytics()
      .then(setAnalytics)
      .catch(err => { console.error("Failed to load analytics:", err); });
    api.getTrades()
      .then(data => setTrades(data || []))
      .catch(err => { console.error("Failed to load trades:", err); });
    api.getSession()
      .then(setSession)
      .catch(err => { console.error("Failed to load session:", err); });
  }, []);

  useEffect(() => {
    if (!selectedPair || !selectedTF) return;
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setLoading(prev => ({ ...prev, candles: true }));
    api.getCandles(selectedPair, selectedTF)
      .then(d => {
        if (!controller.signal.aborted) {
          setCandles(d.candles || []);
          setLoading(prev => ({ ...prev, candles: false }));
        }
      })
      .catch(err => {
        if (!controller.signal.aborted) {
          setError("Failed to load candles");
          setLoading(prev => ({ ...prev, candles: false }));
          console.error("Failed to load candles:", err);
        }
      });
    return () => controller.abort();
  }, [selectedPair, selectedTF]);

  useEffect(() => {
    if (ws.newSignal) {
      setLatestSignal(ws.newSignal);
      setSignals(prev => {
        const exists = prev.some(s => s.id === ws.newSignal.id);
        if (exists) return prev;
        return [ws.newSignal, ...prev].slice(0, 50);
      });
      setToast({ type: ws.newSignal.direction === "BUY" ? "success" : "error", msg: `${ws.newSignal.direction} ${ws.newSignal.pair} @ ${ws.newSignal.entry_price?.toFixed(5)}` });
      playSound();
    }
  }, [ws.newSignal, playSound]);

  useEffect(() => {
    if (!ws.newSignal) return;
    const timer = setTimeout(() => setLatestSignal(null), 10000);
    return () => clearTimeout(timer);
  }, [ws.newSignal]);

  const recentSignals = useMemo(() => (signals || []).slice(0, 10), [signals]);

  const livePrice = ws.ticks[selectedPair];

  const handleScan = useCallback(async () => {
    setScanLoading(true);
    try {
      const result = await api.scanSignal(selectedPair, selectedTF);
      if (result.signal) {
        setLatestSignal(result.signal);
        setSignals(prev => [result.signal, ...prev]);
        setToast({ type: "info", msg: `Manual scan: ${result.signal.direction} ${result.signal.pair}` });
      } else {
        setToast({ type: "info", msg: "No signal found for this pair/timeframe" });
      }
    } catch (err) {
      console.error("Scan failed:", err);
      setToast({ type: "error", msg: "Scan failed" });
    }
    setScanLoading(false);
  }, [selectedPair, selectedTF]);

  const refreshAnalytics = useCallback(() => {
    api.getAnalytics().then(setAnalytics).catch(err => console.error("Failed to refresh analytics:", err));
  }, []);

  const handleLogTrade = useCallback(async (signal) => {
    try {
      await api.logTrade({
        signal_id: signal.id,
        pair: signal.pair,
        direction: signal.direction,
        entry_price: signal.entry_price,
        stop_loss: signal.stop_loss,
        take_profit: signal.take_profit,
        lot_size: signal.lot_size || 0.01,
      });
      setToast({ type: "success", msg: "Trade logged" });
      refreshAnalytics();
    } catch (err) {
      console.error("Failed to log trade:", err);
      setToast({ type: "error", msg: "Failed to log trade" });
    }
  }, [refreshAnalytics]);

  return (
    <ErrorBoundary>
      {toast && <Toast type={toast.type} msg={toast.msg} onClose={() => setToast(null)} />}
      {error && (
        <div style={{ background: "rgba(255,45,85,0.12)", borderBottom: "1px solid rgba(255,45,85,0.3)", padding: "8px 16px", fontSize: 12, color: "#ff6b80", textAlign: "center" }}>
          {error}
          <button onClick={() => setError(null)} style={{ marginLeft: 12, background: "none", border: "none", color: "#ff6b80", cursor: "pointer", textDecoration: "underline" }}>dismiss</button>
        </div>
      )}
      <div className="topbar">
        <div className="logo"><em>SWEEP</em>SIGNALS</div>
        {loading.pairs ? (
          <LoadingSpinner size={16} text="" />
        ) : (
          <PairSelector pairs={pairs} selected={selectedPair} onChange={setSelectedPair} />
        )}
        <div className="tf-tabs">
          {TIMEFRAMES.map(tf => (
            <button key={tf} className={`tf-tab ${selectedTF === tf ? "active" : ""}`} onClick={() => setSelectedTF(tf)} aria-label={`Select ${tf} timeframe`}>{tf}</button>
          ))}
        </div>
<button className="tf-tab" onClick={handleScan} disabled={scanLoading} aria-label="Scan for signals" style={{ borderColor: "var(--amber)", color: "var(--amber)", opacity: scanLoading ? 0.5 : 1 }}>
            {scanLoading ? "Scanning..." : "SCAN"}
          </button>
          <button 
            className="tf-tab" 
            onClick={() => setShowMultiChart(!showMultiChart)} 
            style={{ borderColor: showMultiChart ? "var(--blue)" : "var(--border)", color: showMultiChart ? "var(--blue)" : "var(--text)", opacity: showMultiChart ? 1 : 0.7 }}
            aria-label="Toggle multi-chart view"
          >
            GRID
          </button>
        <SessionBar session={session} />
        <div className="conn-status">
          <div className={`conn-dot ${ws.connected ? "on" : "off"}`} />
          {ws.connected ? "Live" : "Offline"}
        </div>
        <ThemeToggle />
      </div>

        <div className="main-layout">
        <div className="chart-area">
          {showMultiChart ? (
            <MultiChartGrid 
              pair={selectedPair} 
              livePrice={livePrice} 
              signal={latestSignal} 
              candleUpdate={ws.candleUpdate}
            />
          ) : loading.candles ? (
            <div className="chart-container">
              <LoadingSpinner text="Loading candles..." />
            </div>
          ) : candles.length === 0 ? (
            <div className="chart-container">
              <div className="no-data">No candle data available for {selectedPair} {selectedTF}</div>
            </div>
          ) : (
            <CandleChart
              candles={candles}
              pair={selectedPair}
              timeframe={selectedTF}
              livePrice={livePrice}
              signal={latestSignal}
              candleUpdate={ws.candleUpdate}
            />
          )}
        </div>
        <div className="sidebar">
          <div className="tab-bar">
            <button className={`tab-btn ${sidebarTab === "signals" ? "active" : ""}`} onClick={() => setSidebarTab("signals")} aria-label="View signals tab">Signals</button>
            <button className={`tab-btn ${sidebarTab === "ict" ? "active" : ""}`} onClick={() => setSidebarTab("ict")} aria-label="View ICT signals tab">ICT</button>
            <button className={`tab-btn ${sidebarTab === "trades" ? "active" : ""}`} onClick={() => setSidebarTab("trades")} aria-label="View trades tab">Trades</button>
            <button className={`tab-btn ${sidebarTab === "risk" ? "active" : ""}`} onClick={() => setSidebarTab("risk")} aria-label="View risk tab">Risk</button>
            <button className={`tab-btn ${sidebarTab === "alerts" ? "active" : ""}`} onClick={() => setSidebarTab("alerts")} aria-label="View alerts tab">Alerts</button>
            <button className={`tab-btn ${sidebarTab === "calc" ? "active" : ""}`} onClick={() => setSidebarTab("calc")} aria-label="View calculator tab">Calc</button>
            <button className={`tab-btn ${sidebarTab === "journal" ? "active" : ""}`} onClick={() => setSidebarTab("journal")} aria-label="View journal tab">Journal</button>
            <button className={`tab-btn ${sidebarTab === "analytics" ? "active" : ""}`} onClick={() => setSidebarTab("analytics")} aria-label="View analytics tab">Stats</button>
            <button className={`tab-btn ${sidebarTab === "backtest" ? "active" : ""}`} onClick={() => setSidebarTab("backtest")} aria-label="View backtest tab">Backtest</button>
            <button className={`tab-btn ${sidebarTab === "accounts" ? "active" : ""}`} onClick={() => setSidebarTab("accounts")} aria-label="View accounts tab">Accounts</button>
          </div>

          {sidebarTab === "signals" && (
            <>
              <SignalPanel signal={latestSignal} onLogTrade={handleLogTrade} />
              {latestSignal && <ConfirmationChecklist signal={latestSignal} />}
              <div className="card">
                <div className="card-title"><div className="dot" style={{ background: "var(--blue)" }} />Recent Signals</div>
                {loading.signals ? (
                  <LoadingSpinner size={16} text="Loading signals..." />
                ) : recentSignals.length === 0 ? (
                  <div className="no-data">No signals yet. Execute a manual scan or wait for live signals.</div>
                ) : (
                  recentSignals.map((s, i) => (
                    <div key={s.id || `sig-${i}`} className={`signal-card ${s.direction === "SELL" ? "sell" : ""}`} style={{ marginBottom: 8 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span className={`signal-direction ${s.direction === "BUY" ? "buy" : "sell"}`} style={{ fontSize: 14 }}>{s.direction}</span>
                        <span style={{ fontSize: 10, color: "var(--muted2)" }}>{s.pair} {s.timeframe}</span>
                      </div>
                      <div className="signal-detail">
                        <span>Entry <span style={{ color: "var(--text)" }}>{s.entry_price?.toFixed(5)}</span></span>
                        <span>SL <span style={{ color: "var(--red)" }}>{s.stop_loss?.toFixed(5)}</span></span>
                        <span>TP <span style={{ color: "var(--green)" }}>{s.take_profit?.toFixed(5)}</span></span>
                        <span>R:R <span style={{ color: "var(--amber)" }}>{s.risk_reward}</span></span>
                      </div>
                      <button onClick={() => handleLogTrade(s)} style={{ marginTop: 6, width: "100%", padding: "6px", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 4, color: "var(--muted2)", fontSize: 10, cursor: "pointer", fontFamily: "var(--font-ui)" }}>
                        Log Trade
                      </button>
                    </div>
                  ))
                )}
              </div>
            </>
          )}

          {sidebarTab === "ict" && <ICTSignalPanel />}

          {sidebarTab === "trades" && <TradeLog onUpdate={refreshAnalytics} />}
          {sidebarTab === "risk" && <RiskPanel />}
          {sidebarTab === "alerts" && <PriceAlerts currentPrice={livePrice} selectedPair={selectedPair} />}
          {sidebarTab === "calc" && <PositionSizeCalculator />}
          {sidebarTab === "journal" && <TradeJournal />}
          {sidebarTab === "analytics" && <Analytics data={analytics} trades={trades} />}
          {sidebarTab === "accounts" && <AccountManager />}
          {sidebarTab === "backtest" && <BacktestPanel />}
        </div>
      </div>
    </ErrorBoundary>
  );
}
