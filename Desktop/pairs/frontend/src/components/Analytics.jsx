import React, { useEffect, useRef, useState } from "react";
import { createChart } from "lightweight-charts";
import CalendarHeatmap from "./CalendarHeatmap.jsx";

function fmt(num) {
  if (num == null || isNaN(num)) return "—";
  return num >= 0 ? `+${num.toFixed(2)}` : num.toFixed(2);
}

function pct(num) {
  if (num == null || isNaN(num)) return "—";
  return `${num.toFixed(1)}%`;
}

export default function Analytics({ data, trades = [] }) {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!chartContainerRef.current || !data?.equity_curve?.length) return;

    if (chartRef.current) {
      chartRef.current.remove();
    }

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 150,
      layout: {
        background: { type: "solid", color: "transparent" },
        textColor: "var(--muted2)",
      },
      grid: {
        vertLines: { color: "var(--border)" },
        horzLines: { color: "var(--border)" },
      },
      rightPriceScale: {
        borderColor: "var(--border)",
      },
      timeScale: {
        borderColor: "var(--border)",
        timeVisible: true,
      },
    });

    const areaSeries = chart.addAreaSeries({
      lineColor: data.total_pnl >= 0 ? "#00d98b" : "#ff2d55",
      topColor: data.total_pnl >= 0 ? "rgba(0,217,139,0.3)" : "rgba(255,45,85,0.3)",
      bottomColor: "transparent",
      lineWidth: 2,
    });

    areaSeries.setData(data.equity_curve.map(d => ({
      time: d.date || d.timestamp,
      value: d.equity || d.pnl,
    })));

    chart.timeScale().fitContent();
    chartRef.current = chart;

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [data?.equity_curve]);

  if (!data || data.total_trades === 0) {
    return (
      <div className="card">
        <div className="card-title"><div className="dot" style={{ background: "var(--cyan)" }} />Performance</div>
        <div className="no-data">No trades logged yet.</div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-title"><div className="dot" style={{ background: "var(--cyan)" }} />Performance</div>
      {data.equity_curve?.length > 0 && (
        <div ref={chartContainerRef} style={{ marginBottom: 12, borderRadius: 4, overflow: "hidden" }} />
      )}
      <CalendarHeatmap trades={trades} />
      <div className="analytics-grid">
        <div className="stat-box">
          <div className={`stat-value ${(data.total_pnl || 0) >= 0 ? "green" : "red"}`}>
            {fmt(data.total_pnl)}
          </div>
          <div className="stat-label">Total PnL</div>
        </div>
        <div className="stat-box">
          <div className="stat-value">{pct(data.win_rate)}</div>
          <div className="stat-label">Win Rate</div>
        </div>
        <div className="stat-box">
          <div className="stat-value">{data.total_trades || 0}</div>
          <div className="stat-label">Trades</div>
        </div>
        <div className="stat-box">
          <div className="stat-value red">{fmt(data.max_drawdown)}</div>
          <div className="stat-label">Max DD</div>
        </div>
        <div className="stat-box">
          <div className="stat-value green">{fmt(data.avg_win)}</div>
          <div className="stat-label">Avg Win</div>
        </div>
        <div className="stat-box">
          <div className="stat-value red">{fmt(data.avg_loss)}</div>
          <div className="stat-label">Avg Loss</div>
        </div>
        <div className="stat-box">
          <div className="stat-value green">{fmt(data.best_trade)}</div>
          <div className="stat-label">Best</div>
        </div>
        <div className="stat-box">
          <div className="stat-value red">{fmt(data.worst_trade)}</div>
          <div className="stat-label">Worst</div>
        </div>
      </div>
    </div>
  );
}
