import axios from 'axios';
import { config } from '../config';
import { logger } from '../utils/logger';
import { safeRedisGet, safeRedisSetex } from '../database/redis';

export class PriceService {
  private readonly PRICE_CACHE_KEY = 'apt_usd_price';
  private readonly APT_PRICE_ID = '0x03ae4db29ed4ae33d323568895aa00337e658e348b37509f5372ae51f0af00d5'; // Pyth APT/USD price ID

  async getAptPrice(): Promise<number> {
    try {
      // Check cache first
      const cachedPrice = await safeRedisGet(this.PRICE_CACHE_KEY);
      if (cachedPrice) {
        return parseFloat(cachedPrice);
      }

      // Fetch from Pyth Hermes
      const response = await axios.get(
        `${config.pythHermesUrl}/api/latest_price_feeds?ids[]=${this.APT_PRICE_ID}`,
        { timeout: 5000 }
      );

      const priceFeed = response.data[0];
      if (!priceFeed || !priceFeed.price) {
        throw new Error('Invalid price feed response');
      }

      const price = parseFloat(priceFeed.price.price) * Math.pow(10, priceFeed.price.expo);
      
      // Check if price is stale (older than 60 seconds)
      const publishTime = priceFeed.price.publish_time;
      const currentTime = Math.floor(Date.now() / 1000);
      if (currentTime - publishTime > 60) {
        logger.warn('Price feed is stale', { publishTime, currentTime });
      }

      // Cache the price
      await safeRedisSetex(this.PRICE_CACHE_KEY, config.priceCacheTtl, price.toString());

      logger.info(`Fetched APT price: $${price}`);
      return price;
    } catch (error) {
      logger.error('Failed to fetch APT price:', error);
      
      // Try to return cached price if available
      const cachedPrice = await safeRedisGet(this.PRICE_CACHE_KEY);
      if (cachedPrice) {
        logger.warn('Using stale cached price due to fetch failure');
        return parseFloat(cachedPrice);
      }
      
      throw new Error('Unable to fetch APT price');
    }
  }

  async convertAptToUsdc(aptAmount: number): Promise<number> {
    const aptPrice = await this.getAptPrice();
    return aptAmount * aptPrice;
  }

  async convertUsdcToApt(usdcAmount: number): Promise<number> {
    const aptPrice = await this.getAptPrice();
    return usdcAmount / aptPrice;
  }
} 