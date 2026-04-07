import { TIMEZONES } from "../config.js";

export function getTimezoneOffset(timezone) {
  const tz = TIMEZONES[timezone];
  if (!tz) return 0;
  
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const tzTime = new Date(utc + (tz.offset * 3600000));
  return tz.offset;
}

export function getLocalTime(timezone) {
  const offset = getTimezoneOffset(timezone);
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  return new Date(utc + (offset * 3600000));
}

export function getLocalHour(timezone) {
  const localTime = getLocalTime(timezone);
  return localTime.getHours() + localTime.getMinutes() / 60;
}

export function getLocalDate(timezone) {
  const localTime = getLocalTime(timezone);
  return localTime.toISOString().split('T')[0];
}

export function isPremarket(timezone) {
  const tz = TIMEZONES[timezone];
  if (!tz) return false;
  const hour = getLocalHour(timezone);
  return hour >= tz.premarketStart && hour < tz.premarketEnd;
}

export function isRegularSession(timezone) {
  const tz = TIMEZONES[timezone];
  if (!tz) return false;
  const hour = getLocalHour(timezone);
  return hour >= tz.premarketEnd && hour < 21;
}

export function getCurrentSessionForTimezone(timezone) {
  const hour = getLocalHour(timezone);
  
  if (hour >= 0 && hour < 6) return "asian";
  if (hour >= 6 && hour < 9) return "premarket";
  if (hour >= 9 && hour < 13) return "london";
  if (hour >= 13 && hour < 21) return "ny";
  return "after-hours";
}

export function getSessionHighs(candles, timezone, sessionType = "all") {
  const tz = TIMEZONES[timezone];
  if (!tz || !candles.length) return [];
  
  const sessionCandles = filterCandlesBySession(candles, timezone, sessionType);
  if (sessionCandles.length < 2) return [];
  
  let highest = -Infinity;
  let highestTime = null;
  
  for (const c of sessionCandles) {
    if (c.high > highest) {
      highest = c.high;
      highestTime = c.time;
    }
  }
  
  return highest > -Infinity ? { price: highest, time: highestTime } : null;
}

export function getSessionLows(candles, timezone, sessionType = "all") {
  const tz = TIMEZONES[timezone];
  if (!tz || !candles.length) return null;
  
  const sessionCandles = filterCandlesBySession(candles, timezone, sessionType);
  if (sessionCandles.length < 2) return null;
  
  let lowest = Infinity;
  let lowestTime = null;
  
  for (const c of sessionCandles) {
    if (c.low < lowest) {
      lowest = c.low;
      lowestTime = c.time;
    }
  }
  
  return lowest < Infinity ? { price: lowest, time: lowestTime } : null;
}

export function get1HHighs(candles, lookback = 20) {
  if (candles.length < lookback) return [];
  
  const highs = [];
  for (let i = lookback; i < candles.length - 1; i++) {
    const current = candles[i];
    const next = candles[i + 1];
    if (current.time - candles[i - lookback].time >= 3600) {
      if (current.high > candles[i - lookback].high) {
        let isHigh = true;
        for (let j = i - lookback; j <= i; j++) {
          if (candles[j].high > current.high) {
            isHigh = false;
            break;
          }
        }
        if (isHigh) {
          highs.push({ price: current.high, time: current.time, index: i });
        }
      }
    }
  }
  return highs;
}

export function get4HHighs(candles, lookback = 10) {
  if (candles.length < lookback) return [];
  
  const highs = [];
  for (let i = lookback; i < candles.length - 1; i++) {
    const current = candles[i];
    if (current.time - candles[i - lookback].time >= 14400) {
      if (current.high > candles[i - lookback].high) {
        let isHigh = true;
        for (let j = i - lookback; j <= i; j++) {
          if (candles[j].high > current.high) {
            isHigh = false;
            break;
          }
        }
        if (isHigh) {
          highs.push({ price: current.high, time: current.time, index: i });
        }
      }
    }
  }
  return highs;
}

export function get1HLows(candles, lookback = 20) {
  if (candles.length < lookback) return [];
  
  const lows = [];
  for (let i = lookback; i < candles.length - 1; i++) {
    const current = candles[i];
    if (current.time - candles[i - lookback].time >= 3600) {
      if (current.low < candles[i - lookback].low) {
        let isLow = true;
        for (let j = i - lookback; j <= i; j++) {
          if (candles[j].low < current.low) {
            isLow = false;
            break;
          }
        }
        if (isLow) {
          lows.push({ price: current.low, time: current.time, index: i });
        }
      }
    }
  }
  return lows;
}

export function get4HLows(candles, lookback = 10) {
  if (candles.length < lookback) return [];
  
  const lows = [];
  for (let i = lookback; i < candles.length - 1; i++) {
    const current = candles[i];
    if (current.time - candles[i - lookback].time >= 14400) {
      if (current.low < candles[i - lookback].low) {
        let isLow = true;
        for (let j = i - lookback; j <= i; j++) {
          if (candles[j].low < current.low) {
            isLow = false;
            break;
          }
        }
        if (isLow) {
          lows.push({ price: current.low, time: current.time, index: i });
        }
      }
    }
  }
  return lows;
}

export function getLiquidityLevels(candles, lookback = 50) {
  if (candles.length < lookback) return { highs: [], lows: [] };
  
  const recent = candles.slice(-lookback);
  const highs = [];
  const lows = [];
  
  for (let i = 5; i < recent.length - 5; i++) {
    let isHigh = true;
    let isLow = true;
    
    for (let j = i - 5; j <= i + 5; j++) {
      if (j !== i) {
        if (recent[j].high >= recent[i].high) isHigh = false;
        if (recent[j].low <= recent[i].low) isLow = false;
      }
    }
    
    if (isHigh) {
      highs.push({ price: recent[i].high, time: recent[i].time, index: candles.length - lookback + i });
    }
    if (isLow) {
      lows.push({ price: recent[i].low, time: recent[i].time, index: candles.length - lookback + i });
    }
  }
  
  return { highs, lows };
}

function filterCandlesBySession(candles, timezone, sessionType) {
  if (sessionType === "all") return candles;
  
  const offset = getTimezoneOffset(timezone);
  return candles.filter(c => {
    const candleTime = new Date(c.time * 1000);
    const utc = candleTime.getTime() + (candleTime.getTimezoneOffset() * 60000);
    const localTime = new Date(utc + (offset * 3600000));
    const hour = localTime.getHours();
    
    switch (sessionType) {
      case "asian": return hour >= 0 && hour < 9;
      case "london": return hour >= 8 && hour < 17;
      case "ny": return hour >= 13 && hour < 21;
      case "premarket": return hour >= 6 && hour < 9;
      default: return true;
    }
  });
}

export function getAllSessionLevels(candles, timezone) {
  const tz = TIMEZONES[timezone];
  if (!tz) return null;
  
  const sessionHighs = getSessionHighs(candles, timezone, "all");
  const sessionLows = getSessionLows(candles, timezone, "all");
  const oneHHighs = get1HHighs(candles);
  const oneHLows = get1HLows(candles);
  const fourHHighs = get4HHighs(candles);
  const fourHLows = get4HLows(candles);
  const liquidity = getLiquidityLevels(candles);
  
  return {
    sessionHigh: sessionHighs,
    sessionLow: sessionLows,
    oneHHighs,
    oneHLows,
    fourHHighs,
    fourHLows,
    liquidityHighs: liquidity.highs,
    liquidityLows: liquidity.lows,
    currentSession: getCurrentSessionForTimezone(timezone),
    isPremarket: isPremarket(timezone),
  };
}
