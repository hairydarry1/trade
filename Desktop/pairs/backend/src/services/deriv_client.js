import WebSocket from "ws";
import { config, FOREX_PAIRS, GRANULARITIES } from "../config.js";
import { insertCandle } from "../db/index.js";
import { buildCandlesFromTicks, aggregateHigherTimeframe } from "./candle_builder.js";

let ws = null;
let connected = false;
let reconnectDelay = 1000;
const MAX_RECONNECT = 30000;

const tickBuffers = new Map();
const candleBuffers = new Map();
const listeners = new Set();

const pendingRequests = new Map();
let reqId = 1;

export function getActiveConfig() {
  const isDemo = config.activeAccount === "demo";
  return {
    appId: isDemo ? config.derivDemoAppId : config.derivLiveAppId,
    token: isDemo ? config.derivDemoToken : config.derivLiveToken,
  };
}

export function onDerivEvent(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function emit(event, data) {
  for (const fn of listeners) {
    try { fn(event, data); } catch (e) { console.error("Listener error:", e); }
  }
}

export function isConnected() { return connected; }

export function connect() {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;

  const cfg = getActiveConfig();
  const url = `wss://ws.derivws.com/websockets/v3?app_id=${cfg.appId}`;
  ws = new WebSocket(url);

  ws.on("open", () => {
    console.log("[Deriv] Connected");
    connected = true;
    reconnectDelay = 1000;
    emit("connected", true);
    if (cfg.token) {
      send({ authorize: cfg.token });
    } else {
      subscribeAll();
    }
  });

  ws.on("message", (raw) => {
    try {
      const data = JSON.parse(raw.toString());
      handleMessage(data);
    } catch (e) { console.error("[Deriv] Parse error:", e); }
  });

  ws.on("error", (err) => {
    console.error("[Deriv] Error:", err.message);
    emit("error", err.message);
  });

  ws.on("close", () => {
    console.log("[Deriv] Disconnected");
    connected = false;
    emit("connected", false);
    setTimeout(connect, Math.min(reconnectDelay, MAX_RECONNECT));
    reconnectDelay *= 2;
  });
}

export function disconnect() {
  if (ws) {
    ws.close();
    ws = null;
    connected = false;
  }
}

function send(payload) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

function sendWithResponse(payload, timeout = 15000) {
  return new Promise((resolve, reject) => {
    const id = reqId++;
    payload.req_id = id;
    const timer = setTimeout(() => {
      pendingRequests.delete(id);
      reject(new Error("Request timeout"));
    }, timeout);
    pendingRequests.set(id, { resolve, reject, timer });
    send(payload);
  });
}

function handleMessage(data) {
  if (data.req_id && pendingRequests.has(data.req_id)) {
    const { resolve, reject, timer } = pendingRequests.get(data.req_id);
    clearTimeout(timer);
    pendingRequests.delete(data.req_id);
    if (data.error) reject(new Error(data.error.message));
    else resolve(data);
    return;
  }

  if (data.msg_type === "authorize") {
    if (data.authorize) {
      console.log("[Deriv] Authorized:", data.authorize.loginid);
      emit("authorized", data.authorize);
      subscribeAll();
    } else {
      console.error("[Deriv] Auth failed");
      subscribeAll();
    }
  }

  if (data.msg_type === "tick" && data.tick) {
    processTick(data.tick);
  }
}

function subscribeAll() {
  for (const pair of FOREX_PAIRS) {
    send({ ticks: pair, subscribe: 1 });
  }
  console.log(`[Deriv] Subscribed to ${FOREX_PAIRS.length} pairs`);
  emit("subscribed", FOREX_PAIRS);
}

function processTick(tick) {
  const { symbol, quote, epoch } = tick;
  if (!tickBuffers.has(symbol)) tickBuffers.set(symbol, []);
  const buf = tickBuffers.get(symbol);
  buf.push({ time: epoch, price: quote });
  if (buf.length > 5000) buf.splice(0, buf.length - 2000);

  emit("tick", { pair: symbol, price: quote, time: epoch });

  buildMinuteCandle(symbol, tick);
}

function buildMinuteCandle(symbol, tick) {
  const candleTime = Math.floor(tick.epoch / 60) * 60;
  if (!candleBuffers.has(symbol)) candleBuffers.set(symbol, new Map());
  const tfMap = candleBuffers.get(symbol);

  if (tfMap.has("1M_current")) {
    const c = tfMap.get("1M_current");
    if (c.time === candleTime) {
      c.high = Math.max(c.high, tick.quote);
      c.low = Math.min(c.low, tick.quote);
      c.close = tick.quote;
      c.volume++;
      return;
    } else {
      insertCandle(symbol, "1M", c.time, c.open, c.high, c.low, c.close, c.volume);
      emit("candle", { pair: symbol, timeframe: "1M", candle: c });

      for (const [tf, secs] of Object.entries(GRANULARITIES)) {
        if (tf === "1M") continue;
        updateHigherCandle(symbol, tf, secs, c);
      }
    }
  }

  tfMap.set("1M_current", {
    time: candleTime,
    open: tick.quote,
    high: tick.quote,
    low: tick.quote,
    close: tick.quote,
    volume: 1,
  });
}

function updateHigherCandle(symbol, tf, secs, minuteCandle) {
  const tfMap = candleBuffers.get(symbol);
  const bucketTime = Math.floor(minuteCandle.time / secs) * secs;
  const key = `${tf}_current`;

  if (tfMap.has(key)) {
    const c = tfMap.get(key);
    if (c.time === bucketTime) {
      c.high = Math.max(c.high, minuteCandle.high);
      c.low = Math.min(c.low, minuteCandle.low);
      c.close = minuteCandle.close;
      c.volume += minuteCandle.volume;
    } else {
      insertCandle(symbol, tf, c.time, c.open, c.high, c.low, c.close, c.volume);
      emit("candle", { pair: symbol, timeframe: tf, candle: c });
      tfMap.set(key, {
        time: bucketTime,
        open: minuteCandle.open,
        high: minuteCandle.high,
        low: minuteCandle.low,
        close: minuteCandle.close,
        volume: minuteCandle.volume,
      });
    }
  } else {
    tfMap.set(key, {
      time: bucketTime,
      open: minuteCandle.open,
      high: minuteCandle.high,
      low: minuteCandle.low,
      close: minuteCandle.close,
      volume: minuteCandle.volume,
    });
  }
}

export async function fetchHistoricalCandles(pair, granularity, count = 500) {
  try {
    const data = await sendWithResponse({
      ticks_history: pair,
      end: "latest",
      count: count,
      style: "candles",
      granularity: granularity,
    });

    if (data.candles) {
      const tfName = Object.entries(GRANULARITIES).find(([, v]) => v === granularity)?.[0] || String(granularity);
      for (const c of data.candles) {
        insertCandle(pair, tfName, c.epoch, c.open, c.high, c.low, c.close, 0);
      }
      emit("history_loaded", { pair, timeframe: tfName, count: data.candles.length });
      return data.candles;
    }
  } catch (e) {
    console.error(`[Deriv] History error for ${pair}:`, e.message);
  }
  return [];
}

export async function loadAllHistory() {
  for (const pair of FOREX_PAIRS) {
    for (const [tf, secs] of Object.entries(GRANULARITIES)) {
      await fetchHistoricalCandles(pair, secs, 500);
      await new Promise(r => setTimeout(r, 200));
    }
    emit("pair_ready", pair);
  }
  emit("all_ready", true);
}

export function getCurrentPrice(pair) {
  const buf = tickBuffers.get(pair);
  if (buf && buf.length > 0) return buf[buf.length - 1].price;
  return null;
}
