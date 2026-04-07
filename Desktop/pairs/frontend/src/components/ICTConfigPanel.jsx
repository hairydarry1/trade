import React, { useState } from "react";

export default function ICTConfigPanel({ config, onConfigChange, onAccountSwitch, currentAccount }) {
  const [timezone, setTimezone] = useState(config.settings?.timezone || "ny");
  const [executionMode, setExecutionMode] = useState(config.settings?.execution_mode || "alert");
  const [riskPct, setRiskPct] = useState(config.settings?.risk_pct || 1.0);

  const handleTimezoneChange = (e) => {
    const val = e.target.value;
    setTimezone(val);
    onConfigChange("timezone", val);
  };

  const handleExecutionChange = (e) => {
    const val = e.target.value;
    setExecutionMode(val);
    onConfigChange("execution_mode", val);
  };

  const handleRiskChange = (e) => {
    const val = parseFloat(e.target.value);
    setRiskPct(val);
    onConfigChange("risk_pct", val.toString());
  };

  return (
    <div className="ict-config">
      <div className="ict-config-section">
        <label>Account</label>
        <div className="account-toggle">
          <button 
            className={`acc-btn ${currentAccount === "demo" ? "active" : ""}`}
            onClick={() => onAccountSwitch("demo")}
          >
            Demo
          </button>
          <button 
            className={`acc-btn ${currentAccount === "live" ? "active" : ""}`}
            onClick={() => onAccountSwitch("live")}
          >
            Live
          </button>
        </div>
        {config.accountConfig && (
          <div className="account-status">
            <span className={config.accountConfig.demo ? "connected" : "disconnected"}>
              Demo: {config.accountConfig.demo ? "✓" : "✗"}
            </span>
            <span className={config.accountConfig.live ? "connected" : "disconnected"}>
              Live: {config.accountConfig.live ? "✓" : "✗"}
            </span>
          </div>
        )}
      </div>

      <div className="ict-config-section">
        <label>Timezone</label>
        <select value={timezone} onChange={handleTimezoneChange}>
          {config.timezones?.map(tz => (
            <option key={tz.id} value={tz.id}>
              {tz.name} (UTC{tz.offset >= 0 ? '+' : ''}{tz.offset})
            </option>
          ))}
        </select>
      </div>

      <div className="ict-config-section">
        <label>Execution Mode</label>
        <select value={executionMode} onChange={handleExecutionChange}>
          <option value="alert">Smart Alert (Manual)</option>
          <option value="auto">Auto Execute</option>
        </select>
        <div className="mode-desc">
          {executionMode === "alert" 
            ? "Get notified, you execute manually" 
            : "Automatically place trades when signal fires"}
        </div>
      </div>

      <div className="ict-config-section">
        <label>Risk per Trade: {riskPct}%</label>
        <input 
          type="range" 
          min="0.5" 
          max="5" 
          step="0.5" 
          value={riskPct}
          onChange={handleRiskChange}
        />
      </div>
    </div>
  );
}
