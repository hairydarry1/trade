import React, { useState, useEffect, useCallback, useRef } from "react";
import { api } from "../api/client.js";

export default function PriceAlerts({ currentPrice, selectedPair }) {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newAlert, setNewAlert] = useState({ pair: "", price: "", direction: "above" });
  const triggeredAlertsRef = useRef(new Set());

  const fetchAlerts = useCallback(async () => {
    try {
      const data = await api.getAlerts();
      setAlerts(data || []);
    } catch (err) {
      console.error("Failed to load alerts:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const handleCreateAlert = async () => {
    if (!newAlert.pair || !newAlert.price) return;
    try {
      await api.createAlert({
        pair: newAlert.pair,
        target_price: parseFloat(newAlert.price),
        direction: newAlert.direction,
      });
      await fetchAlerts();
      setNewAlert({ pair: "", price: "", direction: "above" });
      setShowForm(false);
    } catch (err) {
      console.error("Failed to create alert:", err);
    }
  };

  const handleDeleteAlert = async (id) => {
    try {
      await api.deleteAlert(id);
      setAlerts(prev => prev.filter(a => a.id !== id));
    } catch (err) {
      console.error("Failed to delete alert:", err);
    }
  };

  const checkAlerts = useCallback(() => {
    if (!currentPrice || !alerts.length || !selectedPair) return;
    alerts.forEach(alert => {
      if (alert.pair !== selectedPair) return;
      if (triggeredAlertsRef.current.has(alert.id)) return;
      
      const triggered = alert.direction === "above" 
        ? currentPrice >= alert.target_price 
        : currentPrice <= alert.target_price;
      if (triggered) {
        triggeredAlertsRef.current.add(alert.id);
        playNotificationSound();
      }
    });
  }, [currentPrice, alerts, selectedPair]);

  useEffect(() => {
    checkAlerts();
  }, [checkAlerts]);

  const playNotificationSound = () => {
    const audio = new Audio("data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH2Onp6X");
    audio.volume = 0.3;
    audio.play().catch(() => {});
  };

  if (loading) {
    return (
      <div className="card">
        <div className="card-title"><div className="dot" style={{ background: "var(--cyan)" }} />Price Alerts</div>
        <div className="no-data">Loading...</div>
      </div>
    );
  }

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div className="card-title"><div className="dot" style={{ background: "var(--cyan)" }} />Price Alerts</div>
        <button 
          onClick={() => setShowForm(!showForm)} 
          style={{ padding: "4px 8px", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 4, color: "var(--muted2)", cursor: "pointer", fontSize: 10 }}
        >
          {showForm ? "Cancel" : "+ Add"}
        </button>
      </div>
      
      {showForm && (
        <div style={{ marginBottom: 12, padding: 8, background: "var(--bg)", borderRadius: 4 }}>
          <input
            type="text"
            placeholder="Pair (e.g. frxEURUSD)"
            value={newAlert.pair}
            onChange={(e) => setNewAlert(prev => ({ ...prev, pair: e.target.value }))}
            style={{ width: "100%", padding: "6px", marginBottom: 6, fontSize: 11, background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 4, color: "var(--text)" }}
          />
          <input
            type="number"
            placeholder="Price"
            value={newAlert.price}
            onChange={(e) => setNewAlert(prev => ({ ...prev, price: e.target.value }))}
            style={{ width: "100%", padding: "6px", marginBottom: 6, fontSize: 11, background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 4, color: "var(--text)" }}
          />
          <div style={{ display: "flex", gap: 4, marginBottom: 6 }}>
            <button
              onClick={() => setNewAlert(prev => ({ ...prev, direction: "above" }))}
              style={{ flex: 1, padding: "4px", fontSize: 10, background: newAlert.direction === "above" ? "var(--green)" : "var(--bg)", border: "1px solid var(--border)", borderRadius: 3, color: newAlert.direction === "above" ? "#000" : "var(--muted2)", cursor: "pointer" }}
            >
              Above ↑
            </button>
            <button
              onClick={() => setNewAlert(prev => ({ ...prev, direction: "below" }))}
              style={{ flex: 1, padding: "4px", fontSize: 10, background: newAlert.direction === "below" ? "var(--red)" : "var(--bg)", border: "1px solid var(--border)", borderRadius: 3, color: newAlert.direction === "below" ? "#fff" : "var(--muted2)", cursor: "pointer" }}
            >
              Below ↓
            </button>
          </div>
          <button
            onClick={handleCreateAlert}
            style={{ width: "100%", padding: "6px", background: "var(--cyan)", border: "none", borderRadius: 4, color: "#000", fontSize: 11, fontWeight: 600, cursor: "pointer" }}
          >
            Create Alert
          </button>
        </div>
      )}

      {alerts.length === 0 ? (
        <div className="no-data">No alerts set. Click "+ Add" to create one.</div>
      ) : (
        alerts.map(alert => (
          <div key={alert.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
            <div>
              <span style={{ fontSize: 11, color: "var(--text)" }}>{alert.pair}</span>
              <span style={{ fontSize: 10, color: "var(--muted2)", marginLeft: 6 }}>
                {alert.direction === "above" ? ">" : "<"} {alert.target_price?.toFixed(5)}
              </span>
            </div>
            <button 
              onClick={() => handleDeleteAlert(alert.id)}
              style={{ padding: "2px 6px", background: "none", border: "none", color: "var(--red)", cursor: "pointer", fontSize: 10 }}
            >
              ✕
            </button>
          </div>
        ))
      )}
    </div>
  );
}
