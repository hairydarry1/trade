import { findSwingHighs, findSwingLows } from "./liquidity_detector.js";

export function detectBOS(candles, lookback = 20) {
  if (candles.length < lookback * 2 + 1) return [];

  const swingHighs = findSwingHighs(candles, lookback);
  const swingLows = findSwingLows(candles, lookback);
  const bosEvents = [];

  let lastSwingHigh = null;
  let lastSwingLow = null;
  let trend = "neutral";

  for (let i = lookback * 2; i < candles.length; i++) {
    const candle = candles[i];

    for (const sh of swingHighs) {
      if (sh.index < i && sh.price > (lastSwingHigh?.price || 0)) {
        lastSwingHigh = sh;
      }
    }
    for (const sl of swingLows) {
      if (sl.index < i && sl.price < (lastSwingLow?.price || Infinity)) {
        lastSwingLow = sl;
      }
    }

    if (lastSwingHigh && candle.close > lastSwingHigh.price && trend !== "bullish") {
      trend = "bullish";
      bosEvents.push({
        type: "bullish",
        index: i,
        time: candle.time,
        breakLevel: lastSwingHigh.price,
        close: candle.close,
      });
    }

    if (lastSwingLow && candle.close < lastSwingLow.price && trend !== "bearish") {
      trend = "bearish";
      bosEvents.push({
        type: "bearish",
        index: i,
        time: candle.time,
        breakLevel: lastSwingLow.price,
        close: candle.close,
      });
    }
  }

  return bosEvents;
}

export function getLatestBOS(candles, lookback = 20) {
  const events = detectBOS(candles, lookback);
  return events.length > 0 ? events[events.length - 1] : null;
}

export function getCurrentTrend(candles, lookback = 20) {
  const events = detectBOS(candles, lookback);
  if (events.length === 0) return "neutral";
  return events[events.length - 1].type;
}
