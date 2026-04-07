const BASE = "/api";

async function fetchJSON(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export const api = {
  getPairs: () => fetchJSON("/pairs"),
  getCandles: (pair, tf, limit = 500) => fetchJSON(`/candles/${pair}/${tf}?limit=${limit}`),
  getSignals: (limit = 50) => fetchJSON(`/signals?limit=${limit}`),
  scanSignal: (pair, tf) => fetchJSON("/signals/scan", { method: "POST", body: JSON.stringify({ pair, timeframe: tf }) }),
  getTrades: (limit = 100) => fetchJSON(`/trades?limit=${limit}`),
  getAnalytics: () => fetchJSON("/analytics"),
  getSession: () => fetchJSON("/session"),
  getRisk: () => fetchJSON("/risk"),
  getStatus: () => fetchJSON("/status"),
  resetRisk: () => fetchJSON("/risk/reset", { method: "POST" }),
  logTrade: (trade) => fetchJSON("/trades", { method: "POST", body: JSON.stringify(trade) }),
  updateTradeResult: (id, result, pnl, exit_price) => fetchJSON(`/trades/${id}`, { method: "PATCH", body: JSON.stringify({ result, pnl, exit_price }) }),
  updateTradeNotes: (id, notes) => fetchJSON(`/trades/${id}`, { method: "PATCH", body: JSON.stringify({ notes }) }),
  createAlert: (alert) => fetchJSON("/alerts", { method: "POST", body: JSON.stringify(alert) }),
  getAlerts: () => fetchJSON("/alerts"),
  deleteAlert: (id) => fetchJSON(`/alerts/${id}`, { method: "DELETE" }),
  getJournalEntries: () => fetchJSON("/journal"),
  createJournalEntry: (entry) => fetchJSON("/journal", { method: "POST", body: JSON.stringify(entry) }),
  updateJournalEntry: (id, entry) => fetchJSON(`/journal/${id}`, { method: "PATCH", body: JSON.stringify(entry) }),
  deleteJournalEntry: (id) => fetchJSON(`/journal/${id}`, { method: "DELETE" }),
  
  getICTConfig: () => fetchJSON("/ict/config"),
  getICTSettings: () => fetchJSON("/ict/settings"),
  setICTSettings: (key, value) => fetchJSON("/ict/settings", { method: "PUT", body: JSON.stringify({ key, value }) }),
  getICTSignals: (limit = 50, account) => fetchJSON(`/ict/signals?limit=${limit}${account ? `&account=${account}` : ''}`),
  scanICTSignal: (pair, timezone, accountType) => fetchJSON("/ict/scan", { method: "POST", body: JSON.stringify({ pair, timezone, accountType }) }),
  executeICTTrade: (trade) => fetchJSON("/ict/execute", { method: "POST", body: JSON.stringify(trade) }),
  getICTPositions: (account, status) => fetchJSON(`/ict/positions?${account ? `account=${account}&` : ''}status=${status || 'open'}`),
  getICTOpenPositions: (account) => fetchJSON(`/ict/positions/open${account ? `?account=${account}` : ''}`),
  getICTPositionStats: (account) => fetchJSON(`/ict/positions/stats${account ? `?account=${account}` : ''}`),
  closeICTPosition: (id, reason) => fetchJSON(`/ict/positions/${id}/close`, { method: "POST", body: JSON.stringify({ reason }) }),
  getICTPositionStatus: (id) => fetchJSON(`/ict/positions/${id}/status`),
  switchICTAccount: (accountType) => fetchJSON("/ict/account/switch", { method: "POST", body: JSON.stringify({ account_type: accountType }) }),
  getBacktestRuns: () => fetchJSON("/backtest/runs"),
  getBacktestRun: (id) => fetchJSON(`/backtest/runs/${id}`),
  getBacktestStats: (id) => fetchJSON(`/backtest/stats/${id}`),
  exportBacktestCSV: (id) => fetch(`/backtest/export/${id}`).then(r => r.text()),
  runBacktest: (config) => fetchJSON("/backtest/run", { method: "POST", body: JSON.stringify(config) }),
};
