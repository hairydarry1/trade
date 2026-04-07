import { Router } from "express";
import { FOREX_PAIRS, PAIR_DISPLAY, GRANULARITIES } from "../config.js";
import { getCandles, getSignals, getTrades, getAnalytics, insertTrade, updateTradeResult, getBacktestRuns, getBacktestRun, getBacktestTrades, getBacktestStats } from "../db/index.js";
import { getSessionInfo } from "../services/session_manager.js";
import { getRiskStatus, resetDaily } from "../services/risk_manager.js";
import { isConnected } from "../services/deriv_client.js";
import { generateSignal } from "../services/signal_generator.js";
import { scanLimiter, tradeLimiter } from "../middleware/rateLimiter.js";
import { runBacktest } from "../services/backtest_engine.js";

const router = Router();

const isValidPair = (pair) => FOREX_PAIRS.includes(pair);
const isValidTimeframe = (tf) => Object.keys(GRANULARITIES).includes(tf);

const validateNumbers = (obj, fields) => {
  for (const [field, value] of Object.entries(obj)) {
    if (fields.includes(field) && (typeof value !== 'number' || value <= 0 || !isFinite(value))) {
      return false;
    }
  }
  return true;
};

router.get("/pairs", (req, res) => {
  const pairs = FOREX_PAIRS.map(s => ({
    symbol: s,
    display: PAIR_DISPLAY[s] || s,
    enabled: true,
  }));
  res.json(pairs);
});

router.get("/candles/:pair/:timeframe", (req, res) => {
  const { pair, timeframe } = req.params;
  const limit = parseInt(req.query.limit) || 500;
  if (!isValidPair(pair)) {
    return res.status(400).json({ error: "Invalid pair. Allowed: " + FOREX_PAIRS.join(", ") });
  }
  if (!isValidTimeframe(timeframe)) {
    return res.status(400).json({ error: "Invalid timeframe. Use: " + Object.keys(GRANULARITIES).join(", ") });
  }
  const candles = getCandles(pair, timeframe, limit);
  res.json({ pair, timeframe, candles });
});

router.get("/signals", (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  const signals = getSignals(limit);
  res.json(signals);
});

router.post("/signals/scan", scanLimiter, (req, res) => {
  const { pair, timeframe } = req.body;
  if (!pair || !timeframe) {
    return res.status(400).json({ error: "pair and timeframe required" });
  }
  if (!isValidPair(pair)) {
    return res.status(400).json({ error: "Invalid pair" });
  }
  if (!isValidTimeframe(timeframe)) {
    return res.status(400).json({ error: "Invalid timeframe" });
  }
  const candles = getCandles(pair, timeframe, 500);
  const signal = generateSignal(pair, candles, timeframe);
  res.json({ signal, candlesCount: candles.length });
});

router.get("/trades", (req, res) => {
  const limit = parseInt(req.query.limit) || 100;
  res.json(getTrades(limit));
});

router.post("/trades", tradeLimiter, (req, res) => {
  const { signal_id, pair, direction, entry_price, stop_loss, take_profit, lot_size, session } = req.body;
  if (!pair || !direction || !entry_price || !stop_loss || !take_profit) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  if (!isValidPair(pair)) {
    return res.status(400).json({ error: "Invalid pair" });
  }
  if (!['BUY', 'SELL'].includes(direction)) {
    return res.status(400).json({ error: "Direction must be BUY or SELL" });
  }
  const numEntry = Number(entry_price);
  const numSL = Number(stop_loss);
  const numTP = Number(take_profit);
  const numLot = lot_size ? Number(lot_size) : 0.01;
  
  if (!validateNumbers({ entry_price: numEntry, stop_loss: numSL, take_profit: numTP, lot_size: numLot }, ['entry_price', 'stop_loss', 'take_profit', 'lot_size'])) {
    return res.status(400).json({ error: "Invalid numeric values: must be positive numbers" });
  }
  
  if (direction === 'BUY' && (numSL >= numEntry || numEntry >= numTP)) {
    return res.status(400).json({ error: "For BUY: SL < Entry < TP" });
  }
  if (direction === 'SELL' && (numSL <= numEntry || numEntry <= numTP)) {
    return res.status(400).json({ error: "For SELL: TP < Entry < SL" });
  }
  
  try {
    const trade = {
      pair: String(pair),
      direction: String(direction),
      entry_price: numEntry,
      stop_loss: numSL,
      take_profit: numTP,
      lot_size: numLot,
      opened_at: new Date().toISOString(),
    };
    if (signal_id) trade.signal_id = Number(signal_id);
    if (session) trade.session = String(session);
    insertTrade(trade);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.patch("/trades/:id", (req, res) => {
  const { result, pnl, exit_price } = req.body;
  const id = parseInt(req.params.id);
  if (!id || !result) {
    return res.status(400).json({ error: "Missing id or result" });
  }
  try {
    updateTradeResult(id, result, Number(pnl) || 0, exit_price ? Number(exit_price) : null);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/analytics", (req, res) => {
  res.json(getAnalytics());
});

router.get("/session", (req, res) => {
  res.json(getSessionInfo());
});

router.get("/risk", (req, res) => {
  res.json(getRiskStatus());
});

router.post("/risk/reset", (req, res) => {
  resetDaily();
  res.json({ success: true });
});

router.get("/status", (req, res) => {
  res.json({
    connected: isConnected(),
    pairs: FOREX_PAIRS.length,
    timeframes: Object.keys(GRANULARITIES),
  });
});

router.get("/timeframes", (req, res) => {
  res.json(GRANULARITIES);
});

router.get("/backtest/runs", (req, res) => {
  const runs = getBacktestRuns(20);
  res.json(runs);
});

router.get("/backtest/runs/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const run = getBacktestRun(id);
  if (!run) return res.status(404).json({ error: "Run not found" });
  const trades = getBacktestTrades(id);
  const stats = getBacktestStats(id);
  res.json({ run, trades, stats });
});

router.get("/backtest/stats/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const stats = getBacktestStats(id);
  if (!stats) return res.status(404).json({ error: "Stats not found" });
  res.json(stats);
});

router.get("/backtest/export/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const run = getBacktestRun(id);
  if (!run) return res.status(404).json({ error: "Run not found" });
  const trades = getBacktestTrades(id);
  
  const headers = ["ID", "Pair", "Direction", "Timeframe", "Entry Price", "Exit Price", "Stop Loss", "Take Profit", "Entry Time", "Exit Time", "Result", "PnL (R)"];
  const rows = trades.map(t => [
    t.id, t.pair, t.direction, t.timeframe, t.entry_price, t.exit_price, t.stop_loss, t.take_profit, t.entry_time, t.exit_time, t.result, t.pnl_r
  ]);
  
  const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
  
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename=backtest_${id}.csv`);
  res.send(csv);
});

router.post("/backtest/run", async (req, res) => {
  const { pairs, timeframes, startDate, endDate } = req.body;
  
  if (!startDate || !endDate) {
    return res.status(400).json({ error: "startDate and endDate required" });
  }
  
  const defaultPairs = ["frxEURUSD", "frxGBPUSD", "frxUSDJPY", "frxAUDUSD", "frxUSDCAD"];
  const defaultTfs = ["1H", "4H", "D"];
  
  try {
    const result = await runBacktest({
      pairs: pairs || defaultPairs,
      timeframes: timeframes || defaultTfs,
      startDate,
      endDate,
    });
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
