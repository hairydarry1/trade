import React, { useMemo } from "react";

function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

export default function CalendarHeatmap({ trades = [] }) {
  const heatmapData = useMemo(() => {
    const data = {};
    trades.forEach(trade => {
      if (!trade.result) return;
      const date = trade.created_at?.split('T')[0] || new Date().toISOString().split('T')[0];
      if (!data[date]) {
        data[date] = { trades: 0, pnl: 0 };
      }
      data[date].trades += 1;
      data[date].pnl += trade.pnl || 0;
    });
    return data;
  }, [trades]);

  const months = useMemo(() => {
    const result = [];
    const today = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      result.push({
        name: d.toLocaleString('default', { month: 'short' }),
        year: d.getFullYear(),
        month: d.getMonth(),
      });
    }
    return result;
  }, []);

  const getColor = (pnl) => {
    if (pnl === 0) return "var(--bg4)";
    if (pnl > 0) {
      const intensity = Math.min(pnl / 100, 1);
      return `rgba(0, 217, 139, ${0.2 + intensity * 0.8})`;
    }
    const intensity = Math.min(Math.abs(pnl) / 100, 1);
    return `rgba(255, 45, 85, ${0.2 + intensity * 0.8})`;
  };

  const getDaysInMonth = (year, month) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year, month) => {
    return new Date(year, month, 1).getDay();
  };

  if (!trades.length) {
    return (
      <div className="card">
        <div className="card-title"><div className="dot" style={{ background: "var(--purple)" }} />Activity Heatmap</div>
        <div className="no-data">No trade data to display.</div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-title"><div className="dot" style={{ background: "var(--purple)" }} />Activity Heatmap</div>
      <div style={{ display: "flex", gap: 4, overflowX: "auto", paddingBottom: 8 }}>
        {months.map(({ name, year, month }) => (
          <div key={`${year}-${month}`} style={{ flexShrink: 0 }}>
            <div style={{ fontSize: 10, color: "var(--muted2)", textAlign: "center", marginBottom: 4 }}>{name}</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                <div key={i} style={{ width: 12, height: 12, fontSize: 6, color: "var(--muted)", textAlign: "center" }}>{d}</div>
              ))}
              {Array.from({ length: getFirstDayOfMonth(year, month) }, (_, i) => (
                <div key={`empty-${i}`} style={{ width: 12, height: 12 }} />
              ))}
              {Array.from({ length: getDaysInMonth(year, month) }, (_, i) => {
                const day = i + 1;
                const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const dayData = heatmapData[date];
                return (
                  <div
                    key={day}
                    title={`${date}: ${dayData?.trades || 0} trades, ${dayData?.pnl?.toFixed(2) || 0} PnL`}
                    style={{
                      width: 12,
                      height: 12,
                      background: getColor(dayData?.pnl || 0),
                      borderRadius: 2,
                      cursor: "pointer",
                    }}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 12, marginTop: 8, justifyContent: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <div style={{ width: 12, height: 12, background: "rgba(255,45,85,0.8)", borderRadius: 2 }} />
          <span style={{ fontSize: 9, color: "var(--muted2)" }}>Loss</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <div style={{ width: 12, height: 12, background: "var(--bg4)", borderRadius: 2 }} />
          <span style={{ fontSize: 9, color: "var(--muted2)" }}>No trades</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <div style={{ width: 12, height: 12, background: "rgba(0,217,139,0.8)", borderRadius: 2 }} />
          <span style={{ fontSize: 9, color: "var(--muted2)" }}>Profit</span>
        </div>
      </div>
    </div>
  );
}
