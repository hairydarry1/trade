import React, { useState, useEffect } from "react";
import { api } from "../api/client.js";
import CandleChart from "./CandleChart.jsx";

export default function MultiChartGrid({ 
  pair = "frxEURUSD", 
  livePrice, 
  signal, 
  candleUpdate,
  initialTimeframes = ["15M", "1H", "4H"],
  maxCharts = 4 
}) {
  const [timeframes, setTimeframes] = useState(initialTimeframes);
  const [candleData, setCandleData] = useState({});
  const [loading, setLoading] = useState(true);

  const ALL_TIMEFRAMES = ["1M", "5M", "15M", "1H", "4H", "D"];

  useEffect(() => {
    loadAllCandles();
  }, [pair, timeframes.join(',')]);

  const loadAllCandles = async () => {
    setLoading(true);
    const data = {};
    
    await Promise.all(
      timeframes.map(async (tf) => {
        try {
          const result = await api.getCandles(pair, tf, 200);
          data[tf] = result.candles || [];
        } catch (e) {
          console.error(`Failed to load ${tf}:`, e);
          data[tf] = [];
        }
      })
    );
    
    setCandleData(data);
    setLoading(false);
  };

  const toggleTimeframe = (tf) => {
    setTimeframes(prev => {
      if (prev.includes(tf)) {
        return prev.filter(t => t !== tf);
      }
      if (prev.length < maxCharts) {
        const newTimeframes = [...prev, tf];
        return newTimeframes.sort((a, b) => ALL_TIMEFRAMES.indexOf(a) - ALL_TIMEFRAMES.indexOf(b));
      }
      return prev;
    });
  };

  const gridCols = timeframes.length <= 1 ? "1fr" : timeframes.length <= 2 ? "1fr 1fr" : "1fr 1fr";

  return (
    <div className="card">
      <div className="card-title">
        <div className="dot" style={{ background: "var(--purple)" }} />
        Chart Grid - {pair}
      </div>
      
      <div style={{ marginBottom: 10, display: "flex", gap: 4, flexWrap: "wrap" }}>
        {ALL_TIMEFRAMES.map(tf => (
          <button
            key={tf}
            onClick={() => toggleTimeframe(tf)}
            disabled={!timeframes.includes(tf) && timeframes.length >= maxCharts}
            style={{
              padding: "4px 8px",
              fontSize: 10,
              background: timeframes.includes(tf) ? "var(--purple)" : "var(--bg)",
              border: "1px solid var(--border)",
              borderRadius: 3,
              color: timeframes.includes(tf) ? "#fff" : "var(--muted2)",
              cursor: timeframes.includes(tf) ? "pointer" : "not-allowed",
              opacity: !timeframes.includes(tf) && timeframes.length >= maxCharts ? 0.5 : 1,
            }}
          >
            {tf}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="no-data">Loading charts...</div>
      ) : (
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: gridCols,
          gap: 8 
        }}>
          {timeframes.map(tf => (
            <div key={tf} style={{ minHeight: 250 }}>
              <div style={{ 
                display: "flex", 
                justifyContent: "space-between", 
                alignItems: "center",
                marginBottom: 4,
                padding: "4px 8px",
                background: "var(--bg3)",
                borderRadius: "4px 4px 0 0"
              }}>
                <span style={{ fontSize: 11, color: "var(--amber)", fontWeight: 600 }}>
                  {pair} · {tf}
                </span>
                {candleData[tf]?.length > 0 && (
                  <span style={{ fontSize: 10, color: "var(--muted2)" }}>
                    {candleData[tf][candleData[tf].length - 1]?.close?.toFixed(5)}
                  </span>
                )}
              </div>
              <CandleChart
                candles={candleData[tf] || []}
                pair={pair}
                timeframe={tf}
                livePrice={livePrice}
                signal={signal}
                candleUpdate={candleUpdate?.pair === pair && candleUpdate?.timeframe === tf ? candleUpdate : null}
                showIndicatorPanel={false}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
