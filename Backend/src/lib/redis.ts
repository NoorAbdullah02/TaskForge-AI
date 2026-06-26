import Redis from 'ioredis';
import { env } from '../config/env';
import { logger } from './logger';

logger.info(`Connecting to Redis at: ${env.REDIS_URL}`);

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null, // Required by BullMQ
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  }
});

redis.on('connect', () => {
  logger.info('Successfully connected to Redis');
});

redis.on('error', (err) => {
  logger.error('Redis Connection Error:', err);
});

export const getCache = async <T>(key: string): Promise<T | null> => {
  try {
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  } catch (err) {
    logger.warn(`Failed to read from Redis cache for key: ${key}`, err);
    return null;
  }
};

export const setCache = async (key: string, value: any, ttlSeconds = 300): Promise<void> => {
  try {
    const data = JSON.stringify(value);
    await redis.setex(key, ttlSeconds, data);
  } catch (err) {
    logger.warn(`Failed to write to Redis cache for key: ${key}`, err);
  }
};


export const clearCache = async (pattern: string): Promise<void> => {
  try {
    let cursor = '0';
    let totalDeleted = 0;

    do {
      const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = nextCursor;

      if (keys.length > 0) {
        await redis.del(...keys);
        totalDeleted += keys.length;
      }
    } while (cursor !== '0');

    if (totalDeleted > 0) {
      logger.info(`Cleared ${totalDeleted} cache keys matching pattern: ${pattern}`);
    }
  } catch (err) {
    logger.warn(`Failed to clear Redis cache matching pattern: ${pattern}`, err);
  }
};

/**
 * Delete a single cache key immediately.
 */
export const deleteCache = async (key: string): Promise<void> => {
  try {
    await redis.del(key);
  } catch (err) {
    logger.warn(`Failed to delete Redis cache key: ${key}`, err);
  }
};
