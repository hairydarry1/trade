import { ICT_CONFIG } from "../config.js";
import { getAllSessionLevels, isPremarket, getLocalHour } from "./ict_session_detector.js";
import { detectManipulation, checkForManipulationEntry } from "./manipulation_detector.js";
import { detectEquilibrium, isPriceAtEquilibrium } from "./equilibrium_detector.js";
import { getLatestBOS } from "./bos_detector.js";
import { getLatestFVG, getOpenFVGs } from "./fvg_detector.js";
import { checkAllSMTDivergence } from "./smt_detector.js";
import { getFibLevelAtPrice } from "./fib_calculator.js";
import { findSwingHighs, findSwingLows, getLatestSweep } from "./liquidity_detector.js";

export function runICTConfirmations(candles, timezone, config = {}) {
  if (!candles || candles.length < 50) {
    return { passed: false, stage: 0, reason: "Insufficient candle data" };
  }

  const stage1 = checkStage1LiquiditySweep(candles, timezone);
  if (!stage1.passed) {
    return { ...stage1, stage: 1 };
  }

  const stage2 = checkStage2Confirmations(candles, stage1.sweep);
  if (!stage2.passed) {
    return { ...stage2, stage: 2 };
  }

  let stage2b = { passed: true };
  if (stage1.sweep.isPremarket || stage1.sweep.isSessionTransition) {
    stage2b = checkStage2bManipulation(candles, stage1.sweep, stage1.direction);
    if (!stage2b.passed) {
      return { ...stage2b, stage: "2b" };
    }
  }

  const stage3 = checkStage3Continuation(candles, stage1.sweep);
  if (!stage3.passed) {
    return { ...stage3, stage: 3 };
  }

  const stage4 = checkStage4FinalConfirmation(candles, stage1.sweep);
  if (!stage4.passed) {
    return { ...stage4, stage: 4 };
  }

  return {
    passed: true,
    stage: 5,
    direction: stage1.direction,
    sweep: stage1.sweep,
    confirmations: {
      stage1: stage1,
      stage2: stage2,
      stage2b: stage2b,
      stage3: stage3,
      stage4: stage4,
    },
  };
}

function checkStage1LiquiditySweep(candles, timezone) {
  const sessionLevels = getAllSessionLevels(candles, timezone);
  if (!sessionLevels) {
    return { passed: false, reason: "Could not calculate session levels" };
  }

  const direction = determineSweepDirection(candles, sessionLevels);
  if (!direction) {
    return { passed: false, reason: "No liquidity sweep detected" };
  }

  const localHour = getLocalHour(timezone);
  const isPremarketTime = isPremarket(timezone);
  const isSessionTransition = checkSessionTransition(localHour);

  return {
    passed: true,
    direction,
    sweep: {
      type: direction,
      sessionLevels,
      isPremarket: isPremarketTime,
      isSessionTransition,
      timezone,
    },
  };
}

function checkStage2Confirmations(candles, sweep) {
  const confirmations = [];
  const currentPrice = candles[candles.length - 1].close;
  const direction = sweep.type;

  const bos = getLatestBOS(candles);
  if (bos && bos.type === direction) {
    confirmations.push({ type: "BOS", passed: true, detail: `Break at ${bos.breakLevel}` });
  }

  const fvgs = getOpenFVGs(candles, currentPrice);
  for (const fvg of fvgs) {
    if (fvg.type === direction) {
      confirmations.push({ type: "FVG", passed: true, detail: `Gap ${fvg.top}-${fvg.bottom}` });
      break;
    }
  }

  const fibInfo = getFibLevelAtPrice(currentPrice, candles);
  if (fibInfo && fibInfo.near79) {
    confirmations.push({ type: "FIB_79", passed: true, detail: `At 79% Fib` });
  }

  const smtResults = checkAllSMTDivergence();
  for (const smt of smtResults) {
    if (smt.type === direction) {
      confirmations.push({ type: "SMT", passed: true, detail: `${smt.pair1} vs ${smt.pair2}` });
      break;
    }
  }

  const passed = confirmations.length >= ICT_CONFIG.requiredConfirmations.stage2;

  return {
    passed,
    confirmations,
    required: ICT_CONFIG.requiredConfirmations.stage2,
    count: confirmations.length,
  };
}

function checkStage2bManipulation(candles, sweep, direction) {
  const result = checkForManipulationEntry(candles, sweep.time || Date.now() / 1000, direction);
  
  if (result.needsManipulation && !result.ready) {
    return {
      passed: false,
      reason: "Waiting for manipulation candle",
      waitingForManipulation: true,
      nextCheck: result.manipulation?.nextCheck,
    };
  }

  let smtPassed = false;
  if (result.ready) {
    const smtResults = checkAllSMTDivergence();
    for (const smt of smtResults) {
      if (smt.type === direction) {
        smtPassed = true;
        break;
      }
    }
  }

  return {
    passed: smtPassed || result.ready,
    manipulationDetected: result.manipulation?.detected || false,
    smtAfterManipulation: smtPassed,
    entryReady: result.ready,
  };
}

function checkStage3Continuation(candles, sweep) {
  const confirmations = [];
  const currentPrice = candles[candles.length - 1].close;
  const direction = sweep.type;

  const eq = detectEquilibrium(candles);
  if (eq && eq.nearMid) {
    confirmations.push({ type: "EQ", passed: true, detail: `Near equilibrium` });
  }

  const fvgs = getOpenFVGs(candles, currentPrice);
  for (const fvg of fvgs) {
    if (fvg.type === direction) {
      confirmations.push({ type: "FVG", passed: true, detail: `Gap ${fvg.top}-${fvg.bottom}` });
      break;
    }
  }

  const smtResults = checkAllSMTDivergence();
  for (const smt of smtResults) {
    if (smt.type === direction) {
      confirmations.push({ type: "SMT", passed: true, detail: `SMT divergence` });
      break;
    }
  }

  const passed = confirmations.length >= ICT_CONFIG.requiredConfirmations.stage3;

  return {
    passed,
    confirmations,
    required: ICT_CONFIG.requiredConfirmations.stage3,
    count: confirmations.length,
  };
}

function checkStage4FinalConfirmation(candles, sweep) {
  const confirmations = [];
  const currentPrice = candles[candles.length - 1].close;
  const direction = sweep.type;

  const bos = getLatestBOS(candles);
  if (bos && bos.type === direction) {
    confirmations.push({ type: "BOS", passed: true });
  }

  const fvgs = getOpenFVGs(candles, currentPrice);
  for (const fvg of fvgs) {
    if (fvg.type === direction) {
      confirmations.push({ type: "FVG", passed: true });
      break;
    }
  }

  const fibInfo = getFibLevelAtPrice(currentPrice, candles);
  if (fibInfo && fibInfo.near79) {
    confirmations.push({ type: "FIB_79", passed: true });
  }

  const smtResults = checkAllSMTDivergence();
  for (const smt of smtResults) {
    if (smt.type === direction) {
      confirmations.push({ type: "SMT", passed: true });
      break;
    }
  }

  const passed = confirmations.length >= ICT_CONFIG.requiredConfirmations.stage4;

  return {
    passed,
    confirmations,
    required: ICT_CONFIG.requiredConfirmations.stage4,
    count: confirmations.length,
  };
}

function determineSweepDirection(candles, sessionLevels) {
  const currentPrice = candles[candles.length - 1].close;

  const recentHighs = sessionLevels.oneHHighs.slice(-3);
  const recentLows = sessionLevels.oneHLows.slice(-3);
  const recent4HHighs = sessionLevels.fourHHighs.slice(-2);
  const recent4HLows = sessionLevels.fourHLows.slice(-2);

  let bullishSweep = false;
  let bearishSweep = false;

  for (const high of [...recentHighs, ...recent4HHighs]) {
    if (currentPrice > high.price + (high.price * 0.0001)) {
      bearishSweep = true;
    }
  }

  for (const low of [...recentLows, ...recent4HLows]) {
    if (currentPrice < low.price - (low.price * 0.0001)) {
      bullishSweep = true;
    }
  }

  if (sessionLevels.liquidityHighs.length > 0) {
    const lastLiquidityHigh = sessionLevels.liquidityHighs[sessionLevels.liquidityHighs.length - 1];
    if (currentPrice > lastLiquidityHigh.price) {
      bearishSweep = true;
    }
  }

  if (sessionLevels.liquidityLows.length > 0) {
    const lastLiquidityLow = sessionLevels.liquidityLows[sessionLevels.liquidityLows.length - 1];
    if (currentPrice < lastLiquidityLow.price) {
      bullishSweep = true;
    }
  }

  if (bullishSweep && !bearishSweep) return "bullish";
  if (bearishSweep && !bullishSweep) return "bearish";

  return null;
}

function checkSessionTransition(localHour) {
  return (localHour >= 8 && localHour <= 9) || (localHour >= 13 && localHour <= 14);
}

export function getConfirmationSummary(result) {
  if (!result.passed) {
    return {
      stage: result.stage,
      passed: false,
      reason: result.reason,
    };
  }

  const allConfirmations = [
    ...result.confirmations.stage2.confirmations,
    ...result.confirmations.stage3.confirmations,
    ...result.confirmations.stage4.confirmations,
  ];

  return {
    stage: 5,
    passed: true,
    direction: result.direction,
    sweep: result.sweep,
    totalConfirmations: allConfirmations.length,
    byStage: {
      stage2: result.confirmations.stage2.count,
      stage3: result.confirmations.stage3.count,
      stage4: result.confirmations.stage4.count,
    },
    confirmationTypes: [...new Set(allConfirmations.map(c => c.type))],
  };
}
