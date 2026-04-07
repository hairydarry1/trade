import React, { useEffect, useRef, useMemo, useState } from "react";
import { createChart } from "lightweight-charts";

export default function CandleChart({ 
  candles, 
  pair, 
  timeframe, 
  livePrice, 
  signal, 
  candleUpdate,
  indicators = [],
  showIndicatorPanel = true
}) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef(null);
  const indicatorSeriesRef = useRef({});
  const prevPairTf = useRef({ pair: null, tf: null });
  const initialLoadDone = useRef(false);

  const AVAILABLE_INDICATORS = [
    { id: 'SMA', name: 'SMA (14)', color: '#2196F3' },
    { id: 'EMA', name: 'EMA (14)', color: '#FF9800' },
    { id: 'RSI', name: 'RSI (14)', color: '#9C27B0' },
    { id: 'MACD', name: 'MACD', color: '#4CAF50' },
    { id: 'BOLLINGER', name: 'Bollinger', color: '#E91E63' },
    { id: 'ATR', name: 'ATR (14)', color: '#00BCD4' },
  ];

  const [activeIndicators, setActiveIndicators] = useState(indicators);

  const toggleIndicator = (id) => {
    setActiveIndicators(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const calculateIndicators = (data) => {
    const results = {};
    
    if (!data?.length) return results;

    data.forEach((candle, i) => {
      const close = candle.close;
      
      if (activeIndicators.includes('SMA') && i >= 13) {
        const sma = data.slice(i - 13, i + 1).reduce((sum, c) => sum + c.close, 0) / 14;
        results.SMA = results.SMA || [];
        results.SMA.push({ time: candle.time, value: sma });
      }

      if (activeIndicators.includes('EMA') && i >= 13) {
        const ema = calculateEMA(data.slice(0, i + 1), 14);
        if (ema !== null) {
          results.EMA = results.EMA || [];
          results.EMA.push({ time: candle.time, value: ema });
        }
      }

      if (activeIndicators.includes('RSI') && i >= 13) {
        const rsi = calculateRSI(data.slice(0, i + 1), 14);
        if (rsi !== null) {
          results.RSI = results.RSI || [];
          results.RSI.push({ time: candle.time, value: rsi });
        }
      }

      if (activeIndicators.includes('BOLLINGER') && i >= 19) {
        const bb = calculateBollinger(data.slice(0, i + 1), 20);
        if (bb) {
          results.BOLLINGER = results.BOLLINGER || [];
          results.BOLLINGER.push({ time: candle.time, ...bb });
        }
      }

      if (activeIndicators.includes('ATR') && i >= 13) {
        const atr = calculateATR(data.slice(0, i + 1), 14);
        if (atr !== null) {
          results.ATR = results.ATR || [];
          results.ATR.push({ time: candle.time, value: atr });
        }
      }
    });

    return results;
  };

  const calculateEMA = (data, period) => {
    if (data.length < period) return null;
    const multiplier = 2 / (period + 1);
    let ema = data.slice(0, period).reduce((sum, c) => sum + c.close, 0) / period;
    
    for (let i = period; i < data.length; i++) {
      ema = (data[i].close - ema) * multiplier + ema;
    }
    return ema;
  };

  const calculateRSI = (data, period) => {
    if (data.length < period + 1) return null;
    let gains = 0, losses = 0;
    for (let i = data.length - period; i < data.length; i++) {
      const idx = i;
      const prevIdx = i - 1;
      if (prevIdx < 0) continue;
      const change = data[idx].close - data[prevIdx].close;
      if (change > 0) gains += change;
      else losses += Math.abs(change);
    }
    const avgGain = gains / period;
    const avgLoss = losses / period;
    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  };

  const calculateBollinger = (data, period) => {
    if (data.length < period) return null;
    const slice = data.slice(-period);
    const sma = slice.reduce((sum, c) => sum + c.close, 0) / period;
    const variance = slice.reduce((sum, c) => sum + Math.pow(c.close - sma, 2), 0) / period;
    const stdDev = Math.sqrt(variance);
    const close = data[data.length - 1].close;
    return { middle: sma, upper: sma + stdDev * 2, lower: sma - stdDev * 2 };
  };

  const calculateATR = (data, period) => {
    if (data.length < period + 1) return null;
    let atr = 0;
    for (let i = data.length - period; i < data.length; i++) {
      const tr = Math.max(
        data[i].high - data[i].low,
        Math.abs(data[i].high - data[i - 1]?.close || 0),
        Math.abs(data[i].low - data[i - 1]?.close || 0)
      );
      atr += tr;
    }
    return atr / period;
  };

  useEffect(() => {
    if (!containerRef.current || !containerRef.current.clientWidth) {
      console.warn("Chart container not ready, retrying...");
      const timer = setTimeout(() => {
        if (containerRef.current && containerRef.current.clientWidth) {
          initChart();
        }
      }, 500);
      return () => clearTimeout(timer);
    }

    initChart();

    function initChart() {
      const chart = createChart(containerRef.current, {
        width: containerRef.current.clientWidth,
        height: 420,
        layout: {
          background: { type: "solid", color: "#0f1520" },
          textColor: "#6a8aad",
          fontFamily: "JetBrains Mono, monospace",
          fontSize: 11,
        },
        grid: {
          vertLines: { color: "#1e2d45" },
          horzLines: { color: "#1e2d45" },
        },
        crosshair: {
          mode: 1,
          vertLine: { color: "#2a3f5f", width: 1, style: 2 },
          horzLine: { color: "#2a3f5f", width: 1, style: 2 },
        },
        rightPriceScale: {
          borderColor: "#1e2d45",
          scaleMargins: { top: 0.1, bottom: 0.2 },
        },
        timeScale: {
          borderColor: "#1e2d45",
          timeVisible: true,
          secondsVisible: false,
        },
      });

      const series = chart.addCandlestickSeries({
        upColor: "#00d98b",
        downColor: "#ff2d55",
        borderUpColor: "#00d98b",
        borderDownColor: "#ff2d55",
        wickUpColor: "#00d98b",
        wickDownColor: "#ff2d55",
      });

      chartRef.current = chart;
      seriesRef.current = series;

      let resizeTimer;
      const handleResize = () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
          if (containerRef.current) {
            chart.applyOptions({ width: containerRef.current.clientWidth });
          }
        }, 100);
      };
      window.addEventListener("resize", handleResize);

      return () => {
        clearTimeout(resizeTimer);
        window.removeEventListener("resize", handleResize);
        if (chartRef.current) {
          chartRef.current.remove();
          chartRef.current = null;
          seriesRef.current = null;
        }
      };
    }
  }, []);

  const chartData = useMemo(() => {
    return candles.map(c => ({
      time: c.time || c.timestamp,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));
  }, [candles]);

  const indicatorData = useMemo(() => {
    return calculateIndicators(chartData);
  }, [chartData, activeIndicators.join(',')]);

  useEffect(() => {
    if (!chartRef.current || !chartData.length) return;

    Object.keys(indicatorSeriesRef.current).forEach(key => {
      chartRef.current.removeSeries(indicatorSeriesRef.current[key]);
    });
    indicatorSeriesRef.current = {};

    const colors = {
      SMA: '#2196F3',
      EMA: '#FF9800',
      RSI: '#9C27B0',
      BOLLINGER: '#E91E63',
      ATR: '#00BCD4',
    };

    Object.entries(indicatorData).forEach(([key, data]) => {
      if (!data?.length) return;
      
      const series = chartRef.current.addLineSeries({
        color: colors[key] || '#FFF',
        lineWidth: 1,
        priceLineVisible: false,
      });
      
      series.setData(data.map(d => ({ time: d.time, value: d.value || d.middle })));
      indicatorSeriesRef.current[key] = series;
    });
  }, [indicatorData]);

  const signalMarker = useMemo(() => {
    if (!signal || !signal.timestamp) return [];
    return [{
      time: signal.timestamp,
      position: signal.direction === "BUY" ? "belowBar" : "aboveBar",
      color: signal.direction === "BUY" ? "#00d98b" : "#ff2d55",
      shape: signal.direction === "BUY" ? "arrowUp" : "arrowDown",
      text: `${signal.direction} @ ${signal.entry_price?.toFixed(5)}`,
    }];
  }, [signal?.timestamp, signal?.direction, signal?.entry_price]);

  useEffect(() => {
    if (!seriesRef.current || !chartData.length) return;

    seriesRef.current.setData(chartData);
    seriesRef.current.setMarkers(signalMarker);

    const isNewPairTf = prevPairTf.current.pair !== pair || prevPairTf.current.tf !== timeframe;
    if (isNewPairTf || !initialLoadDone.current) {
      chartRef.current?.timeScale().fitContent();
      prevPairTf.current = { pair, tf: timeframe };
      initialLoadDone.current = true;
    }
  }, [chartData, pair, timeframe, signalMarker]);

  useEffect(() => {
    if (!seriesRef.current || !candleUpdate) return;
    if (candleUpdate.pair !== pair || candleUpdate.timeframe !== timeframe) return;

    const c = candleUpdate.candle;
    seriesRef.current.update({
      time: c.time || c.timestamp,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    });
  }, [candleUpdate, pair, timeframe]);

  useEffect(() => {
    if (!seriesRef.current || livePrice == null || !candles.length) return;
    const lastCandle = candles[candles.length - 1];
    if (!lastCandle) return;

    seriesRef.current.update({
      time: lastCandle.time || lastCandle.timestamp,
      open: lastCandle.open,
      high: Math.max(lastCandle.high, livePrice),
      low: Math.min(lastCandle.low, livePrice),
      close: livePrice,
    });
  }, [livePrice, candles]);

  const lastClose = candles.length ? (candles[candles.length - 1]?.close || 0) : 0;
  const priceDirection = livePrice != null ? (livePrice >= lastClose ? "up" : "down") : "";

  return (
    <div className="chart-container">
      <div className="chart-header">
        <span style={{ fontSize: 12, color: "var(--muted2)" }}>
          {pair} · {timeframe}
        </span>
        {livePrice != null && (
          <span className={`price-display ${priceDirection}`}>
            {livePrice.toFixed(5)}
          </span>
        )}
      </div>
      {showIndicatorPanel && (
        <div style={{ 
          display: "flex", 
          gap: 4, 
          padding: "4px 8px", 
          borderBottom: "1px solid var(--border)",
          overflowX: "auto",
          flexWrap: "wrap"
        }}>
          {AVAILABLE_INDICATORS.map(ind => (
            <button
              key={ind.id}
              onClick={() => toggleIndicator(ind.id)}
              style={{
                padding: "2px 6px",
                fontSize: 9,
                background: activeIndicators.includes(ind.id) ? ind.color : "var(--bg)",
                border: "1px solid var(--border)",
                borderRadius: 3,
                color: activeIndicators.includes(ind.id) ? "#000" : "var(--muted2)",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {ind.name}
            </button>
          ))}
        </div>
      )}
      <div ref={containerRef} className="chart-canvas" />
    </div>
  );
}
