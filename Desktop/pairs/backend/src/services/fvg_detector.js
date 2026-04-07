export function detectFVG(candles) {
  if (candles.length < 3) return [];
  const fvgs = [];

  for (let i = 2; i < candles.length; i++) {
    const c1 = candles[i - 2];
    const c2 = candles[i - 1];
    const c3 = candles[i];

    if (c1.high < c3.low) {
      fvgs.push({
        type: "bullish",
        index: i,
        time: c3.time,
        top: c3.low,
        bottom: c1.high,
        mid: (c3.low + c1.high) / 2,
        gapSize: c3.low - c1.high,
      });
    }

    if (c1.low > c3.high) {
      fvgs.push({
        type: "bearish",
        index: i,
        time: c3.time,
        top: c1.low,
        bottom: c3.high,
        mid: (c1.low + c3.high) / 2,
        gapSize: c1.low - c3.high,
      });
    }
  }

  return fvgs;
}

export function getLatestFVG(candles) {
  const fvgs = detectFVG(candles);
  return fvgs.length > 0 ? fvgs[fvgs.length - 1] : null;
}

export function isPriceInFVG(price, fvg) {
  if (!fvg) return false;
  return price >= fvg.bottom && price <= fvg.top;
}

export function getOpenFVGs(candles, currentPrice, lookback = 50) {
  const fvgs = detectFVG(candles);
  const recent = fvgs.slice(-lookback);
  return recent.filter(fvg => {
    if (fvg.type === "bullish") return currentPrice > fvg.bottom;
    if (fvg.type === "bearish") return currentPrice < fvg.top;
    return false;
  });
}
