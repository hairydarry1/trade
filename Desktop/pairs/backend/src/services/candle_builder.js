import { getCandles, insertCandle } from "../db/index.js";

const TIMEFRAME_SECONDS = {
  "1M": 60, "5M": 300, "15M": 900,
  "1H": 3600, "4H": 14400, "D": 86400,
};

export function buildCandlesFromTicks(ticks, granularitySec) {
  if (!ticks.length) return [];
  const buckets = new Map();

  for (const tick of ticks) {
    const bucketTime = Math.floor(tick.time / granularitySec) * granularitySec;
    if (!buckets.has(bucketTime)) {
      buckets.set(bucketTime, {
        time: bucketTime,
        open: tick.price,
        high: tick.price,
        low: tick.price,
        close: tick.price,
        volume: 1,
      });
    } else {
      const c = buckets.get(bucketTime);
      c.high = Math.max(c.high, tick.price);
      c.low = Math.min(c.low, tick.price);
      c.close = tick.price;
      c.volume++;
    }
  }

  return Array.from(buckets.values()).sort((a, b) => a.time - b.time);
}

export function aggregateHigherTimeframe(sourceCandles, targetTf) {
  const targetSec = TIMEFRAME_SECONDS[targetTf];
  if (!targetSec || !sourceCandles.length) return [];

  const buckets = new Map();

  for (const c of sourceCandles) {
    const bucketTime = Math.floor(c.timestamp / targetSec) * targetSec;
    if (!buckets.has(bucketTime)) {
      buckets.set(bucketTime, {
        time: bucketTime,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
        volume: c.volume || 0,
      });
    } else {
      const b = buckets.get(bucketTime);
      b.high = Math.max(b.high, c.high);
      b.low = Math.min(b.low, c.low);
      b.close = c.close;
      b.volume += c.volume || 0;
    }
  }

  return Array.from(buckets.values()).sort((a, b) => a.time - b.time);
}

export function candlesToOHLC(candles) {
  return candles.map(c => ({
    time: c.time || c.timestamp,
    open: c.open,
    high: c.high,
    low: c.low,
    close: c.close,
    volume: c.volume || 0,
  }));
}
