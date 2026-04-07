import { WebSocketServer } from "ws";

const clients = new Set();

export function setupWebSocket(server) {
  const wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (ws) => {
    console.log("[WS] Client connected");
    clients.add(ws);
    ws.isAlive = true;

    ws.on("pong", () => { ws.isAlive = true; });

    ws.on("close", () => {
      console.log("[WS] Client disconnected");
      clients.delete(ws);
    });

    ws.on("error", (err) => {
      console.error("[WS] Client error:", err.message);
    });

    ws.on("message", (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        handleClientMessage(ws, msg);
      } catch (e) { /* ignore */ }
    });

    send(ws, { type: "connected", timestamp: Date.now() });
  });

  wss.on("error", (err) => {
    console.error("[WS] Server error:", err.message);
  });

  setInterval(() => {
    wss.clients.forEach((ws) => {
      if (!ws.isAlive) return ws.terminate();
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  return wss;
}

function send(ws, data) {
  if (ws.readyState === 1) {
    ws.send(JSON.stringify(data));
  }
}

function handleClientMessage(ws, msg) {
  if (msg.type === "ping") {
    send(ws, { type: "pong", timestamp: Date.now() });
  }
}

export function broadcast(type, data) {
  const msg = JSON.stringify({ type, data, timestamp: Date.now() });
  for (const ws of clients) {
    if (ws.readyState === 1) {
      try { ws.send(msg); } catch (e) { /* skip */ }
    }
  }
}
