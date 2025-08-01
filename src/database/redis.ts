import { createClient } from 'redis';
import { config } from '../config';
import { logger } from '../utils/logger';

// Create Redis client only if URL is provided and valid
let redisClient: any = null;

if (config.redisUrl && config.redisUrl !== 'your_redis_url' && config.redisUrl.startsWith('redis://')) {
  try {
    redisClient = createClient({
      url: config.redisUrl
    });
  } catch (error) {
    logger.warn('Redis client creation failed, running without Redis:', error);
  }
} else {
  logger.warn('Redis URL not configured properly, running without Redis cache');
}

let isRedisConnected = false;

// Redis event handlers (only if client exists)
if (redisClient) {
  redisClient.on('error', (err: any) => {
    logger.error('Redis connection error:', err);
    isRedisConnected = false;
  });

  redisClient.on('connect', () => {
    logger.info('Connected to Redis');
    isRedisConnected = true;
  });

  redisClient.on('disconnect', () => {
    logger.warn('Disconnected from Redis');
    isRedisConnected = false;
  });
}

// Initialize Redis connection
export const initRedis = async () => {
  if (!redisClient) {
    logger.info('Redis client not available, skipping initialization');
    return;
  }
  
  try {
    await redisClient.connect();
    logger.info('Redis initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize Redis:', error);
    // Don't throw error - let app continue without Redis
  }
};

// Safe Redis operations
export const safeRedisGet = async (key: string): Promise<string | null> => {
  if (!redisClient || !isRedisConnected) return null;
  try {
    return await redisClient.get(key);
  } catch (error) {
    logger.warn('Redis GET failed:', error);
    return null;
  }
};

export const safeRedisSetex = async (key: string, seconds: number, value: string): Promise<void> => {
  if (!redisClient || !isRedisConnected) return;
  try {
    await redisClient.setEx(key, seconds, value);
  } catch (error) {
    logger.warn('Redis SETEX failed:', error);
  }
};

export const isRedisAvailable = () => isRedisConnected; 