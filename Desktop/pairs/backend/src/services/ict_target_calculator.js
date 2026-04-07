import { ICT_CONFIG } from "../config.js";

export function calculateTargets(candles, direction, entryPrice, swingLevel = null) {
  if (!candles || candles.length < 20) return null;
  
  const recent = candles.slice(-50);
  
  const { highs, lows } = getRecentSwings(recent);
  
  let liquidityTarget = null;
  
  if (direction === "bullish") {
    const aboveEntry = highs.filter(h => h.price > entryPrice);
    if (aboveEntry.length > 0) {
      const closest = aboveEntry.reduce((prev, curr) => 
        curr.price < prev.price ? curr : prev
      );
      liquidityTarget = closest;
    }
  } else {
    const belowEntry = lows.filter(l => l.price < entryPrice);
    if (belowEntry.length > 0) {
      const closest = belowEntry.reduce((prev, curr) => 
        curr.price > prev.price ? curr : prev
      );
      liquidityTarget = closest;
    }
  }
  
  const targets = calculateTPMoveLevels(candles, direction, entryPrice, liquidityTarget);
  
  return targets;
}

export function calculateStopLoss(candles, direction, entryPrice, swingLevel = null) {
  if (!candles || candles.length < 10) return null;
  
  const recent = candles.slice(-20);
  
  const { highs, lows } = getRecentSwings(recent);
  
  let sl;
  
  if (direction === "bullish") {
    if (swingLevel && swingLevel < entryPrice) {
      sl = swingLevel - (entryPrice - swingLevel) * 0.1;
    } else {
      const low = lows.length > 0 ? lows[lows.length - 1].price : recent[0].low;
      sl = low - (entryPrice - low) * 0.1;
    }
  } else {
    if (swingLevel && swingLevel > entryPrice) {
      sl = swingLevel + (swingLevel - entryPrice) * 0.1;
    } else {
      const high = highs.length > 0 ? highs[highs.length - 1].price : recent[0].high;
      sl = high + (high - entryPrice) * 0.1;
    }
  }
  
  return sl;
}

function calculateTPMoveLevels(candles, direction, entryPrice, liquidityTarget) {
  const tpLevels = ICT_CONFIG.tpLevels;
  const targets = [];
  
  const recent = candles.slice(-30);
  let moveStart, moveEnd;
  
  if (direction === "bullish") {
    let highest = -Infinity;
    let lowest = Infinity;
    for (const c of recent) {
      if (c.high > highest) highest = c.high;
      if (c.low < lowest) lowest = c.low;
    }
    moveStart = lowest;
    moveEnd = highest;
  } else {
    let highest = -Infinity;
    let lowest = Infinity;
    for (const c of recent) {
      if (c.high > highest) highest = c.high;
      if (c.low < lowest) lowest = c.low;
    }
    moveStart = highest;
    moveEnd = lowest;
  }
  
  const totalMove = Math.abs(moveEnd - moveStart);
  
  for (const level of tpLevels) {
    let tpPrice;
    
    if (level.name === "TP3" && liquidityTarget) {
      tpPrice = liquidityTarget.price;
    } else {
      const moveDistance = totalMove * level.pctMove;
      tpPrice = direction === "bullish" 
        ? entryPrice + moveDistance 
        : entryPrice - moveDistance;
    }
    
    const risk = Math.abs(entryPrice - (direction === "bullish" 
      ? calculateStopLoss(candles, direction, entryPrice)
      : calculateStopLoss(candles, direction, entryPrice)));
    const reward = Math.abs(tpPrice - entryPrice);
    const rr = risk > 0 ? reward / risk : 0;
    
    targets.push({
      name: level.name,
      price: tpPrice,
      rr: rr,
      pctMove: level.pctMove,
    });
  }
  
  return targets;
}

function getRecentSwings(candles) {
  const highs = [];
  const lows = [];
  
  for (let i = 5; i < candles.length - 5; i++) {
    let isHigh = true;
    let isLow = true;
    
    for (let j = i - 5; j <= i + 5; j++) {
      if (j !== i) {
        if (candles[j].high >= candles[i].high) isHigh = false;
        if (candles[j].low <= candles[i].low) isLow = false;
      }
    }
    
    if (isHigh) {
      highs.push({ price: candles[i].high, time: candles[i].time, index: i });
    }
    if (isLow) {
      lows.push({ price: candles[i].low, time: candles[i].time, index: i });
    }
  }
  
  return { highs, lows };
}

export function calculateRiskReward(entry, sl, tp) {
  const risk = Math.abs(entry - sl);
  const reward = Math.abs(tp - entry);
  return risk > 0 ? reward / risk : 0;
}

export function calculateLotSize(accountBalance, riskPct, entryPrice, stopLoss, pipValue = 10) {
  const riskAmount = accountBalance * (riskPct / 100);
  const stopLossPips = Math.abs(entryPrice - stopLoss) * 100000;
  const lotSize = stopLossPips > 0 ? (riskAmount / stopLossPips) * pipValue : 0.01;
  return Math.max(0.01, Math.min(lotSize, 100));
}
