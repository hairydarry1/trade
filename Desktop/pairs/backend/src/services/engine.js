import { getCandles, saveDb } from "../db/index.js";
import { onDerivEvent, isConnected } from "./deriv_client.js";
import { generateSignal, onSignal } from "./signal_generator.js";
import { broadcast } from "../routes/ws_handler.js";
import { FOREX_PAIRS, GRANULARITIES } from "../config.js";

const SCAN_INTERVAL = 60000;
const SAVE_INTERVAL = 30000;
let scanTimer = null;
let saveTimer = null;

export function startEngine() {
  onDerivEvent((event, data) => {
    switch (event) {
      case "connected":
        broadcast("connection", { connected: data });
        break;
      case "tick":
        broadcast("tick", data);
        break;
      case "candle":
        broadcast("candle", data);
        break;
      case "history_loaded":
        broadcast("history_loaded", data);
        break;
      case "pair_ready":
        broadcast("pair_ready", { pair: data });
        break;
      case "all_ready":
        broadcast("all_ready", { ready: true });
        startScanning();
        break;
    }
  });

  onSignal((signal) => {
    broadcast("signal", signal);
    console.log(`[Signal] ${signal.direction} ${signal.pair} @ ${signal.entry_price} | SL: ${signal.stop_loss} TP: ${signal.take_profit} | R:R ${signal.risk_reward}`);
  });

  saveTimer = setInterval(() => {
    saveDb();
  }, SAVE_INTERVAL);
}

function startScanning() {
  console.log("[Engine] Starting signal scanning every", SCAN_INTERVAL / 1000, "s");
  scanAll();
  scanTimer = setInterval(scanAll, SCAN_INTERVAL);
}

function scanAll() {
  if (!isConnected()) return;

  for (const pair of FOREX_PAIRS) {
    for (const tf of ["1H", "4H", "D"]) {
      const candles = getCandles(pair, tf, 200);
      if (candles.length < 50) continue;
      generateSignal(pair, candles, tf);
    }
  }
}

export function stopEngine() {
  if (scanTimer) clearInterval(scanTimer);
  if (saveTimer) clearInterval(saveTimer);
  scanTimer = null;
  saveTimer = null;
}
