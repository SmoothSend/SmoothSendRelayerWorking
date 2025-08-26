// Emergency monitoring and safety controls
import { logger } from '../utils/logger';
import { db } from '../database/postgres';

export class SafetyMonitor {
  private static instance: SafetyMonitor;
  private dailyVolume: Map<string, number> = new Map(); // date -> volume
  private userDailyVolume: Map<string, number> = new Map(); // user -> volume
  
  // Safety limits
  private readonly MAX_DAILY_VOLUME = 1000 * 1_000_000; // 1000 USDC
  private readonly MAX_USER_DAILY = 100 * 1_000_000;   // 100 USDC per user
  private readonly MAX_SINGLE_TX = 10 * 1_000_000;     // 10 USDC per transaction
  
  public static getInstance(): SafetyMonitor {
    if (!SafetyMonitor.instance) {
      SafetyMonitor.instance = new SafetyMonitor();
    }
    return SafetyMonitor.instance;
  }

  // Check if transaction is within safety limits
  async validateTransaction(
    userAddress: string, 
    amount: string
  ): Promise<{ allowed: boolean; reason?: string }> {
    const amountNum = parseInt(amount);
    const today = new Date().toISOString().split('T')[0];
    
    // Check single transaction limit
    if (amountNum > this.MAX_SINGLE_TX) {
      return { 
        allowed: false, 
        reason: `Transaction amount (${amountNum/1_000_000} USDC) exceeds maximum of ${this.MAX_SINGLE_TX/1_000_000} USDC` 
      };
    }
    
    // Check daily volume limit
    const currentDailyVolume = this.dailyVolume.get(today) || 0;
    if (currentDailyVolume + amountNum > this.MAX_DAILY_VOLUME) {
      return { 
        allowed: false, 
        reason: `Daily volume limit would be exceeded. Current: ${currentDailyVolume/1_000_000} USDC, Limit: ${this.MAX_DAILY_VOLUME/1_000_000} USDC` 
      };
    }
    
    // Check user daily limit
    const userKey = `${userAddress}-${today}`;
    const userDailyVol = this.userDailyVolume.get(userKey) || 0;
    if (userDailyVol + amountNum > this.MAX_USER_DAILY) {
      return { 
        allowed: false, 
        reason: `User daily limit would be exceeded. Current: ${userDailyVol/1_000_000} USDC, Limit: ${this.MAX_USER_DAILY/1_000_000} USDC` 
      };
    }
    
    return { allowed: true };
  }
  
  // Record successful transaction
  async recordTransaction(userAddress: string, amount: string): Promise<void> {
    const amountNum = parseInt(amount);
    const today = new Date().toISOString().split('T')[0];
    const userKey = `${userAddress}-${today}`;
    
    // Update daily volume
    const currentDaily = this.dailyVolume.get(today) || 0;
    this.dailyVolume.set(today, currentDaily + amountNum);
    
    // Update user daily volume
    const currentUserDaily = this.userDailyVolume.get(userKey) || 0;
    this.userDailyVolume.set(userKey, currentUserDaily + amountNum);
    
    // Log for monitoring
    logger.info('Transaction recorded', {
      user: userAddress,
      amount: amountNum/1_000_000,
      dailyVolume: (currentDaily + amountNum)/1_000_000,
      userDailyVolume: (currentUserDaily + amountNum)/1_000_000
    });
    
    // Alert if approaching limits
    if ((currentDaily + amountNum) > (this.MAX_DAILY_VOLUME * 0.8)) {
      logger.warn('⚠️ APPROACHING DAILY VOLUME LIMIT', {
        current: (currentDaily + amountNum)/1_000_000,
        limit: this.MAX_DAILY_VOLUME/1_000_000,
        percentage: ((currentDaily + amountNum) / this.MAX_DAILY_VOLUME * 100).toFixed(1)
      });
    }
  }
  
  // Get current statistics
  getStats() {
    const today = new Date().toISOString().split('T')[0];
    return {
      dailyVolume: (this.dailyVolume.get(today) || 0) / 1_000_000,
      maxDailyVolume: this.MAX_DAILY_VOLUME / 1_000_000,
      maxSingleTransaction: this.MAX_SINGLE_TX / 1_000_000,
      maxUserDaily: this.MAX_USER_DAILY / 1_000_000
    };
  }
  
  // Reset daily counters (call this daily via cron)
  resetDailyCounters(): void {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 24*60*60*1000).toISOString().split('T')[0];
    
    // Clean up old data
    for (const [key] of this.dailyVolume) {
      if (key !== today) {
        this.dailyVolume.delete(key);
      }
    }
    
    for (const [key] of this.userDailyVolume) {
      if (!key.includes(today)) {
        this.userDailyVolume.delete(key);
      }
    }
    
    logger.info('Daily counters reset', { date: today });
  }
}

export const safetyMonitor = SafetyMonitor.getInstance();
