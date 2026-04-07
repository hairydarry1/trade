import initSqlJs from "sql.js";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { dirname } from "path";
import { config } from "../config.js";

let db;

export async function initDb() {
  const SQL = await initSqlJs();
  const dir = dirname(config.dbPath);
  mkdirSync(dir, { recursive: true });

  if (existsSync(config.dbPath)) {
    const buf = readFileSync(config.dbPath);
    db = new SQL.Database(buf);
  } else {
    db = new SQL.Database();
  }
  initTables();
  return db;
}

function initTables() {
  db.run(`
    CREATE TABLE IF NOT EXISTS candles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pair TEXT NOT NULL,
      timeframe TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      open REAL NOT NULL,
      high REAL NOT NULL,
      low REAL NOT NULL,
      close REAL NOT NULL,
      volume INTEGER DEFAULT 0
    );
  `);
  db.run(`CREATE UNIQUE INDEX IF NOT EXISTS ix_candle_pts ON candles(pair, timeframe, timestamp);`);

  db.run(`
    CREATE TABLE IF NOT EXISTS signals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pair TEXT NOT NULL,
      direction TEXT NOT NULL,
      timeframe TEXT NOT NULL,
      entry_price REAL NOT NULL,
      stop_loss REAL NOT NULL,
      take_profit REAL NOT NULL,
      risk_reward REAL,
      confirmations TEXT,
      sweep_level REAL,
      fib_level REAL,
      timestamp INTEGER NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      status TEXT DEFAULT 'active'
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS trades (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      signal_id INTEGER,
      pair TEXT NOT NULL,
      direction TEXT NOT NULL,
      entry_price REAL NOT NULL,
      exit_price REAL,
      stop_loss REAL NOT NULL,
      take_profit REAL NOT NULL,
      lot_size REAL DEFAULT 0.01,
      pnl REAL DEFAULT 0,
      result TEXT,
      session TEXT,
      opened_at TEXT DEFAULT (datetime('now')),
      closed_at TEXT
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS pairs_config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      symbol TEXT UNIQUE NOT NULL,
      display_name TEXT,
      enabled INTEGER DEFAULT 1,
      pip_size REAL DEFAULT 0.0001
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS ict_signals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pair TEXT NOT NULL,
      direction TEXT NOT NULL,
      timeframe TEXT NOT NULL,
      entry_price REAL NOT NULL,
      stop_loss REAL NOT NULL,
      take_profit REAL NOT NULL,
      risk_reward REAL,
      confirmations TEXT,
      sweep_level REAL,
      fib_level REAL,
      timezone TEXT,
      account_type TEXT DEFAULT 'demo',
      execution_mode TEXT DEFAULT 'alert',
      status TEXT DEFAULT 'active',
      stage INTEGER DEFAULT 1,
      timestamp INTEGER NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS ict_positions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      signal_id INTEGER,
      external_id TEXT,
      pair TEXT NOT NULL,
      direction TEXT NOT NULL,
      entry_price REAL NOT NULL,
      exit_price REAL,
      stop_loss REAL NOT NULL,
      take_profit REAL NOT NULL,
      lot_size REAL NOT NULL,
      account_type TEXT DEFAULT 'demo',
      status TEXT DEFAULT 'open',
      opened_at TEXT DEFAULT (datetime('now')),
      closed_at TEXT,
      pnl REAL DEFAULT 0
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS ict_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE NOT NULL,
      value TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS backtest_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pairs TEXT NOT NULL,
      timeframes TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      status TEXT DEFAULT 'running',
      total_signals INTEGER DEFAULT 0,
      wins INTEGER DEFAULT 0,
      losses INTEGER DEFAULT 0,
      total_pnl REAL DEFAULT 0,
      profit_factor REAL DEFAULT 0,
      avg_rr REAL DEFAULT 0,
      max_drawdown REAL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS backtest_trades (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      run_id INTEGER NOT NULL,
      pair TEXT NOT NULL,
      direction TEXT NOT NULL,
      timeframe TEXT NOT NULL,
      entry_price REAL NOT NULL,
      exit_price REAL,
      stop_loss REAL NOT NULL,
      take_profit REAL NOT NULL,
      entry_time INTEGER NOT NULL,
      exit_time INTEGER,
      result TEXT,
      pnl_r REAL DEFAULT 0,
      confirmations TEXT,
      FOREIGN KEY (run_id) REFERENCES backtest_runs(id)
    );
  `);
}

export function getDb() {
  return db;
}

export function saveDb() {
  if (db) {
    const data = db.export();
    const buf = Buffer.from(data);
    writeFileSync(config.dbPath, buf);
  }
}

export function closeDb() {
  saveDb();
  if (db) {
    db.close();
    db = null;
  }
}

export function runQuery(sql, params = []) {
  try {
    if (sql.trim().toUpperCase().startsWith("SELECT")) {
      const stmt = db.prepare(sql);
      stmt.bind(params);
      const rows = [];
      while (stmt.step()) rows.push(stmt.getAsObject());
      stmt.free();
      return rows || [];
    } else {
      db.run(sql, params);
      return { changes: db.getRowsModified() };
    }
  } catch (e) {
    console.error("DB error:", e.message, "SQL:", sql);
    return [];
  }
}

export function insertCandle(pair, timeframe, timestamp, open, high, low, close, volume = 0) {
  db.run(
    "INSERT OR REPLACE INTO candles (pair, timeframe, timestamp, open, high, low, close, volume) VALUES (?,?,?,?,?,?,?,?)",
    [pair, timeframe, timestamp, open, high, low, close, volume]
  );
}

export function getCandles(pair, timeframe, limit = 500) {
  return runQuery(
    "SELECT * FROM candles WHERE pair = ? AND timeframe = ? ORDER BY timestamp DESC LIMIT ?",
    [pair, timeframe, limit]
  ).reverse();
}

export function insertSignal(signal) {
  db.run(
    "INSERT INTO signals (pair, direction, timeframe, entry_price, stop_loss, take_profit, risk_reward, confirmations, sweep_level, fib_level, timestamp) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
    [signal.pair, signal.direction, signal.timeframe, signal.entry_price, signal.stop_loss, signal.take_profit, signal.risk_reward, JSON.stringify(signal.confirmations), signal.sweep_level, signal.fib_level, signal.timestamp]
  );
  return db.exec("SELECT last_insert_rowid()")[0].values[0][0];
}

export function getSignals(limit = 50) {
  return runQuery("SELECT * FROM signals ORDER BY created_at DESC LIMIT ?", [limit]);
}

export function insertTrade(trade) {
  db.run(
    "INSERT INTO trades (signal_id, pair, direction, entry_price, exit_price, stop_loss, take_profit, lot_size, pnl, result, session, opened_at, closed_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",
    [
      trade.signal_id || null,
      trade.pair,
      trade.direction,
      trade.entry_price,
      trade.exit_price || null,
      trade.stop_loss,
      trade.take_profit,
      trade.lot_size || 0.01,
      trade.pnl || 0,
      trade.result || null,
      trade.session || null,
      trade.opened_at || new Date().toISOString(),
      trade.closed_at || null,
    ]
  );
}

export function getTrades(limit = 100) {
  return runQuery("SELECT * FROM trades ORDER BY opened_at DESC LIMIT ?", [limit]);
}

export function updateTradeResult(id, result, pnl, exit_price) {
  db.run(
    "UPDATE trades SET result = ?, pnl = ?, exit_price = ?, closed_at = ? WHERE id = ?",
    [result, pnl, exit_price, new Date().toISOString(), id]
  );
}

export function getAnalytics() {
  const allTrades = runQuery("SELECT * FROM trades");
  const trades = allTrades.filter(t => t.result != null && (t.result === "WIN" || t.result === "LOSS" || (typeof t.result === "object" && t.result != null)));
  if (!trades.length) {
    return { total_trades: allTrades.length, wins: 0, losses: 0, win_rate: 0, total_pnl: 0, avg_win: 0, avg_loss: 0, max_drawdown: 0, best_trade: 0, worst_trade: 0 };
  }
  const wins = trades.filter(t => t.result === "WIN" || (typeof t.result === "object" && t.result?.type === "WIN"));
  const losses = trades.filter(t => t.result === "LOSS" || (typeof t.result === "object" && t.result?.type === "LOSS"));
  const pnls = trades.map(t => Number(t.pnl) || 0);
  const totalPnl = pnls.reduce((a, b) => a + b, 0);
  const avgWin = wins.length ? wins.reduce((a, t) => a + (Number(t.pnl) || 0), 0) / wins.length : 0;
  const avgLoss = losses.length ? losses.reduce((a, t) => a + (Number(t.pnl) || 0), 0) / losses.length : 0;

  let peak = 0, maxDd = 0, running = 0;
  for (const p of pnls) {
    running += p;
    if (running > peak) peak = running;
    const dd = peak - running;
    if (dd > maxDd) maxDd = dd;
  }

  return {
    total_trades: allTrades.length,
    wins: wins.length,
    losses: losses.length,
    win_rate: trades.length ? (wins.length / trades.length * 100) : 0,
    total_pnl: totalPnl,
    avg_win: avgWin,
    avg_loss: avgLoss,
    max_drawdown: maxDd,
    best_trade: Math.max(...pnls),
    worst_trade: Math.min(...pnls),
  };
}

export function insertICTSignal(signal) {
  db.run(
    "INSERT INTO ict_signals (pair, direction, timeframe, entry_price, stop_loss, take_profit, risk_reward, confirmations, sweep_level, fib_level, timezone, account_type, execution_mode, status, stage, timestamp) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
    [
      signal.pair,
      signal.direction,
      signal.timeframe,
      signal.entry_price,
      signal.stop_loss,
      signal.take_profit,
      signal.risk_reward,
      JSON.stringify(signal.confirmations),
      signal.sweep_level,
      signal.fib_level,
      signal.timezone || "ny",
      signal.account_type || "demo",
      signal.execution_mode || "alert",
      signal.status || "active",
      signal.stage || 1,
      signal.timestamp
    ]
  );
  return db.exec("SELECT last_insert_rowid()")[0].values[0][0];
}

export function getICTSignals(limit = 50, accountType = null) {
  if (accountType) {
    return runQuery("SELECT * FROM ict_signals WHERE account_type = ? ORDER BY created_at DESC LIMIT ?", [accountType, limit]);
  }
  return runQuery("SELECT * FROM ict_signals ORDER BY created_at DESC LIMIT ?", [limit]);
}

export function updateICTSignalStatus(id, status, stage = null) {
  if (stage !== null) {
    db.run("UPDATE ict_signals SET status = ?, stage = ? WHERE id = ?", [status, stage, id]);
  } else {
    db.run("UPDATE ict_signals SET status = ? WHERE id = ?", [status, id]);
  }
}

export function insertICTPosition(position) {
  db.run(
    "INSERT INTO ict_positions (signal_id, external_id, pair, direction, entry_price, exit_price, stop_loss, take_profit, lot_size, account_type, status, opened_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",
    [
      position.signal_id || null,
      position.external_id || null,
      position.pair,
      position.direction,
      position.entry_price,
      position.exit_price || null,
      position.stop_loss,
      position.take_profit,
      position.lot_size,
      position.account_type || "demo",
      position.status || "open",
      position.opened_at || new Date().toISOString()
    ]
  );
  return db.exec("SELECT last_insert_rowid()")[0].values[0][0];
}

export function getICTPositions(accountType = null, status = null) {
  let query = "SELECT * FROM ict_positions";
  const conditions = [];
  const params = [];
  
  if (accountType) {
    conditions.push("account_type = ?");
    params.push(accountType);
  }
  if (status) {
    conditions.push("status = ?");
    params.push(status);
  }
  
  if (conditions.length > 0) {
    query += " WHERE " + conditions.join(" AND ");
  }
  query += " ORDER BY opened_at DESC";
  
  return runQuery(query, params);
}

export function updateICTPosition(id, updates) {
  const fields = [];
  const params = [];
  
  if (updates.exit_price !== undefined) {
    fields.push("exit_price = ?");
    params.push(updates.exit_price);
  }
  if (updates.status !== undefined) {
    fields.push("status = ?");
    params.push(updates.status);
  }
  if (updates.pnl !== undefined) {
    fields.push("pnl = ?");
    params.push(updates.pnl);
  }
  if (updates.closed_at !== undefined) {
    fields.push("closed_at = ?");
    params.push(updates.closed_at);
  }
  
  if (fields.length > 0) {
    params.push(id);
    db.run(`UPDATE ict_positions SET ${fields.join(", ")} WHERE id = ?`, params);
  }
}

export function getICTSettings() {
  const rows = runQuery("SELECT * FROM ict_settings");
  const settings = {};
  for (const row of rows) {
    settings[row.key] = row.value;
  }
  return settings;
}

export function setICTSetting(key, value) {
  db.run(
    "INSERT OR REPLACE INTO ict_settings (key, value, updated_at) VALUES (?, ?, datetime('now'))",
    [key, value]
  );
}

export function insertBacktestRun(config) {
  db.run(
    "INSERT INTO backtest_runs (pairs, timeframes, start_date, end_date, status) VALUES (?,?,?,?,?)",
    [JSON.stringify(config.pairs), JSON.stringify(config.timeframes), config.startDate, config.endDate, "running"]
  );
  return db.exec("SELECT last_insert_rowid()")[0].values[0][0];
}

export function updateBacktestRun(id, updates) {
  const fields = [];
  const params = [];
  if (updates.status !== undefined) { fields.push("status = ?"); params.push(updates.status); }
  if (updates.total_signals !== undefined) { fields.push("total_signals = ?"); params.push(updates.total_signals); }
  if (updates.wins !== undefined) { fields.push("wins = ?"); params.push(updates.wins); }
  if (updates.losses !== undefined) { fields.push("losses = ?"); params.push(updates.losses); }
  if (updates.total_pnl !== undefined) { fields.push("total_pnl = ?"); params.push(updates.total_pnl); }
  if (updates.profit_factor !== undefined) { fields.push("profit_factor = ?"); params.push(updates.profit_factor); }
  if (updates.avg_rr !== undefined) { fields.push("avg_rr = ?"); params.push(updates.avg_rr); }
  if (updates.max_drawdown !== undefined) { fields.push("max_drawdown = ?"); params.push(updates.max_drawdown); }
  if (fields.length > 0) {
    params.push(id);
    db.run(`UPDATE backtest_runs SET ${fields.join(", ")} WHERE id = ?`, params);
  }
}

export function getBacktestRuns(limit = 10) {
  return runQuery("SELECT * FROM backtest_runs ORDER BY created_at DESC LIMIT ?", [limit]);
}

export function getBacktestRun(id) {
  return runQuery("SELECT * FROM backtest_runs WHERE id = ?", [id])[0];
}

export function getBacktestTrades(runId) {
  return runQuery("SELECT * FROM backtest_trades WHERE run_id = ? ORDER BY entry_time", [runId]);
}

export function insertBacktestTrade(trade) {
  db.run(
    "INSERT INTO backtest_trades (run_id, pair, direction, timeframe, entry_price, exit_price, stop_loss, take_profit, entry_time, exit_time, result, pnl_r, confirmations) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
    [trade.runId, trade.pair, trade.direction, trade.timeframe, trade.entryPrice, trade.exitPrice, trade.stopLoss, trade.takeProfit, trade.entryTime, trade.exitTime, trade.result, trade.pnlR, trade.confirmations ? JSON.stringify(trade.confirmations) : null]
  );
}

export function getBacktestStats(runId) {
  const trades = getBacktestTrades(runId);
  if (!trades.length) return null;
  
  const wins = trades.filter(t => t.result === "WIN");
  const losses = trades.filter(t => t.result === "LOSS");
  const noResult = trades.filter(t => t.result === "NO_RESULT");
  
  const winsR = wins.reduce((sum, t) => sum + (t.pnl_r || 0), 0);
  const lossesR = losses.reduce((sum, t) => sum + Math.abs(t.pnl_r || 0), 0);
  
  const pairStats = {};
  const tfStats = {};
  
  for (const t of trades) {
    if (!pairStats[t.pair]) pairStats[t.pair] = { wins: 0, losses: 0, total: 0 };
    pairStats[t.pair].total++;
    if (t.result === "WIN") pairStats[t.pair].wins++;
    else if (t.result === "LOSS") pairStats[t.pair].losses++;
    
    if (!tfStats[t.timeframe]) tfStats[t.timeframe] = { wins: 0, losses: 0, total: 0 };
    tfStats[t.timeframe].total++;
    if (t.result === "WIN") tfStats[t.timeframe].wins++;
    else if (t.result === "LOSS") tfStats[t.timeframe].losses++;
  }
  
  for (const p of Object.values(pairStats)) {
    p.winRate = p.total ? (p.wins / p.total * 100) : 0;
  }
  for (const p of Object.values(tfStats)) {
    p.winRate = p.total ? (p.wins / p.total * 100) : 0;
  }
  
  let peak = 0, maxDd = 0, running = 0;
  const equityCurve = [];
  for (const t of trades) {
    running += t.pnl_r || 0;
    equityCurve.push({ time: t.entry_time, equity: running });
    if (running > peak) peak = running;
    const dd = peak - running;
    if (dd > maxDd) maxDd = dd;
  }
  
  return {
    total: trades.length,
    wins: wins.length,
    losses: losses.length,
    noResult: noResult.length,
    winRate: trades.length ? (wins.length / (wins.length + losses.length) * 100) : 0,
    totalR: winsR - lossesR,
    profitFactor: lossesR ? (winsR / lossesR) : (winsR > 0 ? 999 : 0),
    avgRR: trades.length ? ((winsR + lossesR) / trades.length) : 0,
    maxDrawdown: maxDd,
    pairStats,
    tfStats,
    equityCurve,
  };
}
