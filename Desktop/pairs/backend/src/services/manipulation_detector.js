import { ICT_CONFIG } from "../config.js";

export function detectManipulation(candles, sweepTime, waitMinutes = null) {
  const wait = waitMinutes || ICT_CONFIG.manipulationWaitMinutes;
  
  const sweepIndex = candles.findIndex(c => c.time >= sweepTime);
  if (sweepIndex === -1) return null;
  
  const waitEndTime = sweepTime + (wait * 60);
  
  const manipulationCandles = candles.filter(c => 
    c.time > sweepTime && c.time <= waitEndTime
  );
  
  if (manipulationCandles.length === 0) return null;
  
  for (const candle of manipulationCandles) {
    if (isManipulationCandle(candle, candles, sweepIndex)) {
      return {
        detected: true,
        time: candle.time,
        candle,
        waitMinutes: wait,
      };
    }
  }
  
  return {
    detected: false,
    waitMinutes: wait,
    nextCheck: waitEndTime,
  };
}

export function isManipulationCandle(candle, allCandles, sweepIndex) {
  if (sweepIndex < 2) return false;
  
  const prev1 = allCandles[sweepIndex - 1];
  const prev2 = allCandles[sweepIndex - 2];
  
  if (!prev1 || !prev2) return false;
  
  const wickAbovePrev = candle.high > prev1.high && candle.high > prev2.high;
  const closesNearLow = candle.close < (candle.high + candle.low) / 2;
  
  const bodySize = Math.abs(candle.close - candle.open);
  const wickSize = candle.high - Math.max(candle.open, candle.close);
  const isLongWick = wickSize > bodySize * 2;
  
  return wickAbovePrev && closesNearLow && isLongWick;
}

export function checkForManipulationEntry(candles, sweepTime, direction) {
  const manip = detectManipulation(candles, sweepTime);
  if (!manip || !manip.detected) {
    return {
      needsManipulation: true,
      manipulation: manip,
    };
  }
  
  const recentCandles = candles.slice(-10);
  const postManip = recentCandles.filter(c => c.time > manip.time);
  
  if (postManip.length < 2) {
    return { needsManipulation: false, ready: false };
  }
  
  const lastCandle = postManip[postManip.length - 1];
  const confirmCandle = postManip[postManip.length - 2];
  
  if (direction === "bullish") {
    if (lastCandle.close > confirmCandle.close && lastCandle.close > lastCandle.open) {
      return { needsManipulation: false, ready: true, entryCandle: lastCandle };
    }
  } else {
    if (lastCandle.close < confirmCandle.close && lastCandle.close < lastCandle.open) {
      return { needsManipulation: false, ready: true, entryCandle: lastCandle };
    }
  }
  
  return { needsManipulation: false, ready: false };
}

export function getManipulationWaitEnd(sweepTime) {
  const wait = ICT_CONFIG.manipulationWaitMinutes;
  return sweepTime + (wait * 60);
}
