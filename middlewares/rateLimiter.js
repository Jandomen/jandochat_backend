const rateLimit = require("express-rate-limit");

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100000, // Prácticamente deshabilitado para evitar 429 en desarrollo
  message: "Too many requests, please try again later.",
});

module.exports = limiter;
