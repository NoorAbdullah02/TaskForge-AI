import { Request, Response, NextFunction } from 'express';
import { redis } from '../lib/redis';
import { logger } from '../lib/logger';
import { AppError } from '../lib/errors';

interface RateLimitOptions {
  windowMs: number;
  max: number;
  message?: string;
}

export const rateLimiter = (options: RateLimitOptions) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const ip = (req as any).clientIp || req.ip || 'unknown';
    const key = `ratelimit:${req.method}:${req.originalUrl.split('?')[0]}:${ip}`;

    try {
      const current = await redis.incr(key);

      if (current === 1) {
        // First request in this window, set expire TTL
        await redis.pexpire(key, options.windowMs);
      }

      if (current > options.max) {
        logger.warn(`Rate limit exceeded for IP: ${ip} on route ${req.method} ${req.originalUrl}`);
        return next(new AppError(options.message || 'Too many requests, please try again later.', 429));
      }

      next();
    } catch (err) {
      // Fallback: If Redis is down, allow request but log warning
      logger.error('Rate Limiter Redis error, bypassing block:', err);
      next();
    }
  };
};
