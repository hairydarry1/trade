import express from "express";
import cors from "cors";
import { createServer } from "http";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

import { config } from "./config.js";
import { apiLimiter, scanLimiter, tradeLimiter } from "./middleware/rateLimiter.js";
import { logger } from "./logger.js";

const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:8000",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
  "http://127.0.0.1:8000",
];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type"],
};
import { initDb, closeDb, saveDb } from "./db/index.js";
import { connect, loadAllHistory, disconnect } from "./services/deriv_client.js";
import { startEngine, stopEngine } from "./services/engine.js";
import { setupWebSocket } from "./routes/ws_handler.js";
import apiRoutes from "./routes/api.js";
import ictApiRoutes from "./routes/ict_api.js";
import { startPositionMonitor, stopPositionMonitor } from "./services/trade_manager.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
  await initDb();
  console.log("[DB] Database initialized");

  const app = express();
  app.use(cors(corsOptions));
  app.use(express.json());

  app.use("/api", apiRoutes);
  app.use("/api/ict", ictApiRoutes);

  const frontendDist = join(__dirname, "../../frontend/dist");
  app.use(express.static(frontendDist));
  app.get("*", (req, res) => {
    if (!req.path.startsWith("/api") && !req.path.startsWith("/ws")) {
      res.sendFile(join(frontendDist, "index.html"));
    }
  });

  const server = createServer(app);
  setupWebSocket(server);
  startEngine();
  startPositionMonitor();

  connect();

  loadAllHistory()
    .then(() => console.log("[History] Loaded successfully"))
    .catch(e => console.error("[History] Load error:", e.message));

  server.listen(config.port, () => {
    console.log(`[Server] Running on http://localhost:${config.port}`);
    console.log(`[Server] API: http://localhost:${config.port}/api`);
    console.log(`[Server] ICT API: http://localhost:${config.port}/api/ict`);
    console.log(`[Server] WebSocket: ws://localhost:${config.port}/ws`);
  });

  const shutdown = () => {
    console.log("\n[Server] Shutting down...");
    stopEngine();
    stopPositionMonitor();
    disconnect();
    saveDb();
    closeDb();
    server.close(() => process.exit(0));
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch(e => {
  console.error("[Fatal]", e);
  process.exit(1);
});
