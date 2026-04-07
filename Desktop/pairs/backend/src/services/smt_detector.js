import { SMT_CORRELATED } from "../config.js";
import { findSwingHighs, findSwingLows } from "./liquidity_detector.js";

const pairCandles = new Map();

export function updatePairCandles(pair, candles) {
  pairCandles.set(pair, candles);
}

export function detectSMTDivergence(pair1, pair2, lookback = 20) {
  const candles1 = pairCandles.get(pair1);
  const candles2 = pairCandles.get(pair2);

  if (!candles1 || !candles2) return null;
  if (candles1.length < lookback * 2 || candles2.length < lookback * 2) return null;

  const highs1 = findSwingHighs(candles1, lookback);
  const highs2 = findSwingHighs(candles2, lookback);
  const lows1 = findSwingLows(candles1, lookback);
  const lows2 = findSwingLows(candles2, lookback);

  if (highs1.length < 2 || highs2.length < 2) return null;

  const lastHigh1 = highs1[highs1.length - 1];
  const prevHigh1 = highs1[highs1.length - 2];
  const lastHigh2 = highs2[highs2.length - 1];
  const prevHigh2 = highs2[highs2.length - 2];

  const bullishDiv =
    lastHigh2.price > prevHigh2.price &&
    lastHigh1.price <= prevHigh1.price;

  const bearishDiv =
    lastHigh1.price > prevHigh1.price &&
    lastHigh2.price <= prevHigh2.price;

  if (lows1.length >= 2 && lows2.length >= 2) {
    const lastLow1 = lows1[lows1.length - 1];
    const prevLow1 = lows1[lows1.length - 2];
    const lastLow2 = lows2[lows2.length - 1];
    const prevLow2 = lows2[lows2.length - 2];

    const bullishLows =
      lastLow2.price < prevLow2.price &&
      lastLow1.price >= prevLow1.price;

    const bearishLows =
      lastLow1.price < prevLow1.price &&
      lastLow2.price >= prevLow2.price;

    if (bullishDiv || bullishLows) {
      return {
        type: "bullish",
        pair1,
        pair2,
        time: Math.max(lastHigh1.time, lastHigh2.time),
        detail: bullishDiv ? "highs_diverge" : "lows_diverge",
      };
    }

    if (bearishDiv || bearishLows) {
      return {
        type: "bearish",
        pair1,
        pair2,
        time: Math.max(lastHigh1.time, lastHigh2.time),
        detail: bearishDiv ? "highs_diverge" : "lows_diverge",
      };
    }
  }

  return null;
}

export function checkAllSMTDivergence() {
  const results = [];
  for (const [p1, p2] of SMT_CORRELATED) {
    const div = detectSMTDivergence(p1, p2);
    if (div) results.push(div);
  }
  return results;
}
