export function detectCandlePatterns(candles) {
  if (candles.length < 3) return [];
  const patterns = [];

  for (let i = 2; i < candles.length; i++) {
    const c = candles[i];
    const prev = candles[i - 1];
    const body = Math.abs(c.close - c.open);
    const range = c.high - c.low;
    if (range === 0) continue;

    const upperWick = c.high - Math.max(c.close, c.open);
    const lowerWick = Math.min(c.close, c.open) - c.low;

    if (lowerWick > body * 2 && upperWick < body * 0.5 && body > 0) {
      patterns.push({ pattern: "hammer", direction: "bullish", index: i, time: c.time });
    }

    if (upperWick > body * 2 && lowerWick < body * 0.5 && body > 0) {
      patterns.push({ pattern: "shooting_star", direction: "bearish", index: i, time: c.time });
    }

    const prevBody = Math.abs(prev.close - prev.open);
    if (prevBody > 0 && body > 0) {
      if (prev.close < prev.open && c.close > c.open &&
          c.close > prev.open && c.open < prev.close) {
        patterns.push({ pattern: "bullish_engulfing", direction: "bullish", index: i, time: c.time });
      }
      if (prev.close > prev.open && c.close < c.open &&
          c.close < prev.open && c.open > prev.close) {
        patterns.push({ pattern: "bearish_engulfing", direction: "bearish", index: i, time: c.time });
      }
    }

    if (body / range < 0.1) {
      const dir = c.close >= c.open ? "bullish" : "bearish";
      patterns.push({ pattern: "doji", direction: dir, index: i, time: c.time });
    }
  }

  return patterns.slice(-5);
}
