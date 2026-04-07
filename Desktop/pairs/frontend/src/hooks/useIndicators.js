import { useMemo } from "react";
import { createChart } from "lightweight-charts";
import { addIndicators, Indicator } from "lightweight-charts-indicators";

addIndicators(createChart);

const INDICATORS = {
  SMA: {
    name: "SMA",
    params: { period: 14 },
    type: "LineSeries",
    color: "#2196F3",
  },
  EMA: {
    name: "EMA", 
    params: { period: 14 },
    type: "LineSeries",
    color: "#FF9800",
  },
  RSI: {
    name: "RSI",
    params: { period: 14, upper: 70, lower: 30 },
    type: "HistogramSeries",
    color: "#9C27B0",
  },
  MACD: {
    name: "MACD",
    params: { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 },
    type: "LineSeries",
    color: "#4CAF50",
  },
  BOLLINGER: {
    name: "Bollinger Bands",
    params: { period: 20, stdDev: 2 },
    type: "LineSeries",
    color: "#E91E63",
  },
  ATR: {
    name: "ATR",
    params: { period: 14 },
    type: "HistogramSeries",
    color: "#00BCD4",
  },
};

export function useIndicators(candles, enabledIndicators = []) {
  return useMemo(() => {
    if (!candles?.length || !enabledIndicators.length) return [];

    const data = candles.map(c => ({
      time: c.time || c.timestamp,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));

    return enabledIndicators.map(name => {
      const config = INDICATORS[name];
      if (!config) return null;

      try {
        const indicator = new Indicator(config.name, config.params);
        const values = indicator.run(data, "candles");
        
        return {
          name,
          type: config.type,
          color: config.color,
          values: values.map((v, i) => ({
            time: data[i]?.time,
            value: typeof v === 'object' ? v.value : v,
          })).filter(v => v.value != null),
        };
      } catch (e) {
        console.warn(`Indicator ${name} failed:`, e);
        return null;
      }
    }).filter(Boolean);
  }, [candles, enabledIndicators.join(',')]);
}

export const AVAILABLE_INDICATORS = Object.keys(INDICATORS);
export default INDICATORS;
