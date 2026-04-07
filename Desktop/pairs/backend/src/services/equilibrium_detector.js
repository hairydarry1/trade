export function detectEquilibrium(candles, lookback = 50) {
  if (candles.length < lookback) return null;
  
  const recent = candles.slice(-lookback);
  
  let highest = -Infinity;
  let highestIdx = 0;
  let lowest = Infinity;
  let lowestIdx = 0;
  
  for (let i = 0; i < recent.length; i++) {
    if (recent[i].high > highest) {
      highest = recent[i].high;
      highestIdx = i;
    }
    if (recent[i].low < lowest) {
      lowest = recent[i].low;
      lowestIdx = i;
    }
  }
  
  if (highest === -Infinity || lowest === Infinity) return null;
  
  const moveRange = highest - lowest;
  const midPoint = lowest + (moveRange / 2);
  
  const currentPrice = recent[recent.length - 1].close;
  const distanceFromMid = Math.abs(currentPrice - midPoint);
  const tolerance = moveRange * 0.02;
  
  const nearMid = distanceFromMid <= tolerance;
  
  const swingHighs = findSwingPoints(recent, "high", 5);
  const swingLows = findSwingPoints(recent, "low", 5);
  
  const eqFromHighs = swingHighs.find(sh => Math.abs(sh.price - midPoint) <= tolerance);
  const eqFromLows = swingLows.find(sl => Math.abs(sl.price - midPoint) <= tolerance);
  
  return {
    midPoint,
    currentPrice,
    distanceFromMid,
    nearMid,
    swingHighs,
    swingLows,
    range: moveRange,
    source: eqFromHighs ? "highs" : eqFromLows ? "lows" : "calculated",
  };
}

export function isPriceAtEquilibrium(price, eq) {
  if (!eq) return false;
  const tolerance = eq.range * 0.02;
  return Math.abs(price - eq.midPoint) <= tolerance;
}

export function getEquilibriumTarget(candles, direction, eq) {
  if (!eq) return null;
  
  const recent = candles.slice(-20);
  const currentPrice = recent[recent.length - 1].close;
  
  let targetPrice;
  
  if (direction === "bullish") {
    let highestAfter = -Infinity;
    for (const c of recent) {
      if (c.high > highestAfter) highestAfter = c.high;
    }
    targetPrice = highestAfter;
  } else {
    let lowestAfter = Infinity;
    for (const c of recent) {
      if (c.low < lowestAfter) lowestAfter = c.low;
    }
    targetPrice = lowestAfter;
  }
  
  return {
    target: targetPrice,
    fromEquilibrium: eq.midPoint,
    distance: targetPrice - currentPrice,
  };
}

function findSwingPoints(candles, pointType, lookback) {
  const points = [];
  
  for (let i = lookback; i < candles.length - lookback; i++) {
    let isSwing = true;
    
    for (let j = i - lookback; j <= i + lookback; j++) {
      if (j !== i) {
        if (pointType === "high") {
          if (candles[j].high >= candles[i].high) {
            isSwing = false;
            break;
          }
        } else {
          if (candles[j].low <= candles[i].low) {
            isSwing = false;
            break;
          }
        }
      }
    }
    
    if (isSwing) {
      points.push({
        price: candles[i][pointType],
        time: candles[i].time,
        index: i,
      });
    }
  }
  
  return points;
}

export function calculateEquilibriumMove(candles, direction) {
  const eq = detectEquilibrium(candles);
  if (!eq) return null;
  
  const recent = candles.slice(-30);
  const startCandle = recent[0];
  const endCandle = recent[recent.length - 1];
  
  let startPrice, endPrice;
  
  if (direction === "bullish") {
    startPrice = startCandle.low;
    endPrice = endCandle.close;
  } else {
    startPrice = startCandle.high;
    endPrice = endCandle.close;
  }
  
  const moveSize = Math.abs(endPrice - startPrice);
  const eqTarget = eq.midPoint + (direction === "bullish" ? moveSize : -moveSize);
  
  return {
    startPrice,
    endPrice,
    moveSize,
    eqTarget,
    midpoint: eq.midPoint,
  };
}
