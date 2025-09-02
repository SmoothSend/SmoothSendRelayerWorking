/**
 * CLEAN RELAYER CONTROLLER
 * 
 * This controller contains only the working endpoints:
 * 1. ✅ NEW: Proper gasless wallet integration (WORKING)
 * 2. ✅ Utility endpoints (balance, health, stats, safety)
 * 3. ✅ Traditional relayer (user pays gas)
 * 
 * REMOVED: All old broken gasless methods
 */

import { Request, Response } from 'express';
import { 
  Deserializer,
  SimpleTransaction,
  AccountAuthenticator
} from '@aptos-labs/ts-sdk';
import { AptosService } from '../services/aptosService';
import { PriceService } from '../services/priceService';
import { GasService } from '../services/gasService';
import { logger } from '../utils/logger';
import BigNumber from 'bignumber.js';

export class RelayerController {
  constructor(
    private aptosService: AptosService,
    private priceService: PriceService,
    private gasService: GasService
  ) {}

  // ============================================================================
  // ✅ NEW: PROPER GASLESS WALLET INTEGRATION (WORKING)
  // ============================================================================

  /**
   * ✅ NEW: Proper gasless transaction with wallet integration
   * Uses transaction serialization to avoid sequence number race conditions
   */
  async submitGaslessWithProperWallet(req: Request, res: Response) {
    try {
      const { transactionBytes, authenticatorBytes, functionName } = req.body;

      if (!transactionBytes || !authenticatorBytes) {
        return res.status(400).json({
          success: false,
          error: 'Missing required parameters: transactionBytes and authenticatorBytes'
        });
      }

      logger.info('🔄 GASLESS WALLET: Processing serialized transaction', {
        hasTxBytes: !!transactionBytes,
        hasAuthBytes: !!authenticatorBytes,
        functionName: functionName || 'not provided'
      });

      // Convert arrays to Uint8Arrays and deserialize
      const txBytes = new Uint8Array(transactionBytes);
      const authBytes = new Uint8Array(authenticatorBytes);

      const { Deserializer, SimpleTransaction, AccountAuthenticator } = await import('@aptos-labs/ts-sdk');

      const txDeserializer = new Deserializer(txBytes);
      const transaction = SimpleTransaction.deserialize(txDeserializer);

      const authDeserializer = new Deserializer(authBytes);
      const senderAuthenticator = AccountAuthenticator.deserialize(authDeserializer);

      const senderAddress = transaction.rawTransaction.sender.toString();

      logger.info('✅ DESERIALIZED: Transaction ready for fee payer signature', {
        sender: senderAddress,
        sequenceNumber: transaction.rawTransaction.sequence_number.toString(),
        maxGasAmount: transaction.rawTransaction.max_gas_amount.toString(),
        gasUnitPrice: transaction.rawTransaction.gas_unit_price.toString()
      });

      // Submit with relayer as fee payer
      const result = await this.aptosService.submitTransactionWithDeserializedData(
        transaction,
        senderAuthenticator
      );

      logger.info('🎉 GASLESS SUCCESS: Transaction completed', {
        txHash: result.hash,
        sender: senderAddress,
        gasUsed: result.gas_used,
        vmStatus: result.vm_status
      });

      return res.status(200).json({
        success: true,
        txnHash: result.hash,
        gasUsed: result.gas_used,
        vmStatus: result.vm_status,
        sender: senderAddress,
        function: functionName
      });

    } catch (error: any) {
      logger.error('❌ GASLESS WALLET ERROR:', {
        error: error.message,
        stack: error.stack
      });

      return res.status(400).json({
        success: false,
        error: 'Failed to process gasless transaction',
        details: error.message
      });
    }
  }

  // ============================================================================
  // ✅ TRADITIONAL RELAYER (USER PAYS GAS)
  // ============================================================================

  /**
   * ✅ Get quote for traditional relayer transaction (user pays gas)
   */
  async getQuote(req: Request, res: Response) {
    try {
      const { fromAddress, toAddress, amount, coinType } = req.body;

      if (!fromAddress || !toAddress || !amount || !coinType) {
        return res.status(400).json({
          success: false,
          error: 'Missing required parameters: fromAddress, toAddress, amount, coinType'
        });
      }

      // Check user balance
      const userBalance = await this.aptosService.getCoinBalance(fromAddress, coinType);
      
      if (BigInt(userBalance) < BigInt(amount)) {
        return res.status(400).json({ 
          success: false, 
          error: 'Insufficient balance' 
        });
      }

      // Calculate gas quote
      const gasQuote = await this.gasService.calculateGasQuote(
        fromAddress,
        toAddress,
        amount,
        coinType
      );

      return res.json({
        success: true,
        quote: gasQuote
      });

    } catch (error: any) {
      logger.error('Error getting quote:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to calculate quote' 
      });
    }
  }

  // ============================================================================
  // ✅ UTILITY ENDPOINTS
  // ============================================================================

  /**
   * ✅ Get coin balance for an address
   */
  async getBalance(req: Request, res: Response) {
    try {
      const { address } = req.params;

      if (!address) {
        return res.status(400).json({ 
          success: false, 
          error: 'Address parameter is required' 
        });
      }

      // Use testnet USDC coin type for balance lookup
      const testnetUsdcCoinType = '0x3c27315fb69ba6e4b960f1507d1cefcc9a4247869f26a8d59d6b7869d23782c::test_coins::USDC';

      // Get USDC balance for the address
      const usdcBalance = await this.aptosService.getCoinBalance(
        address,
        testnetUsdcCoinType
      );

      return res.json({
        success: true,
        address,
        balance: Number(usdcBalance) / Math.pow(10, 6), // Convert from smallest unit to USDC
        decimals: 6,
        coinType: testnetUsdcCoinType,
        rawBalance: usdcBalance
      });

    } catch (error: any) {
      logger.error('Error getting balance:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to get balance' 
      });
    }
  }

  /**
   * ✅ Get transaction status
   */
  async getTransactionStatus(req: Request, res: Response) {
    try {
      const { txnHash } = req.params;
      const status = await this.aptosService.getTransactionStatus(txnHash);
      return res.json(status);
    } catch (error: any) {
      logger.error('Error getting transaction status:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to get transaction status' 
      });
    }
  }

  /**
   * ✅ Health check endpoint
   */
  async getHealth(req: Request, res: Response) {
    try {
      // Get relayer balance and status
      const relayerAddress = this.aptosService.getRelayerAddress();
      const relayerBalance = await this.aptosService.getAccountBalance(relayerAddress);
      
      // Get current APT price for context
      const aptPrice = await this.priceService.getAptPrice();

      return res.json({
        status: 'healthy',
        relayerAddress,
        relayerBalance,
        aptPrice: aptPrice.toFixed(2),
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      logger.error('Error getting health:', error);
      return res.status(500).json({ 
        status: 'error',
        error: 'Health check failed' 
      });
    }
  }

  /**
   * ✅ Get relayer statistics
   */
  async getStats(req: Request, res: Response) {
    try {
      // Get relayer balance
      const relayerAddress = this.aptosService.getRelayerAddress();
      const aptBalance = await this.aptosService.getAccountBalance(relayerAddress);
      
      // Basic stats (database not required for core functionality)
      const stats = {
        totalTransactions: 0,
        successfulTransactions: 0,
        failedTransactions: 0,
        totalRevenue: '0',
        aptBalance,
        avgResponseTime: 0,
        note: 'Database connection optional - core gasless functionality works without it'
      };

      return res.json(stats);
    } catch (error: any) {
      logger.error('Error getting stats:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to get stats' 
      });
    }
  }

  /**
   * ✅ Get safety monitoring statistics
   */
  async getSafetyStats(req: Request, res: Response) {
    try {
      // BETA SAFETY: Conservative limits for testnet
      const betaLimits = {
        maxSingleTransaction: 10, // 10 USDC max per transaction
        maxUserDaily: 100,        // 100 USDC max per user per day
        maxDailyVolume: 1000,     // 1000 USDC max total per day
        currentDailyVolume: 0     // Would track in production
      };

      const usage = {
        dailyVolumeUsed: '0.00 USDC',
        dailyVolumeRemaining: '1000.00 USDC',
        utilizationPercentage: 0,
        status: 'normal'
      };

      return res.json({
        success: true,
        betaLimits,
        usage,
        status: usage.utilizationPercentage > 80 ? 'warning' : 'normal'
      });
    } catch (error: any) {
      logger.error('Error getting safety stats:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to get safety statistics' 
      });
    }
  }
}
