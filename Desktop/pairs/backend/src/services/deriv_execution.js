import WebSocket from "ws";
import { config } from "../config.js";
import { insertICTPosition, updateICTPosition, getICTPositions } from "../db/index.js";

let ws = null;
let connected = false;
let authorized = false;
let accountInfo = null;

let pendingRequests = new Map();
let reqId = 1;

const listeners = new Set();

export function onExecutionEvent(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function emit(event, data) {
  for (const fn of listeners) {
    try { fn(event, data); } catch (e) { console.error("Execution listener error:", e); }
  }
}

export function getActiveAccount() {
  return config.activeAccount || "demo";
}

export function getAccountConfig(accountType = null) {
  const type = accountType || getActiveAccount();
  if (type === "live") {
    return {
      appId: config.derivLiveAppId,
      token: config.derivLiveToken,
    };
  }
  return {
    appId: config.derivDemoAppId,
    token: config.derivDemoToken,
  };
}

function getWsUrl(accountType = null) {
  const cfg = getAccountConfig(accountType);
  return `wss://ws.derivws.com/websockets/v3?app_id=${cfg.appId}`;
}

export function connect(accountType = null) {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
    return Promise.resolve();
  }

  const url = getWsUrl(accountType);
  ws = new WebSocket(url);

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("Connection timeout"));
    }, 10000);

    ws.on("open", () => {
      clearTimeout(timeout);
      console.log("[Deriv Execution] Connected");
      connected = true;
      
      const cfg = getAccountConfig(accountType);
      if (cfg.token) {
        send({ authorize: cfg.token });
      }
      resolve();
    });

    ws.on("message", (raw) => {
      try {
        const data = JSON.parse(raw.toString());
        handleMessage(data);
      } catch (e) {
        console.error("[Deriv Execution] Parse error:", e);
      }
    });

    ws.on("error", (err) => {
      clearTimeout(timeout);
      console.error("[Deriv Execution] Error:", err.message);
      connected = false;
      reject(err);
    });

    ws.on("close", () => {
      console.log("[Deriv Execution] Disconnected");
      connected = false;
      authorized = false;
      setTimeout(() => connect(accountType), 5000);
    });
  });
}

export function disconnect() {
  if (ws) {
    ws.close();
    ws = null;
    connected = false;
    authorized = false;
  }
}

export function isConnected() {
  return connected && authorized;
}

export function getAccountInfo() {
  return accountInfo;
}

function send(payload) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

function sendWithResponse(payload, timeout = 30000) {
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
    
    if (data.error) {
      reject(new Error(data.error.message));
    } else {
      resolve(data);
    }
    return;
  }

  if (data.msg_type === "authorize") {
    if (data.authorize) {
      console.log("[Deriv Execution] Authorized:", data.authorize.loginid);
      authorized = true;
      accountInfo = data.authorize;
      emit("authorized", accountInfo);
    } else {
      console.error("[Deriv Execution] Auth failed");
      authorized = false;
    }
  }

  if (data.msg_type === "proposal_open_contract") {
    emit("contract", data);
  }

  if (data.msg_type === "transaction") {
    emit("transaction", data);
  }
}

export async function getContractTypes(pair, accountType = null) {
  await connect(accountType);
  
  try {
    const response = await sendWithResponse({
      contract_types: 1,
      product_type: "multi_barrier",
      symbol: pair,
    });
    
    return response.contract_types || [];
  } catch (e) {
    console.error("Failed to get contract types:", e);
    return [];
  }
}

export async function placeICTTrade(params) {
  const {
    pair,
    direction,
    entryPrice,
    stopLoss,
    takeProfit,
    lotSize,
    accountType = null,
  } = params;

  await connect(accountType);

  const contractType = direction === "BUY" ? "CALL" : "PUT";
  
  const barrierType = direction === "BUY" ? "向上" : "向下";
  
  const response = await sendWithResponse({
    proposal: 1,
    amount: lotSize,
    app_markup_percentage: 0,
    barrier_type: "relative",
    contract_type: contractType,
    currency: "USD",
    symbol: pair,
    expiry_type: "tick",
    basis: "stake",
  });

  if (response.proposal) {
    const buyResponse = await sendWithResponse({
      buy: response.proposal.id,
      price: lotSize,
    });

    const externalId = buyResponse.buy?.contract_id;
    const price = buyResponse.buy?.buy_price;

    const positionId = insertICTPosition({
      signal_id: params.signal_id || null,
      external_id: externalId,
      pair,
      direction,
      entry_price: price || entryPrice,
      exit_price: null,
      stop_loss: stopLoss,
      take_profit: takeProfit,
      lot_size: lotSize,
      account_type: accountType || getActiveAccount(),
      status: "open",
    });

    emit("trade_opened", {
      positionId,
      externalId,
      pair,
      direction,
      price,
      lotSize,
    });

    return {
      success: true,
      positionId,
      externalId,
      price,
    };
  }

  return { success: false, error: "No proposal returned" };
}

export async function closeICTTrade(positionId, reason = "manual") {
  const positions = getICTPositions(null, "open");
  const position = positions.find(p => p.id === positionId);
  
  if (!position) {
    return { success: false, error: "Position not found" };
  }

  try {
    const response = await sendWithResponse({
      proposal_open_contract: 1,
      contract_id: position.external_id,
      subscription: 1,
    });

    if (response.proposal_open_contract) {
      const contract = response.proposal_open_contract;
      
      const closeResponse = await sendWithResponse({
        sell: position.external_id,
        price: contract.bid_price,
      });

      const exitPrice = contract.bid_price;
      const pnl = calculatePNL(position.direction, position.entry_price, exitPrice, position.lot_size);
      
      updateICTPosition(positionId, {
        exit_price: exitPrice,
        status: "closed",
        pnl,
        closed_at: new Date().toISOString(),
      });

      emit("trade_closed", {
        positionId,
        exitPrice,
        pnl,
        reason,
      });

      return {
        success: true,
        positionId,
        exitPrice,
        pnl,
      };
    }
  } catch (e) {
    console.error("Failed to close trade:", e);
    return { success: false, error: e.message };
  }

  return { success: false, error: "Could not close position" };
}

export async function checkPositionStatus(positionId) {
  const positions = getICTPositions(null, "open");
  const position = positions.find(p => p.id === positionId);
  
  if (!position) {
    return { status: "closed", error: "Position not found" };
  }

  try {
    const response = await sendWithResponse({
      proposal_open_contract: 1,
      contract_id: position.external_id,
    });

    if (response.proposal_open_contract) {
      const contract = response.proposal_open_contract;
      const currentPrice = contract.bid_price || contract.ask_price;
      
      let newStatus = "open";
      let exitPrice = null;
      let pnl = null;
      let reason = null;

      if (position.direction === "BUY") {
        if (currentPrice >= position.take_profit) {
          newStatus = "closed";
          exitPrice = position.take_profit;
          pnl = calculatePNL(position.direction, position.entry_price, exitPrice, position.lot_size);
          reason = "TP";
        } else if (currentPrice <= position.stop_loss) {
          newStatus = "closed";
          exitPrice = position.stop_loss;
          pnl = calculatePNL(position.direction, position.entry_price, exitPrice, position.lot_size);
          reason = "SL";
        }
      } else {
        if (currentPrice <= position.take_profit) {
          newStatus = "closed";
          exitPrice = position.take_profit;
          pnl = calculatePNL(position.direction, position.entry_price, exitPrice, position.lot_size);
          reason = "TP";
        } else if (currentPrice >= position.stop_loss) {
          newStatus = "closed";
          exitPrice = position.stop_loss;
          pnl = calculatePNL(position.direction, position.entry_price, exitPrice, position.lot_size);
          reason = "SL";
        }
      }

      if (newStatus === "closed") {
        updateICTPosition(positionId, {
          exit_price: exitPrice,
          status: "closed",
          pnl,
          closed_at: new Date().toISOString(),
        });

        emit("trade_closed", {
          positionId,
          exitPrice,
          pnl,
          reason,
        });
      }

      return {
        status: newStatus,
        currentPrice,
        pnl,
        reason,
      };
    }
  } catch (e) {
    console.error("Failed to check position:", e);
    return { status: "open", error: e.message };
  }

  return { status: "open" };
}

function calculatePNL(direction, entry, exit, lotSize) {
  const pipValue = 10;
  const pips = direction === "BUY" 
    ? (exit - entry) * 100000 
    : (entry - exit) * 100000;
  
  return (pips / 100) * pipValue * lotSize;
}

export function calculateLotSize(accountBalance, riskPct, entryPrice, stopLoss) {
  const riskAmount = accountBalance * (riskPct / 100);
  const stopLossPips = Math.abs(entryPrice - stopLoss) * 100000;
  const pipValue = 10;
  const lotSize = stopLossPips > 0 ? (riskAmount / stopLossPips) * pipValue : 0.01;
  return Math.max(0.01, Math.min(lotSize, 100));
}
