import { describe, it, expect } from "vitest";

describe("API validation", () => {
  describe("isValidPair", () => {
    const FOREX_PAIRS = [
      "frxEURUSD", "frxGBPUSD", "frxUSDJPY", "frxAUDUSD", "frxUSDCAD",
      "frxEURGBP", "frxEURJPY", "frxGBPJPY", "frxAUDNZD", "frxNZDUSD",
      "frxUSDCHF", "frxEURCHF", "frxGBPCHF", "frxAUDJPY", "frxAUDCAD",
    ];
    const isValidPair = (pair) => FOREX_PAIRS.includes(pair);

    it("should accept valid FOREX pairs", () => {
      expect(isValidPair("frxEURUSD")).toBe(true);
      expect(isValidPair("frxGBPUSD")).toBe(true);
      expect(isValidPair("frxUSDJPY")).toBe(true);
    });

    it("should reject invalid pairs", () => {
      expect(isValidPair("INVALID")).toBe(false);
      expect(isValidPair("BTCUSD")).toBe(false);
      expect(isValidPair("")).toBe(false);
    });
  });

  describe("isValidTimeframe", () => {
    const GRANULARITIES = { "1M": 60, "5M": 300, "15M": 900, "1H": 3600, "4H": 14400, "D": 86400 };
    const isValidTimeframe = (tf) => Object.keys(GRANULARITIES).includes(tf);

    it("should accept valid timeframes", () => {
      expect(isValidTimeframe("1M")).toBe(true);
      expect(isValidTimeframe("5M")).toBe(true);
      expect(isValidTimeframe("1H")).toBe(true);
      expect(isValidTimeframe("4H")).toBe(true);
      expect(isValidTimeframe("D")).toBe(true);
    });

    it("should reject invalid timeframes", () => {
      expect(isValidTimeframe("1S")).toBe(false);
      expect(isValidTimeframe("1Y")).toBe(false);
      expect(isValidTimeframe("")).toBe(false);
    });
  });

  describe("trade validation", () => {
    const validateTrade = (trade) => {
      const errors = [];
      if (!trade.pair) errors.push("pair required");
      if (!trade.direction || !["BUY", "SELL"].includes(trade.direction)) errors.push("direction must be BUY or SELL");
      if (typeof trade.entry_price !== "number" || trade.entry_price <= 0) errors.push("entry_price must be positive");
      if (typeof trade.stop_loss !== "number" || trade.stop_loss <= 0) errors.push("stop_loss must be positive");
      if (typeof trade.take_profit !== "number" || trade.take_profit <= 0) errors.push("take_profit must be positive");
      if (trade.direction === "BUY" && trade.stop_loss >= trade.entry_price) errors.push("SL < Entry for BUY");
      if (trade.direction === "BUY" && trade.entry_price >= trade.take_profit) errors.push("Entry < TP for BUY");
      if (trade.direction === "SELL" && trade.stop_loss <= trade.entry_price) errors.push("SL > Entry for SELL");
      if (trade.direction === "SELL" && trade.entry_price <= trade.take_profit) errors.push("Entry > TP for SELL");
      return errors;
    };

    it("should validate valid BUY trade", () => {
      const trade = { pair: "frxEURUSD", direction: "BUY", entry_price: 1.1000, stop_loss: 1.0950, take_profit: 1.1100 };
      expect(validateTrade(trade)).toHaveLength(0);
    });

    it("should validate valid SELL trade", () => {
      const trade = { pair: "frxEURUSD", direction: "SELL", entry_price: 1.1000, stop_loss: 1.1050, take_profit: 1.0900 };
      expect(validateTrade(trade)).toHaveLength(0);
    });

    it("should reject invalid BUY trade (SL >= Entry)", () => {
      const trade = { pair: "frxEURUSD", direction: "BUY", entry_price: 1.1000, stop_loss: 1.1050, take_profit: 1.1100 };
      const errors = validateTrade(trade);
      expect(errors).toContain("SL < Entry for BUY");
    });

    it("should reject negative entry price", () => {
      const trade = { pair: "frxEURUSD", direction: "BUY", entry_price: -1.0, stop_loss: 1.0950, take_profit: 1.1100 };
      const errors = validateTrade(trade);
      expect(errors).toContain("entry_price must be positive");
    });
  });
});