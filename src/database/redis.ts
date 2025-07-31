import { createClient } from 'redis';
import { config } from '../config';
import { logger } from '../utils/logger';

// Create Redis client
const redisClient = createClient({
  url: config.redisUrl
});

let isRedisConnected = false;

// Redis event handlers
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

// Initialize Redis connection
export const initRedis = async () => {
  try {
    await redisClient.connect();
    logger.info('Redis initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize Redis:', error);
    throw error;
  }
};

// Safe Redis operations
export const safeRedisGet = async (key: string): Promise<string | null> => {
  if (!isRedisConnected) return null;
  try {
    return await redisClient.get(key);
  } catch (error) {
    logger.warn('Redis GET failed:', error);
    return null;
  }
};

export const safeRedisSetex = async (key: string, seconds: number, value: string): Promise<void> => {
  if (!isRedisConnected) return;
  try {
    await redisClient.setEx(key, seconds, value);
  } catch (error) {
    logger.warn('Redis SETEX failed:', error);
  }
};

export const isRedisAvailable = () => isRedisConnected; 