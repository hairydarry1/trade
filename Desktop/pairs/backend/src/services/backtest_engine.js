import { getCandles, insertBacktestRun, updateBacktestRun, insertBacktestTrade, getBacktestStats } from "../db/index.js";
import { FOREX_PAIRS, GRANULARITIES } from "../config.js";

const listeners = new Set();
const MAX_LOOKFORWARD_CANDLES = 48;
const SIGNAL_LOOKBACK = 50;

export function onBacktestEvent(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function emit(event, data) {
  for (const fn of listeners) {
    try { fn(event, data); } catch (e) { console.error("Backtest listener error:", e); }
  }
}

export async function runBacktest(config) {
  const {
    pairs = ["frxEURUSD", "frxGBPUSD", "frxUSDJPY", "frxAUDUSD", "frxUSDCAD"],
    timeframes = ["1H", "4H", "D"],
    startDate,
    endDate,
  } = config;

  const runId = insertBacktestRun({ pairs, timeframes, startDate, endDate });
  emit("start", { runId });

  let totalSignals = 0;
  let wins = 0;
  let losses = 0;
  let totalPnL = 0;

  for (const pair of pairs) {
    for (const tf of timeframes) {
      emit("progress", { pair, timeframe: tf, runId });
      
      const allCandles = getCandles(pair, tf, 2000);
      if (!allCandles || allCandles.length < SIGNAL_LOOKBACK + 10) continue;

      const filteredCandles = allCandles.filter(c => 
        c.timestamp >= new Date(startDate).getTime() / 1000 &&
        c.timestamp <= new Date(endDate).getTime() / 1000
      );

      if (filteredCandles.length < SIGNAL_LOOKBACK + 10) continue;

      for (let i = SIGNAL_LOOKBACK; i < filteredCandles.length - 5; i++) {
        const historicalCandles = filteredCandles.slice(0, i + 1);
        const signal = generateSignalFromCandles(historicalCandles, pair, tf);
        
        if (!signal) continue;

        totalSignals++;
        
        const simulated = simulateTrade(signal, filteredCandles.slice(i + 1));
        
        insertBacktestTrade({
          runId,
          pair: signal.pair,
          direction: signal.direction,
          timeframe: signal.timeframe,
          entryPrice: signal.entry_price,
          exitPrice: simulated.exitPrice,
          stopLoss: signal.stop_loss,
          takeProfit: signal.take_profit,
          entryTime: signal.timestamp,
          exitTime: simulated.exitTime,
          result: simulated.result,
          pnlR: simulated.pnlR,
          confirmations: signal.confirmations,
        });

        if (simulated.result === "WIN") {
          wins++;
          totalPnL += simulated.pnlR;
        } else if (simulated.result === "LOSS") {
          losses++;
          totalPnL += simulated.pnlR;
        }
      }
    }
  }

  const stats = getBacktestStats(runId);
  
  updateBacktestRun(runId, {
    status: "completed",
    total_signals: totalSignals,
    wins,
    losses,
    total_pnl: totalPnL,
    profit_factor: losses ? (stats.winsR / stats.lossesR) : (stats.winsR > 0 ? 999 : 0),
    avg_rr: stats.avgRR,
    max_drawdown: stats.maxDrawdown,
  });

  emit("complete", { runId, totalSignals, wins, losses, totalPnL });
  
  return { runId, totalSignals, wins, losses, totalPnL, stats };
}

function generateSignalFromCandles(candles, pair, timeframe) {
  if (!candles || candles.length < SIGNAL_LOOKBACK) return null;

  const sweep = findLiquiditySweep(candles);
  if (!sweep) return null;

  const lastCandle = candles[candles.length - 1];
  if (lastCandle.timestamp - sweep.timestamp > 3600 * 12) return null;

  const confirmations = checkConfirmations(candles, sweep);
  if (confirmations.length < 1) return null;

  const entryPrice = lastCandle.close;
  const atr = calculateATR(candles, 14);
  const pipBuffer = atr * 0.5;

  let stopLoss, takeProfit;
  
  if (sweep.type === "bullish") {
    stopLoss = sweep.level - pipBuffer;
    const risk = entryPrice - stopLoss;
    takeProfit = entryPrice + risk * 2;
  } else {
    stopLoss = sweep.level + pipBuffer;
    const risk = stopLoss - entryPrice;
    takeProfit = entryPrice - risk * 2;
  }

  const riskReward = Math.abs(takeProfit - entryPrice) / Math.abs(entryPrice - stopLoss);

  return {
    pair,
    direction: sweep.type === "bullish" ? "BUY" : "SELL",
    timeframe,
    entry_price: entryPrice,
    stop_loss: stopLoss,
    take_profit: takeProfit,
    risk_reward: riskReward,
    confirmations,
    timestamp: lastCandle.timestamp,
    sweep_level: sweep.level,
  };
}

function findLiquiditySweep(candles) {
  if (!candles || candles.length < 20) return null;

  const recent = candles.slice(-20);
  let lowest = Infinity;
  let highest = -Infinity;
  let lowestTime = 0;
  let highestTime = 0;

  for (let i = 1; i < recent.length; i++) {
    if (recent[i].low < lowest) {
      lowest = recent[i].low;
      lowestTime = recent[i].timestamp;
    }
    if (recent[i].high > highest) {
      highest = recent[i].high;
      highestTime = recent[i].timestamp;
    }
  }

  const lastClose = recent[recent.length - 1].close;

  if (lastClose <= lowest + (highest - lowest) * 0.1) {
    return { type: "bullish", level: lowest, timestamp: lowestTime };
  }
  if (lastClose >= highest - (highest - lowest) * 0.1) {
    return { type: "bearish", level: highest, timestamp: highestTime };
  }

  return null;
}

function checkConfirmations(candles, sweep) {
  const confirmations = [];
  const recent = candles.slice(-20);
  const currentPrice = recent[recent.length - 1].close;

  const bos = findBOS(recent, sweep);
  if (bos) confirmations.push({ type: "BOS" });

  const fvg = findFVG(recent);
  if (fvg) confirmations.push({ type: "FVG" });

  return confirmations;
}

function findBOS(candles, sweep) {
  if (!candles || candles.length < 5) return null;
  
  const recent = candles.slice(-5);
  
  if (sweep.type === "bullish") {
    for (let i = 1; i < recent.length; i++) {
      if (recent[i].close > recent[i - 1].high) return true;
    }
  } else {
    for (let i = 1; i < recent.length; i++) {
      if (recent[i].close < recent[i - 1].low) return true;
    }
  }
  
  return false;
}

function findFVG(candles) {
  if (!candles || candles.length < 3) return null;
  
  const i = candles.length - 1;
  const c0 = candles[i - 2], c1 = candles[i - 1];
  
  if (c1.low > c0.high) return { type: "bullish" };
  if (c1.high < c0.low) return { type: "bearish" };
  
  return null;
}

function calculateATR(candles, period) {
  if (candles.length < period + 1) return 0;
  
  let sum = 0;
  for (let i = candles.length - period; i < candles.length; i++) {
    const tr = Math.max(
      candles[i].high - candles[i].low,
      Math.abs(candles[i].high - (candles[i - 1]?.close || candles[i].close)),
      Math.abs(candles[i].low - (candles[i - 1]?.close || candles[i].close))
    );
    sum += tr;
  }
  
  return sum / period;
}

function simulateTrade(signal, futureCandles) {
  if (!futureCandles || futureCandles.length < 2) {
    return { exitPrice: null, exitTime: null, result: "NO_RESULT", pnlR: 0 };
  }

  for (let i = 0; i < Math.min(futureCandles.length, MAX_LOOKFORWARD_CANDLES); i++) {
    const c = futureCandles[i];
    const direction = signal.direction;

    if (direction === "BUY") {
      if (c.low <= signal.stop_loss) {
        return { exitPrice: signal.stop_loss, exitTime: c.timestamp, result: "LOSS", pnlR: -1 };
      }
      if (c.high >= signal.take_profit) {
        const rr = Math.abs(signal.take_profit - signal.entry_price) / Math.abs(signal.entry_price - signal.stop_loss);
        return { exitPrice: signal.take_profit, exitTime: c.timestamp, result: "WIN", pnlR: rr };
      }
    } else {
      if (c.high >= signal.stop_loss) {
        return { exitPrice: signal.stop_loss, exitTime: c.timestamp, result: "LOSS", pnlR: -1 };
      }
      if (c.low <= signal.take_profit) {
        const rr = Math.abs(signal.take_profit - signal.entry_price) / Math.abs(signal.entry_price - signal.stop_loss);
        return { exitPrice: signal.take_profit, exitTime: c.timestamp, result: "WIN", pnlR: rr };
      }
    }
  }

  const lastCandle = futureCandles[futureCandles.length - 1];
  return { 
    exitPrice: lastCandle.close, 
    exitTime: lastCandle.timestamp, 
    result: "NO_RESULT", 
    pnlR: (lastCandle.close - signal.entry_price) / (signal.entry_price - signal.stop_loss) 
  };
}