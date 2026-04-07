import { config } from "../config.js";
import { getTrades, getAnalytics } from "../db/index.js";

let dailyPnl = 0;
let accountBalance = 10000;
let isLocked = false;

export function setBalance(balance) {
  accountBalance = balance;
}

export function getBalance() {
  return accountBalance;
}

export function checkDailyLimits() {
  const today = new Date().toISOString().split("T")[0];
  const trades = getTrades(200);
  const todayTrades = trades.filter(t => t.opened_at && t.opened_at.startsWith(today));

  dailyPnl = todayTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
  const maxLoss = accountBalance * (config.maxDailyLossPct / 100);

  if (dailyPnl <= -maxLoss) {
    isLocked = true;
  }

  return {
    dailyPnl,
    maxLoss,
    isLocked,
    tradesToday: todayTrades.length,
    remainingRisk: maxLoss + dailyPnl,
  };
}

export function canTrade() {
  const limits = checkDailyLimits();
  return !limits.isLocked;
}

export function calculateLotSize(entryPrice, stopLoss, riskPctOverride) {
  const riskPct = riskPctOverride || config.riskPct;
  const riskAmount = accountBalance * (riskPct / 100);
  const stopDistance = Math.abs(entryPrice - stopLoss);
  if (stopDistance === 0) return 0.01;

  const pipValue = getPipValue(entryPrice);
  const lotSize = riskAmount / (stopDistance / pipValue * 10);

  return Math.max(0.01, Math.round(lotSize * 100) / 100);
}

function getPipValue(price) {
  if (price > 100) return 0.01;
  return 0.0001;
}

export function enforceStopLoss(signal) {
  if (!signal || !signal.stop_loss) return false;
  const risk = Math.abs(signal.entry_price - signal.stop_loss);
  const maxRisk = accountBalance * (config.maxDailyLossPct / 100) / config.maxOpenTrades;
  return risk <= maxRisk * 10;
}

export function resetDaily() {
  dailyPnl = 0;
  isLocked = false;
}

export function getRiskStatus() {
  const limits = checkDailyLimits();
  return {
    balance: accountBalance,
    dailyPnl: limits.dailyPnl,
    maxDailyLoss: limits.maxLoss,
    isLocked: limits.isLocked,
    riskPct: config.riskPct,
    maxOpenTrades: config.maxOpenTrades,
    remainingRisk: limits.remainingRisk,
  };
}
