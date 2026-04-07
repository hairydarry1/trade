import { useEffect, useRef, useState, useCallback } from "react";

export function useWebSocket() {
  const ws = useRef(null);
  const reconnectTimer = useRef(null);
  const reconnectAttempts = useRef(0);
  const MAX_RECONNECT_ATTEMPTS = 5;
  const [connected, setConnected] = useState(false);
  const [ticks, setTicks] = useState({});
  const [signals, setSignals] = useState([]);
  const [candleUpdate, setCandleUpdate] = useState(null);
  const [newSignal, setNewSignal] = useState(null);
  const [error, setError] = useState(null);

  const connect = useCallback(() => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) return;
    
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = import.meta.env.DEV ? "ws://127.0.0.1:8000" : `${protocol}//${window.location.host}/ws`;
    const url = wsUrl;

    ws.current = new WebSocket(url);

    ws.current.onopen = () => {
      setConnected(true);
      setError(null);
      reconnectAttempts.current = 0;
    };

    ws.current.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        handleMessage(msg);
      } catch (err) {
        console.warn("WebSocket: failed to parse message", err);
      }
    };

    ws.current.onclose = () => {
      setConnected(false);
      if (reconnectAttempts.current >= MAX_RECONNECT_ATTEMPTS) {
        setError("Connection failed after maximum retries. Please refresh the page.");
        console.error(`WebSocket: max reconnect attempts (${MAX_RECONNECT_ATTEMPTS}) reached`);
        return;
      }
      const delay = Math.min(3000 * Math.pow(2, reconnectAttempts.current), 30000);
      reconnectAttempts.current += 1;
      console.warn(`WebSocket: reconnecting in ${delay}ms (attempt ${reconnectAttempts.current}/${MAX_RECONNECT_ATTEMPTS})`);
      reconnectTimer.current = setTimeout(connect, delay);
    };

    ws.current.onerror = (err) => {
      setConnected(false);
      setError("WebSocket connection error");
      console.error("WebSocket error:", err);
    };
  }, []);

  const handleMessage = useCallback((msg) => {
    switch (msg.type) {
      case "connected":
        setConnected(true);
        break;
      case "connection":
        setConnected(msg.data?.connected ?? false);
        break;
      case "tick":
        if (msg.data?.pair) {
          setTicks(prev => ({ ...prev, [msg.data.pair]: msg.data.price }));
        }
        break;
      case "signal":
        if (msg.data) {
          setSignals(prev => [msg.data, ...prev].slice(0, 100));
          setNewSignal(msg.data);
        }
        break;
      case "candle":
        if (msg.data?.pair && msg.data?.timeframe && msg.data?.candle) {
          setCandleUpdate({ pair: msg.data.pair, timeframe: msg.data.timeframe, candle: msg.data.candle });
        }
        break;
    }
  }, []);

  useEffect(() => {
    if (newSignal) {
      const timer = setTimeout(() => {
        setNewSignal(null);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [newSignal]);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimer.current);
      if (ws.current) ws.current.close();
    };
  }, [connect]);

  return { connected, ticks, signals, candleUpdate, newSignal, error };
}
