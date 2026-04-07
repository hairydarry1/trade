import pino from "pino";

export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
});

export const log = {
  info: (msg, meta = {}) => logger.info(meta, msg),
  warn: (msg, meta = {}) => logger.warn(meta, msg),
  error: (msg, meta = {}) => logger.error(meta, msg),
  debug: (msg, meta = {}) => logger.debug(meta, msg),
  audit: (action, data = {}) => logger.info({ ...data, audit: true, action }, "AUDIT"),
};