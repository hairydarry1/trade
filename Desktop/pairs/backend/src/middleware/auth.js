import { config } from "../config.js";

export function apiKeyAuth(req, res, next) {
  const apiKey = req.headers["x-api-key"];
  
  if (!apiKey) {
    return res.status(401).json({ error: "API key required" });
  }
  
  if (apiKey !== config.apiKey) {
    return res.status(401).json({ error: "Invalid API key" });
  }
  
  next();
}

export function optionalAuth(req, res, next) {
  const apiKey = req.headers["x-api-key"];
  
  if (apiKey && apiKey === config.apiKey) {
    req.authenticated = true;
  }
  
  next();
}