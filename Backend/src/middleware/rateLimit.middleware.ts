import { Request, Response, NextFunction } from 'express';
import { logger } from '../lib/logger';
import { AppError } from '../lib/errors';

interface RateLimitOptions {
  windowMs: number;
  max: number;
  message?: string;
}

interface RateLimitEntry {
  count: number;
  expires: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

export const rateLimiter = (options: RateLimitOptions) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = (req as any).clientIp || req.ip || 'unknown';
    const key = `ratelimit:${req.method}:${req.originalUrl.split('?')[0]}:${ip}`;
    const now = Date.now();
    const entry = rateLimitStore.get(key);

    if (!entry || entry.expires <= now) {
      rateLimitStore.set(key, { count: 1, expires: now + options.windowMs });
    } else {
      entry.count += 1;
      if (entry.count > options.max) {
        logger.warn(`Rate limit exceeded for IP: ${ip} on route ${req.method} ${req.originalUrl}`);
        return next(new AppError(options.message || 'Too many requests, please try again later.', 429));
      }
    }

    next();
  };
};
