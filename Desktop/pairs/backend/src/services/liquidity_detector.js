import { SWEEP_LOOKBACK } from "../config.js";

export function findSwingHighs(candles, lookback = SWEEP_LOOKBACK) {
  const swings = [];
  for (let i = lookback; i < candles.length - lookback; i++) {
    let isHigh = true;
    for (let j = i - lookback; j <= i + lookback; j++) {
      if (j !== i && candles[j].high >= candles[i].high) {
        isHigh = false;
        break;
      }
    }
    if (isHigh) {
      swings.push({ index: i, time: candles[i].time, price: candles[i].high, type: "high" });
    }
  }
  return swings;
}

export function findSwingLows(candles, lookback = SWEEP_LOOKBACK) {
  const swings = [];
  for (let i = lookback; i < candles.length - lookback; i++) {
    let isLow = true;
    for (let j = i - lookback; j <= i + lookback; j++) {
      if (j !== i && candles[j].low <= candles[i].low) {
        isLow = false;
        break;
      }
    }
    if (isLow) {
      swings.push({ index: i, time: candles[i].time, price: candles[i].low, type: "low" });
    }
  }
  return swings;
}

export function detectSweeps(candles, lookback = SWEEP_LOOKBACK) {
  if (candles.length < lookback * 2 + 1) return [];

  const swingHighs = findSwingHighs(candles, lookback);
  const swingLows = findSwingLows(candles, lookback);
  const sweeps = [];

  for (let i = lookback * 2; i < candles.length; i++) {
    const candle = candles[i];

    for (const swing of swingHighs) {
      if (swing.index >= i - 1) continue;
      if (i - swing.index > 100) continue;

      const wickAbove = candle.high > swing.price;
      const closeBackInside = candle.close < swing.price;
      const bodyInsideAtOpen = candle.open < swing.price;

      if (wickAbove && closeBackInside && bodyInsideAtOpen) {
        sweeps.push({
          type: "bearish",
          index: i,
          time: candle.time,
          swingLevel: swing.price,
          sweepHigh: candle.high,
          close: candle.close,
          swingTime: swing.time,
          candlesSince: i - swing.index,
        });
        break;
      }
    }

    for (const swing of swingLows) {
      if (swing.index >= i - 1) continue;
      if (i - swing.index > 100) continue;

      const wickBelow = candle.low < swing.price;
      const closeBackInside = candle.close > swing.price;
      const bodyInsideAtOpen = candle.open > swing.price;

      if (wickBelow && closeBackInside && bodyInsideAtOpen) {
        sweeps.push({
          type: "bullish",
          index: i,
          time: candle.time,
          swingLevel: swing.price,
          sweepLow: candle.low,
          close: candle.close,
          swingTime: swing.time,
          candlesSince: i - swing.index,
        });
        break;
      }
    }
  }

  return sweeps;
}

export function getLatestSweep(candles, lookback = SWEEP_LOOKBACK) {
  const sweeps = detectSweeps(candles, lookback);
  return sweeps.length > 0 ? sweeps[sweeps.length - 1] : null;
}
