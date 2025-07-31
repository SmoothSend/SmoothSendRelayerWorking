import { createClient } from 'redis';
import { config } from '../config';
import { logger } from '../utils/logger';

let redisClient: any = null;
let isRedisConnected = false;

export async function initRedis() {
  if (!config.redisUrl) {
    logger.info('No Redis URL provided, skipping Redis initialization');
    return;
  }

  try {
    redisClient = createClient({
      url: config.redisUrl
    });

    redisClient.on('error', (err: any) => {
      logger.error('Redis Client Error:', err);
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

    await redisClient.connect();
    isRedisConnected = true;
    logger.info('Redis initialized successfully');
  } catch (error) {
    logger.warn('Redis connection failed, continuing without cache:', error);
    isRedisConnected = false;
    redisClient = null;
  }
}

// Safe Redis operations
export const safeRedisGet = async (key: string): Promise<string | null> => {
  if (!isRedisConnected || !redisClient) return null;
  try {
    return await redisClient.get(key);
  } catch (error) {
    logger.warn('Redis GET failed:', error);
    return null;
  }
};

export const safeRedisSetex = async (key: string, seconds: number, value: string): Promise<void> => {
  if (!isRedisConnected || !redisClient) return;
  try {
    await redisClient.setEx(key, seconds, value);
  } catch (error) {
    logger.warn('Redis SETEX failed:', error);
  }
};

export const isRedisAvailable = () => isRedisConnected; 