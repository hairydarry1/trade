import React, { useState, useEffect } from "react";
import { api } from "../api/client.js";
import ICTSignalCard from "./ICTSignalCard.jsx";
import ICTConfigPanel from "./ICTConfigPanel.jsx";
import ICTPositionManager from "./ICTPositionManager.jsx";
import LoadingSpinner from "./LoadingSpinner.jsx";

export default function ICTSignalPanel() {
  const [config, setConfig] = useState(null);
  const [signals, setSignals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scanLoading, setScanLoading] = useState(false);
  const [activeSignal, setActiveSignal] = useState(null);
  const [scanResult, setScanResult] = useState(null);
  const [positions, setPositions] = useState([]);
  const [accountType, setAccountType] = useState("demo");
  const [toast, setToast] = useState(null);

  useEffect(() => {
    loadConfig();
    loadSignals();
    loadPositions();
  }, []);

  useEffect(() => {
    if (config?.activeAccount) {
      setAccountType(config.activeAccount);
    }
  }, [config]);

  const loadConfig = async () => {
    try {
      const cfg = await api.getICTConfig();
      setConfig(cfg);
    } catch (err) {
      console.error("Failed to load ICT config:", err);
    }
  };

  const loadSignals = async () => {
    try {
      const sigs = await api.getICTSignals(20, accountType);
      setSignals(sigs || []);
    } catch (err) {
      console.error("Failed to load ICT signals:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadPositions = async () => {
    try {
      const pos = await api.getICTOpenPositions(accountType);
      setPositions(pos || []);
    } catch (err) {
      console.error("Failed to load positions:", err);
    }
  };

  const handleScan = async () => {
    if (!config) return;
    
    setScanLoading(true);
    try {
      const result = await api.scanICTSignal(
        activeSignal?.pair || "frxEURUSD",
        config.settings?.timezone || "ny",
        accountType
      );
      setScanResult(result);
      if (result.signal) {
        setActiveSignal(result.signal);
        setSignals(prev => [result.signal, ...prev].slice(0, 20));
        setToast({ type: "success", msg: `ICT Signal: ${result.signal.direction} ${result.signal.pair}` });
      } else {
        setToast({ type: "info", msg: `No signal - Stage ${result.stage}: ${result.reason}` });
      }
    } catch (err) {
      console.error("Scan failed:", err);
      setToast({ type: "error", msg: "Scan failed" });
    }
    setScanLoading(false);
  };

  const handleExecute = async (signal) => {
    try {
      const executionMode = config?.settings?.execution_mode || "alert";
      
      if (executionMode === "alert") {
        setToast({ type: "info", msg: "Execution mode is set to ALERT. Execute manually." });
        return;
      }
      
      const result = await api.executeICTTrade({
        signal_id: signal.id,
        pair: signal.pair,
        direction: signal.direction,
        entry_price: signal.entry_price,
        stop_loss: signal.stop_loss,
        take_profit: signal.take_profit,
        lot_size: signal.lot_size,
        account_type: accountType,
        risk_pct: config?.settings?.risk_pct || 1.0,
      });
      
      if (result.success) {
        setToast({ type: "success", msg: "Trade executed successfully" });
        loadPositions();
      } else {
        setToast({ type: "error", msg: result.error || "Execution failed" });
      }
    } catch (err) {
      console.error("Execute failed:", err);
      setToast({ type: "error", msg: "Execution failed" });
    }
  };

  const handleAccountSwitch = async (newAccount) => {
    try {
      await api.switchICTAccount(newAccount);
      setAccountType(newAccount);
      setConfig(prev => ({ ...prev, activeAccount: newAccount }));
      loadSignals();
      loadPositions();
      setToast({ type: "info", msg: `Switched to ${newAccount} account` });
    } catch (err) {
      console.error("Account switch failed:", err);
      setToast({ type: "error", msg: "Failed to switch account" });
    }
  };

  if (loading || !config) {
    return (
      <div className="ict-panel">
        <LoadingSpinner text="Loading ICT..." />
      </div>
    );
  }

  return (
    <div className="ict-panel">
      {toast && (
        <div className={`ict-toast ${toast.type}`}>
          {toast.msg}
          <button onClick={() => setToast(null)}>×</button>
        </div>
      )}
      
      <ICTConfigPanel 
        config={config}
        onConfigChange={(key, value) => {
          api.setICTSettings(key, value).then(loadConfig);
        }}
        onAccountSwitch={handleAccountSwitch}
        currentAccount={accountType}
      />
      
      <div className="ict-scan-bar">
        <button 
          className="ict-scan-btn" 
          onClick={handleScan}
          disabled={scanLoading}
        >
          {scanLoading ? "Scanning..." : "SCAN ICT"}
        </button>
      </div>
      
      {scanResult && scanResult.signal && (
        <ICTSignalCard 
          signal={scanResult.signal}
          onExecute={() => handleExecute(scanResult.signal)}
          executionMode={config.settings?.execution_mode || "alert"}
          showDetails={true}
        />
      )}
      
      {positions.length > 0 && (
        <ICTPositionManager 
          positions={positions}
          onClose={loadPositions}
          accountType={accountType}
        />
      )}
      
      <div className="ict-signals-list">
        <div className="section-title">Recent ICT Signals</div>
        {signals.length === 0 ? (
          <div className="no-data">No ICT signals yet</div>
        ) : (
          signals.slice(0, 10).map((sig, i) => (
            <ICTSignalCard 
              key={sig.id || i} 
              signal={sig}
              onExecute={() => handleExecute(sig)}
              executionMode={config.settings?.execution_mode || "alert"}
              compact={true}
            />
          ))
        )}
      </div>
    </div>
  );
}
