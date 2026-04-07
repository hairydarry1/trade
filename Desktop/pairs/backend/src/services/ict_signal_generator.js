import { insertICTSignal, updateICTSignalStatus } from "../db/index.js";
import { runICTConfirmations, getConfirmationSummary } from "./ict_confirmation_engine.js";
import { calculateTargets, calculateStopLoss } from "./ict_target_calculator.js";
import { getCurrentPrice } from "./deriv_client.js";
import { ICT_CONFIG } from "../config.js";

const listeners = new Set();
const recentSignals = new Map();
const SIGNAL_COOLDOWN = 3600;

export function onICTSignal(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function emit(signal) {
  for (const fn of listeners) {
    try { fn(signal); } catch (e) { console.error("ICT Signal listener error:", e); }
  }
}

export function generateICTSignal(pair, candles, timezone, accountType = "demo") {
  if (!candles || candles.length < 50) return null;

  const result = runICTConfirmations(candles, timezone);
  
  if (!result.passed) {
    return {
      ...result,
      pair,
      timezone,
      accountType,
    };
  }

  const summary = getConfirmationSummary(result);
  const entryPrice = candles[candles.length - 1].close;
  const direction = result.direction;
  
  const swingLevel = direction === "bullish" 
    ? result.sweep.sessionLevels?.sessionLow?.price 
    : result.sweep.sessionLevels?.sessionHigh?.price;

  const stopLoss = calculateStopLoss(candles, direction, entryPrice, swingLevel);
  const targets = calculateTargets(candles, direction, entryPrice, swingLevel);
  
  if (!stopLoss || !targets) return null;

  const takeProfit = targets[0]?.price || entryPrice;
  const riskReward = calculateRR(entryPrice, stopLoss, takeProfit);

  const key = `${pair}_${timezone}_${direction}`;
  const lastTime = recentSignals.get(key) || 0;
  const lastCandle = candles[candles.length - 1];
  
  if (lastCandle.time - lastTime < SIGNAL_COOLDOWN) return null;
  recentSignals.set(key, lastCandle.time);

  const signal = {
    pair,
    direction: direction.toUpperCase(),
    timeframe: "ICT",
    entry_price: entryPrice,
    stop_loss: stopLoss,
    take_profit: takeProfit,
    risk_reward: riskReward,
    targets: targets,
    confirmations: summary,
    sweep_level: swingLevel,
    fib_level: null,
    timezone,
    accountType,
    execution_mode: "alert",
    status: "active",
    stage: 5,
    timestamp: Date.now(),
  };

  const id = insertICTSignal(signal);
  signal.id = id;

  emit(signal);

  return signal;
}

export function scanICTSignal(pair, candles, timezone, accountType = "demo") {
  if (!candles || candles.length < 50) {
    return { signal: null, stage: 0, reason: "Insufficient data" };
  }

  const result = runICTConfirmations(candles, timezone);

  if (!result.passed) {
    return {
      signal: null,
      stage: result.stage,
      reason: result.reason,
      details: result,
    };
  }

  const summary = getConfirmationSummary(result);
  const entryPrice = candles[candles.length - 1].close;
  const direction = result.direction;
  
  const swingLevel = direction === "bullish" 
    ? result.sweep.sessionLevels?.sessionLow?.price 
    : result.sweep.sessionLevels?.sessionHigh?.price;

  const stopLoss = calculateStopLoss(candles, direction, entryPrice, swingLevel);
  const targets = calculateTargets(candles, direction, entryPrice, swingLevel);
  
  if (!stopLoss || !targets) {
    return { signal: null, stage: 5, reason: "Could not calculate targets" };
  }

  const takeProfit = targets[0]?.price || entryPrice;
  const riskReward = calculateRR(entryPrice, stopLoss, takeProfit);

  const signal = {
    pair,
    direction: direction.toUpperCase(),
    timeframe: "ICT",
    entry_price: entryPrice,
    stop_loss: stopLoss,
    take_profit: takeProfit,
    risk_reward: riskReward,
    targets: targets,
    confirmations: summary,
    sweep_level: swingLevel,
    fib_level: null,
    timezone,
    accountType,
    execution_mode: "alert",
    status: "active",
    stage: 5,
    timestamp: Date.now(),
  };

  return {
    signal,
    stage: 5,
    passed: true,
    confirmations: summary,
  };
}

function calculateRR(entry, sl, tp) {
  const risk = Math.abs(entry - sl);
  const reward = Math.abs(tp - entry);
  return risk > 0 ? reward / risk : 0;
}

export function getActiveICTSignals(accountType = null) {
  return []; 
}
