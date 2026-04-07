import { FIB_LEVEL, FIB_TOLERANCE } from "../config.js";

export function calculateFibRetracement(swingHigh, swingLow) {
  const range = swingHigh - swingLow;
  return {
    level_0: swingHigh,
    level_236: swingHigh - range * 0.236,
    level_382: swingHigh - range * 0.382,
    level_50: swingHigh - range * 0.5,
    level_618: swingHigh - range * 0.618,
    level_79: swingHigh - range * FIB_LEVEL,
    level_786: swingHigh - range * 0.786,
    level_100: swingLow,
  };
}

export function calculateFibFromMove(startPrice, endPrice) {
  const high = Math.max(startPrice, endPrice);
  const low = Math.min(startPrice, endPrice);
  return calculateFibRetracement(high, low);
}

export function isPriceNear79Fib(price, fibLevels) {
  if (!fibLevels || !fibLevels.level_79) return false;
  const tolerance = fibLevels.level_79 * FIB_TOLERANCE;
  return Math.abs(price - fibLevels.level_79) <= tolerance;
}

export function findRecentSwingForFib(candles, lookback = 50) {
  if (candles.length < lookback) return null;

  const recent = candles.slice(-lookback);
  let highest = -Infinity;
  let lowest = Infinity;
  let highIdx = 0;
  let lowIdx = 0;

  for (let i = 0; i < recent.length; i++) {
    if (recent[i].high > highest) { highest = recent[i].high; highIdx = i; }
    if (recent[i].low < lowest) { lowest = recent[i].low; lowIdx = i; }
  }

  if (highIdx > lowIdx) {
    return calculateFibRetracement(highest, lowest);
  } else {
    const fib = calculateFibRetracement(highest, lowest);
    return fib;
  }
}

export function getFibLevelAtPrice(price, candles, lookback = 50) {
  const fib = findRecentSwingForFib(candles, lookback);
  if (!fib) return null;
  return {
    levels: fib,
    near79: isPriceNear79Fib(price, fib),
    distanceFrom79: Math.abs(price - fib.level_79),
    pctDistance: Math.abs(price - fib.level_79) / fib.level_79,
  };
}
