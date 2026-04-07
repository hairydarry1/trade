import { insertSignal } from "../db/index.js";
import { getLatestSweep } from "./liquidity_detector.js";
import { runConfirmations, getConfirmationSummary } from "./confirmation_engine.js";
import { findRecentSwingForFib } from "./fib_calculator.js";
import { getCurrentSession } from "./session_manager.js";
import { getCurrentPrice } from "./deriv_client.js";

const listeners = new Set();
const recentSignals = new Map();
const SIGNAL_COOLDOWN = 3600;

export function onSignal(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function emit(signal) {
  for (const fn of listeners) {
    try { fn(signal); } catch (e) { console.error("Signal listener error:", e); }
  }
}

export function generateSignal(pair, candles, timeframe) {
  if (!candles || candles.length < 50) return null;

  const sweep = getLatestSweep(candles);
  if (!sweep) return null;

  const lastCandle = candles[candles.length - 1];
  if (lastCandle.time - sweep.time > 3600 * 12) return null;

  const confirmationResult = runConfirmations(pair, candles, sweep);
  if (!confirmationResult.passed) return null;

  const key = `${pair}_${timeframe}_${sweep.type}`;
  const lastTime = recentSignals.get(key) || 0;
  if (lastCandle.time - lastTime < SIGNAL_COOLDOWN) return null;
  recentSignals.set(key, lastCandle.time);

  const entryPrice = lastCandle.close;
  const { stopLoss, takeProfit } = calculateSLTP(candles, sweep, entryPrice);
  const riskReward = Math.abs(takeProfit - entryPrice) / Math.abs(entryPrice - stopLoss);
  const session = getCurrentSession();

  const signal = {
    pair,
    direction: sweep.type.toUpperCase(),
    timeframe,
    entry_price: entryPrice,
    stop_loss: stopLoss,
    take_profit: takeProfit,
    risk_reward: Math.round(riskReward * 100) / 100,
    confirmations: confirmationResult.confirmations,
    confirmation_summary: getConfirmationSummary(confirmationResult),
    sweep_level: sweep.swingLevel,
    fib_level: findRecentSwingForFib(candles)?.level_79 || null,
    timestamp: lastCandle.time,
    session,
  };

  signal.id = insertSignal(signal);
  emit(signal);
  return signal;
}

function calculateSLTP(candles, sweep, entryPrice) {
  const atr = calculateATR(candles, 14);
  const pipBuffer = atr * 0.5;

  let stopLoss, takeProfit;

  if (sweep.type === "bullish") {
    const sweepLow = sweep.sweepLow || sweep.swingLevel;
    stopLoss = sweepLow - pipBuffer;
    const risk = entryPrice - stopLoss;
    takeProfit = entryPrice + risk * 2;
  } else {
    const sweepHigh = sweep.sweepHigh || sweep.swingLevel;
    stopLoss = sweepHigh + pipBuffer;
    const risk = stopLoss - entryPrice;
    takeProfit = entryPrice - risk * 2;
  }

  return { stopLoss: round5(stopLoss), takeProfit: round5(takeProfit) };
}

function calculateATR(candles, period) {
  if (candles.length < period + 1) return 0.001;
  let sum = 0;
  for (let i = candles.length - period; i < candles.length; i++) {
    const tr = Math.max(
      candles[i].high - candles[i].low,
      Math.abs(candles[i].high - candles[i - 1].close),
      Math.abs(candles[i].low - candles[i - 1].close)
    );
    sum += tr;
  }
  return sum / period;
}

function round5(n) {
  return Math.round(n * 100000) / 100000;
}

export function scanAllPairs(pairCandles, timeframes = ["1H", "4H", "D"]) {
  const signals = [];
  for (const [pair, tfMap] of Object.entries(pairCandles)) {
    for (const tf of timeframes) {
      const candles = tfMap[tf];
      if (!candles || candles.length < 50) continue;
      const signal = generateSignal(pair, candles, tf);
      if (signal) signals.push(signal);
    }
  }
  return signals;
}
