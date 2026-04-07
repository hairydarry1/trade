import { getICTPositions, updateICTPosition } from "../db/index.js";
import { checkPositionStatus, onExecutionEvent } from "./deriv_execution.js";

const positionMonitors = new Map();
let monitorInterval = null;
const CHECK_INTERVAL = 5000;

export function startPositionMonitor() {
  if (monitorInterval) return;
  
  monitorInterval = setInterval(async () => {
    await checkAllPositions();
  }, CHECK_INTERVAL);
  
  console.log("[Trade Manager] Position monitor started");
}

export function stopPositionMonitor() {
  if (monitorInterval) {
    clearInterval(monitorInterval);
    monitorInterval = null;
  }
  console.log("[Trade Manager] Position monitor stopped");
}

async function checkAllPositions() {
  const positions = getICTPositions(null, "open");
  
  for (const position of positions) {
    try {
      const result = await checkPositionStatus(position.id);
      
      if (result.status === "closed") {
        console.log(`[Trade Manager] Position ${position.id} closed: ${result.reason}, PnL: ${result.pnl}`);
        
        broadcastSignal({
          type: "position_closed",
          position: {
            id: position.id,
            pair: position.pair,
            direction: position.direction,
            pnl: result.pnl,
            reason: result.reason,
          },
        });
      }
    } catch (e) {
      console.error(`[Trade Manager] Error checking position ${position.id}:`, e.message);
    }
  }
}

export function monitorPosition(positionId) {
  positionMonitors.set(positionId, {
    startTime: Date.now(),
    checks: 0,
  });
}

export function stopMonitoringPosition(positionId) {
  positionMonitors.delete(positionId);
}

export function getMonitoredPositions() {
  return Array.from(positionMonitors.entries()).map(([id, data]) => ({
    id,
    ...data,
  }));
}

export function getOpenPositions(accountType = null) {
  return getICTPositions(accountType, "open");
}

export function getClosedPositions(accountType = null, limit = 50) {
  return getICTPositions(accountType, "closed").slice(0, limit);
}

export function calculatePositionPnL(position) {
  if (position.status === "open") return null;
  
  const entry = position.entry_price;
  const exit = position.exit_price;
  const direction = position.direction;
  const lotSize = position.lot_size;
  
  const pips = direction === "BUY"
    ? (exit - entry) * 100000
    : (entry - exit) * 100000;
  
  const pipValue = 10;
  return (pips / 100) * pipValue * lotSize;
}

export function getPositionStats(accountType = null) {
  const open = getICTPositions(accountType, "open");
  const closed = getICTPositions(accountType, "closed");
  
  const totalPnl = closed.reduce((sum, p) => sum + (p.pnl || 0), 0);
  const wins = closed.filter(p => (p.pnl || 0) > 0);
  const losses = closed.filter(p => (p.pnl || 0) < 0);
  
  return {
    openPositions: open.length,
    closedPositions: closed.length,
    totalPnl,
    wins: wins.length,
    losses: losses.length,
    winRate: closed.length > 0 ? (wins.length / closed.length * 100) : 0,
  };
}

onExecutionEvent((event, data) => {
  if (event === "trade_opened") {
    monitorPosition(data.positionId);
  }
  
  if (event === "trade_closed") {
    stopMonitoringPosition(data.positionId);
  }
});
