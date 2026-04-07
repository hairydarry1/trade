import { getLatestBOS } from "./bos_detector.js";
import { getLatestFVG, getOpenFVGs } from "./fvg_detector.js";
import { checkAllSMTDivergence, updatePairCandles } from "./smt_detector.js";
import { getFibLevelAtPrice } from "./fib_calculator.js";
import { detectCandlePatterns } from "./candle_patterns.js";
import { MIN_CONFIRMATIONS } from "../config.js";

export function runConfirmations(pair, candles, sweep) {
  if (!sweep || !candles.length) return { confirmations: [], count: 0, passed: false };

  const confirmations = [];
  const currentPrice = candles[candles.length - 1].close;
  const direction = sweep.type;

  const bos = getLatestBOS(candles);
  if (bos && bos.type === direction && Math.abs(bos.time - sweep.time) <= 3600 * 4) {
    confirmations.push({ type: "BOS", direction: bos.type, detail: `Break at ${bos.breakLevel}` });
  }

  const fvgs = getOpenFVGs(candles, currentPrice);
  for (const fvg of fvgs) {
    if (fvg.type === direction) {
      confirmations.push({ type: "FVG", direction: fvg.type, detail: `Gap ${fvg.top}-${fvg.bottom}` });
      break;
    }
  }

  const fibInfo = getFibLevelAtPrice(currentPrice, candles);
  if (fibInfo && fibInfo.near79) {
    confirmations.push({
      type: "FIB_79",
      direction,
      detail: `At 79% Fib (${fibInfo.levels.level_79.toFixed(5)})`,
    });
  }

  updatePairCandles(pair, candles);
  const smtResults = checkAllSMTDivergence();
  for (const smt of smtResults) {
    if (smt.type === direction) {
      confirmations.push({
        type: "SMT",
        direction: smt.type,
        detail: `${smt.pair1} vs ${smt.pair2}: ${smt.detail}`,
      });
    }
  }

  const patterns = detectCandlePatterns(candles);
  if (patterns.length > 0) {
    const matching = patterns.find(p => p.direction === direction);
    if (matching) {
      confirmations.push({ type: "CANDLE", direction: matching.direction, detail: matching.pattern });
    }
  }

  return {
    confirmations,
    count: confirmations.length,
    passed: confirmations.length >= MIN_CONFIRMATIONS,
    required: MIN_CONFIRMATIONS,
  };
}

export function getConfirmationSummary(result) {
  const types = result.confirmations.map(c => c.type);
  return {
    BOS: types.includes("BOS") ? "PASS" : "FAIL",
    FVG: types.includes("FVG") ? "PASS" : "FAIL",
    SMT: types.includes("SMT") ? "PASS" : "FAIL",
    FIB_79: types.includes("FIB_79") ? "PASS" : "FAIL",
    CANDLE: types.includes("CANDLE") ? "PASS" : "FAIL",
    total: `${result.count}/${result.required}`,
    passed: result.passed,
  };
}
