import "dotenv/config";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
export const ROOT_DIR = join(__dirname, "..");

export const config = {
  derivDemoAppId: process.env.DERIV_DEMO_APP_ID || "16929",
  derivDemoToken: process.env.DERIV_DEMO_TOKEN || "",
  derivLiveAppId: process.env.DERIV_LIVE_APP_ID || "",
  derivLiveToken: process.env.DERIV_LIVE_TOKEN || "",
  activeAccount: process.env.ACTIVE_ACCOUNT || "demo",
  port: parseInt(process.env.PORT || "8000"),
  riskPct: parseFloat(process.env.RISK_PCT || "1.0"),
  maxDailyLossPct: parseFloat(process.env.MAX_DAILY_LOSS_PCT || "2.0"),
  maxOpenTrades: parseInt(process.env.MAX_OPEN_TRADES || "3"),
  dbPath: join(ROOT_DIR, "data", "trading.db"),
  apiKey: process.env.API_KEY || "dev-key-change-in-production",
};

export const FOREX_PAIRS = [
  "frxEURUSD", "frxGBPUSD", "frxUSDJPY", "frxAUDUSD", "frxUSDCAD",
  "frxEURGBP", "frxEURJPY", "frxGBPJPY", "frxAUDNZD", "frxNZDUSD",
  "frxUSDCHF", "frxEURCHF", "frxGBPCHF", "frxAUDJPY", "frxAUDCAD",
  "frxUSDSGD", "frxEURCAD", "frxCADJPY", "frxNZDJPY", "frxUSDTRY",
  "frxEURZAR", "frxUSDZAR", "frxUSDNOK", "frxUSDSEK",
  "frxUSDMXN", "frxUSDPLN", "frxUSDHKD", "frxUSDCNH",
];

export const PAIR_DISPLAY = {
  frxEURUSD: "EUR/USD", frxGBPUSD: "GBP/USD", frxUSDJPY: "USD/JPY",
  frxAUDUSD: "AUD/USD", frxUSDCAD: "USD/CAD", frxEURGBP: "EUR/GBP",
  frxEURJPY: "EUR/JPY", frxGBPJPY: "GBP/JPY", frxAUDNZD: "AUD/NZD",
  frxNZDUSD: "NZD/USD", frxUSDCHF: "USD/CHF", frxEURCHF: "EUR/CHF",
  frxGBPCHF: "GBP/CHF", frxAUDJPY: "AUD/JPY", frxAUDCAD: "AUD/CAD",
  frxUSDSGD: "USD/SGD", frxEURCAD: "EUR/CAD", frxCADJPY: "CAD/JPY",
  frxNZDJPY: "NZD/JPY", frxUSDTRY: "USD/TRY", frxEURZAR: "EUR/ZAR",
  frxUSDZAR: "USD/ZAR", frxUSDNOK: "USD/NOK", frxUSDSEK: "USD/SEK",
  frxUSDMXN: "USD/MXN", frxUSDPLN: "USD/PLN", frxUSDHKD: "USD/HKD",
  frxUSDCNH: "USD/CNH",
};

export const SMT_CORRELATED = [
  ["frxEURUSD", "frxGBPUSD"],
  ["frxEURUSD", "frxAUDUSD"],
  ["frxGBPUSD", "frxAUDUSD"],
  ["frxUSDJPY", "frxUSDCHF"],
];

export const GRANULARITIES = {
  "1M": 60, "5M": 300, "15M": 900,
  "1H": 3600, "4H": 14400, "D": 86400,
};

export const TIMEZONES = {
  ny: { name: "New York", offset: -5, premarketStart: 6, premarketEnd: 9, sessions: ["asian", "london", "ny"] },
  london: { name: "London", offset: 0, premarketStart: 6, premarketEnd: 9, sessions: ["asian", "london", "ny"] },
  tokyo: { name: "Tokyo", offset: 9, premarketStart: 6, premarketEnd: 9, sessions: ["asian"] },
  sydney: { name: "Sydney", offset: 10, premarketStart: 6, premarketEnd: 9, sessions: ["asian"] },
  hongkong: { name: "Hong Kong", offset: 8, premarketStart: 6, premarketEnd: 9, sessions: ["asian"] },
  singapore: { name: "Singapore", offset: 8, premarketStart: 6, premarketEnd: 9, sessions: ["asian"] },
  nigeria: { name: "Nigeria", offset: 1, premarketStart: 6, premarketEnd: 9, sessions: ["london"] },
  frankfurt: { name: "Frankfurt", offset: 1, premarketStart: 6, premarketEnd: 9, sessions: ["london"] },
};

export const ICT_CONFIG = {
  manipulationWaitMinutes: 5,
  continuationLookback: 2,
  liquidityLookback: 20,
  defaultRiskPct: 1.0,
  tpLevels: [
    { name: "TP1", pctMove: 0.50, rr: 1.0 },
    { name: "TP2", pctMove: 0.75, rr: 1.5 },
    { name: "TP3", pctMove: 1.00, rr: 2.0 },
  ],
  requiredConfirmations: {
    stage2: 1,
    stage3: 1,
    stage4: 1,
  },
};

export const SWEEP_LOOKBACK = 20;
export const FIB_LEVEL = 0.618;
export const FIB_TOLERANCE = 0.001;
export const MIN_CONFIRMATIONS = 3;
