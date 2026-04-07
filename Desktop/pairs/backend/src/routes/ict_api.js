import { Router } from "express";
import { TIMEZONES, ICT_CONFIG } from "../config.js";
import { getICTSignals, getICTSettings, setICTSetting, getICTPositions } from "../db/index.js";
import { generateICTSignal, scanICTSignal } from "../services/ict_signal_generator.js";
import { getCandles } from "../db/index.js";
import { getActiveAccount, getAccountConfig, placeICTTrade, closeICTTrade, checkPositionStatus, calculateLotSize } from "../services/deriv_execution.js";
import { getOpenPositions, getPositionStats } from "../services/trade_manager.js";

const router = Router();

router.get("/config", (req, res) => {
  const settings = getICTSettings();
  res.json({
    timezones: Object.entries(TIMEZONES).map(([key, value]) => ({
      id: key,
      ...value,
    })),
    config: ICT_CONFIG,
    activeAccount: getActiveAccount(),
    accountConfig: {
      demo: !!getAccountConfig("demo").token,
      live: !!getAccountConfig("live").token,
    },
    settings,
  });
});

router.get("/settings", (req, res) => {
  const settings = getICTSettings();
  res.json(settings);
});

router.put("/settings", (req, res) => {
  const { key, value } = req.body;
  if (!key) {
    return res.status(400).json({ error: "Key required" });
  }
  setICTSetting(key, String(value));
  res.json({ success: true });
});

router.get("/signals", (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  const accountType = req.query.account || getActiveAccount();
  const signals = getICTSignals(limit, accountType);
  res.json(signals);
});

router.post("/scan", (req, res) => {
  const { pair, timezone, accountType } = req.body;
  
  if (!pair) {
    return res.status(400).json({ error: "pair required" });
  }
  
  const tz = timezone || "ny";
  const account = accountType || getActiveAccount();
  
  const timeframe = "1H";
  const candles = getCandles(pair, timeframe, 200);
  
  if (!candles || candles.length < 50) {
    return res.json({ 
      signal: null, 
      stage: 0, 
      reason: "Insufficient candle data",
      candlesAvailable: candles?.length || 0,
    });
  }
  
  const result = scanICTSignal(pair, candles, tz, account);
  
  res.json(result);
});

router.post("/execute", (req, res) => {
  const { signal_id, pair, direction, entry_price, stop_loss, take_profit, lot_size, account_type, risk_pct } = req.body;
  
  if (!pair || !direction || !entry_price || !stop_loss || !take_profit) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  
  const account = account_type || getActiveAccount();
  const lotSize = lot_size || calculateLotSize(10000, risk_pct || ICT_CONFIG.defaultRiskPct, entry_price, stop_loss);
  
  placeICTTrade({
    signal_id,
    pair,
    direction,
    entryPrice: entry_price,
    stopLoss: stop_loss,
    takeProfit: take_profit,
    lotSize,
    accountType: account,
  })
  .then(result => {
    res.json(result);
  })
  .catch(err => {
    res.status(500).json({ error: err.message });
  });
});

router.get("/positions", (req, res) => {
  const accountType = req.query.account || getActiveAccount();
  const status = req.query.status || "open";
  const positions = getICTPositions(accountType, status);
  res.json(positions);
});

router.get("/positions/open", (req, res) => {
  const accountType = req.query.account || getActiveAccount();
  const positions = getOpenPositions(accountType);
  res.json(positions);
});

router.get("/positions/stats", (req, res) => {
  const accountType = req.query.account || getActiveAccount();
  const stats = getPositionStats(accountType);
  res.json(stats);
});

router.post("/positions/:id/close", (req, res) => {
  const positionId = parseInt(req.params.id);
  const { reason } = req.body;
  
  closeICTTrade(positionId, reason || "manual")
    .then(result => {
      res.json(result);
    })
    .catch(err => {
      res.status(500).json({ error: err.message });
    });
});

router.get("/positions/:id/status", (req, res) => {
  const positionId = parseInt(req.params.id);
  
  checkPositionStatus(positionId)
    .then(result => {
      res.json(result);
    })
    .catch(err => {
      res.status(500).json({ error: err.message });
    });
});

router.post("/account/switch", (req, res) => {
  const { account_type } = req.body;
  
  if (account_type !== "demo" && account_type !== "live") {
    return res.status(400).json({ error: "Invalid account type" });
  }
  
  setICTSetting("active_account", account_type);
  res.json({ success: true, active_account: account_type });
});

export default router;
