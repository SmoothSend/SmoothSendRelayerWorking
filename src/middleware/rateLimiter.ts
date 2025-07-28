import rateLimit from 'express-rate-limit';
import { config } from '../config';

export const rateLimiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMaxRequests,
  message: {
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter per address
export const createAddressRateLimiter = () => rateLimit({
  windowMs: 60000, // 1 minute
  max: 10, // 10 requests per minute per address
  keyGenerator: (req) => req.body.fromAddress || req.ip,
  message: {
    error: 'Too many requests from this address, please try again later.'
  }
}); 