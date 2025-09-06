import { Request, Response } from 'express';
import { AptosService } from '../services/aptosService';
import { PriceService } from '../services/priceService';
import { GasService } from '../services/gasService';
import { 
  transferRequestSchema,
  gaslessQuoteRequestSchema,
  gaslessSubmitRequestSchema,
  addressSchema,
  gaslessWithWalletRequestSchema
} from '../utils/validation';
import { 
  GaslessQuoteRequest,
  GaslessSubmitRequest
} from '../types';
import { config } from '../config';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import BigNumber from 'bignumber.js';
import { db } from '../database/postgres';
import { safetyMonitor } from '../services/safetyMonitor';

export class RelayerController {
  constructor(
    private aptosService: AptosService,
    private priceService: PriceService,
    private gasService: GasService
  ) {}

  async getQuote(req: Request, res: Response) {
    try {
      const { error, value } = transferRequestSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }

      const { fromAddress, toAddress, amount, coinType }: {
        fromAddress: string;
        toAddress: string;
        amount: string;
        coinType: string;
      } = value;

      // Check if amount exceeds maximum
      const amountBN = new BigNumber(amount);
      if (amountBN.gt(config.maxTransactionAmount)) {
        return res.status(400).json({ 
          error: `Transaction amount exceeds maximum of ${config.maxTransactionAmount}` 
        });
      }

      // Check user balance
      const userBalance = await this.aptosService.getCoinBalance(fromAddress, coinType);
      if (amountBN.gt(userBalance)) {
        return res.status(400).json({ error: 'Insufficient balance' });
      }

      // Calculate gas quote
      const quote = await this.gasService.calculateGasQuote(
        fromAddress,
        toAddress,
        amount,
        coinType
      );

      res.json(quote);
    } catch (error) {
      const errAny = error as any;
      if (errAny && (errAny.upstream || errAny.code === 'EAI_AGAIN' || errAny.code === 'UPSTREAM_UNAVAILABLE' || (errAny.message && (errAny.message.includes('EAI_AGAIN') || errAny.message.includes('getaddrinfo'))))) {
        logger.error('Upstream Aptos RPC failure while getting quote:', errAny);
        return res.status(503).json({ error: 'Upstream Aptos RPC unreachable', detail: errAny.message || String(errAny) });
      }
      logger.error('Error getting quote:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // ⚠️ DISABLED FOR PRODUCTION SAFETY: This endpoint provides FREE transactions
  async submitTransaction(req: Request, res: Response) {
    return res.status(410).json({ 
      error: 'Endpoint disabled for production safety',
      reason: 'This endpoint called submitSponsoredTransfer which provided free transactions',
      alternative: 'Use /gasless/quote + /gasless/submit where user pays USDC fees',
      impact: 'Free transactions would bankrupt the relayer'
    });
  }

  async getTransactionStatus(req: Request, res: Response) {
    try {
      const { txnHash } = req.params;

      if (!db) {
        return res.status(503).json({ 
          error: 'Transaction tracking unavailable',
          reason: 'Database not configured',
          hash: txnHash,
          status: 'unknown'
        });
      }

      // Get transaction from database
      const dbTransaction = await db('transactions')
        .where('hash', txnHash)
        .first();

      if (!dbTransaction) {
        return res.status(404).json({ error: 'Transaction not found' });
      }

      // Get on-chain status
      try {
        const onChainTx = await this.aptosService.getTransactionStatus(txnHash);
        
        // Update database status if needed
        const newStatus = onChainTx.success ? 'success' : 'failed';
        if (dbTransaction.status !== newStatus) {
          await db('transactions')
            .where('hash', txnHash)
            .update({ 
              status: newStatus,
              error_message: onChainTx.success ? null : onChainTx.vm_status,
              updated_at: new Date()
            });
        }

        res.json({
          hash: txnHash,
          status: newStatus,
          gasUsed: onChainTx.gas_used,
          timestamp: new Date(parseInt(onChainTx.timestamp) / 1000),
          errorMessage: onChainTx.success ? null : onChainTx.vm_status
        });
      } catch (error) {
        // Transaction might still be pending
        res.json({
          hash: txnHash,
          status: 'pending',
          timestamp: dbTransaction.created_at
        });
      }
    } catch (error) {
      logger.error('Error getting transaction status:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getHealth(req: Request, res: Response) {
    try {
      const relayerBalance = await this.aptosService.getAccountBalance(
        this.aptosService.getRelayerAddress()
      );
      
      const aptPrice = await this.priceService.getAptPrice();

      const isHealthy = new BigNumber(relayerBalance).gte(config.minAptBalance);

      res.json({
        status: isHealthy ? 'healthy' : 'unhealthy',
        relayerAddress: this.aptosService.getRelayerAddress(),
        relayerBalance,
        aptPrice,
        minBalance: config.minAptBalance,
        timestamp: new Date()
      });
    } catch (error) {
      const errAny = error as any;
      if (errAny && (errAny.upstream || errAny.code === 'EAI_AGAIN' || errAny.code === 'UPSTREAM_UNAVAILABLE' || (errAny.message && (errAny.message.includes('EAI_AGAIN') || errAny.message.includes('getaddrinfo'))))) {
        logger.error('Upstream Aptos RPC failure during health check:', errAny);
        return res.status(503).json({ status: 'unhealthy', error: 'Upstream Aptos RPC unreachable' });
      }
      logger.error('Error checking health:', error);
      res.status(500).json({ 
        status: 'unhealthy',
        error: 'Health check failed'
      });
    }
  }

  async getBalance(req: Request, res: Response) {
    try {
      const { address } = req.params;
      
      if (!address) {
        return res.status(400).json({ error: 'Address parameter is required' });
      }

      // Use testnet USDC coin type for balance lookup
      const testnetUsdcCoinType = '0x3c27315fb69ba6e4b960f1507d1cefcc9a4247869f26a8d59d6b7869d23782c::test_coins::USDC';
      
      // Get USDC balance for the address
      const usdcBalance = await this.aptosService.getCoinBalance(
        address, 
        testnetUsdcCoinType
      );

      res.json({
        success: true,
        address,
        balance: Number(usdcBalance) / Math.pow(10, 6), // Convert from smallest unit to USDC
        decimals: 6,
        coinType: testnetUsdcCoinType,
        timestamp: new Date()
      });
    } catch (error) {
      const errAny = error as any;
      if (errAny && (errAny.upstream || errAny.code === 'EAI_AGAIN' || errAny.code === 'UPSTREAM_UNAVAILABLE' || (errAny.message && (errAny.message.includes('EAI_AGAIN') || errAny.message.includes('getaddrinfo'))))) {
        logger.error('Upstream Aptos RPC failure while getting balance:', errAny);
        return res.status(503).json({ success: false, error: 'Upstream Aptos RPC unreachable' });
      }
      logger.error('Error getting balance:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to fetch balance' 
      });
    }
  }

  async getStats(req: Request, res: Response) {
    try {
      // Always try to get relayer balance first
      const relayerBalance = await this.aptosService.getAccountBalance(
        this.aptosService.getRelayerAddress()
      );

      if (!db) {
        // Return minimal stats when database is not available
        return res.json({
          totalTransactions: 0,
          successfulTransactions: 0,
          failedTransactions: 0,
          totalRevenue: '0',
          aptBalance: relayerBalance,
          avgResponseTime: 0,
          note: 'Database not configured - detailed stats unavailable'
        });
      }

      // Try to query database stats
      try {
        const stats = await db('transactions')
          .select(
            db.raw('COUNT(*) as total_transactions'),
            db.raw("COUNT(CASE WHEN status = 'success' THEN 1 END) as successful_transactions"),
            db.raw("COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_transactions"),
            db.raw('SUM(CAST(relayer_fee as BIGINT)) as total_revenue')
          )
          .first();

        res.json({
          totalTransactions: parseInt(stats.total_transactions),
          successfulTransactions: parseInt(stats.successful_transactions),
          failedTransactions: parseInt(stats.failed_transactions),
          totalRevenue: stats.total_revenue || '0',
          aptBalance: relayerBalance,
          avgResponseTime: 0 // TODO: Implement response time tracking
        });
      } catch (dbError) {
        // Database connection failed, return fallback stats
        logger.warn('Database query failed, returning fallback stats:', dbError);
        res.json({
          totalTransactions: 0,
          successfulTransactions: 0,
          failedTransactions: 0,
          totalRevenue: '0',
          aptBalance: relayerBalance,
          avgResponseTime: 0,
          note: 'Database temporarily unavailable'
        });
      }
    } catch (error) {
      const errAny = error as any;
      if (errAny && (errAny.upstream || errAny.code === 'EAI_AGAIN' || errAny.code === 'UPSTREAM_UNAVAILABLE' || (errAny.message && (errAny.message.includes('EAI_AGAIN') || errAny.message.includes('getaddrinfo'))))) {
        logger.error('Upstream Aptos RPC failure while getting stats:', errAny);
        return res.status(503).json({ error: 'Upstream Aptos RPC unreachable' });
      }
      logger.error('Error getting stats:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // NEW: Proper gasless quote endpoint
  async getGaslessQuote(req: Request, res: Response) {
    try {
      const { error, value } = gaslessQuoteRequestSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }

      const { fromAddress, toAddress, amount, coinType }: GaslessQuoteRequest = value;

      // HYBRID FEE CALCULATION: max(0.1% of amount, oracle-based gas cost + 20% markup)
      const amountBN = new BigNumber(amount);
      
      // Get oracle-based gas fee from gasService
      const gasQuote = await this.gasService.calculateGasQuote(fromAddress, toAddress, amount, coinType);
      const oracleBasedFee = new BigNumber(gasQuote.relayerFee);
      
      // Simple percentage fee (0.1% of amount with 0.001 USDC minimum)
      const percentageFee = BigNumber.max(
        amountBN.multipliedBy(0.001), // 0.1% fee
        new BigNumber(1000) // 0.001 USDC minimum (6 decimals)
      );
      
      // Hybrid: Use the HIGHER of the two fees (protects relayer, fair to users)
      const relayerFee = BigNumber.max(percentageFee, oracleBasedFee);
      
      // Log hybrid fee decision for monitoring
      logger.info('🔄 Hybrid Fee Calculation', {
        amount: `${amountBN.div(1e6).toFixed(6)} USDC`,
        percentageFee: `${percentageFee.div(1e6).toFixed(6)} USDC (0.1%)`,
        oracleBasedFee: `${oracleBasedFee.div(1e6).toFixed(6)} USDC (oracle)`,
        finalFee: `${relayerFee.div(1e6).toFixed(6)} USDC`,
        winner: percentageFee.gte(oracleBasedFee) ? 'percentage' : 'oracle'
      });

      // Check user has enough USDC for transaction + fee
      const userBalance = await this.aptosService.getCoinBalance(fromAddress, coinType);
      const totalNeeded = amountBN.plus(relayerFee);

      if (new BigNumber(userBalance).lt(totalNeeded)) {
        return res.status(400).json({ 
          error: `Insufficient balance. Need ${totalNeeded.div(1e6).toFixed(6)} USDC, have ${new BigNumber(userBalance).div(1e6).toFixed(6)} USDC` 
        });
      }

      // Check relayer APT balance
      const relayerBalance = await this.aptosService.getAccountBalance(
        this.aptosService.getRelayerAddress()
      );
      if (new BigNumber(relayerBalance).lt(config.minAptBalance)) {
        logger.error('Relayer APT balance too low:', relayerBalance);
        return res.status(503).json({ error: 'Service temporarily unavailable' });
      }

      // Get gas estimate (already calculated above for hybrid fee)
      const quote = gasQuote;

      // Return transaction details for user to sign
      res.json({
        success: true,
        quote: {
          relayerFee: relayerFee.toString(),
          gasUnits: quote.gasUnits,
          gasPricePerUnit: quote.gasPricePerUnit,
          totalGasFee: quote.totalGasFee,
          aptPrice: quote.aptPrice
        },
        transactionData: {
          function: `${config.contractAddress}::smoothsend::send_with_fee`,
          typeArguments: [coinType],
          functionArguments: [
            this.aptosService.getRelayerAddress(), // relayer gets fee
            toAddress, // recipient
            amount, // amount to send
            relayerFee.toString() // relayer fee
          ]
        },
        message: 'Quote ready. User should sign transaction with withFeePayer: true'
      });

    } catch (error) {
      const errAny = error as any;
      if (errAny && (errAny.code === 'EAI_AGAIN' || (errAny.message && (errAny.message.includes('EAI_AGAIN') || errAny.message.includes('getaddrinfo'))))) {
        logger.error('Upstream DNS error contacting Aptos RPC while generating gasless quote:', errAny);
        return res.status(503).json({ error: 'Upstream Aptos RPC unreachable' });
      }
      logger.error('Error generating gasless quote:', error);
      res.status(500).json({ error: 'Failed to generate quote' });
    }
  }

  // NEW: Proper gasless submit with user-signed transaction
  async submitGaslessTransaction(req: Request, res: Response) {
    let transactionId: string | null = null;
    
    try {
      const { error, value } = gaslessSubmitRequestSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }

      const { 
        transaction,
        userSignature, 
        fromAddress, 
        toAddress, 
        amount, 
        coinType, 
        relayerFee 
      }: GaslessSubmitRequest = value;

      // BETA SAFETY: Validate transaction limits
      const safetyCheck = await safetyMonitor.validateTransaction(fromAddress, amount);
      if (!safetyCheck.allowed) {
        logger.warn('🚫 BETA SAFETY: Transaction blocked', {
          from: fromAddress,
          amount: (parseInt(amount) / 1e6).toFixed(3) + ' USDC',
          reason: safetyCheck.reason
        });
        return res.status(400).json({ 
          error: `Beta Safety Limit: ${safetyCheck.reason}`,
          betaInfo: 'Currently in beta with daily limits. Contact support for higher limits.'
        });
      }

      logger.info('🎯 GASLESS SUBMIT: Proper two-signature flow', {
        from: fromAddress,
        to: toAddress,
        amount: (parseInt(amount) / 1e6).toFixed(3) + ' USDC',
        relayerFee: (parseInt(relayerFee) / 1e6).toFixed(6) + ' USDC',
        hasTransaction: !!transaction,
        hasUserSignature: !!userSignature
      });

      // Check relayer APT balance
      const relayerBalance = await this.aptosService.getAccountBalance(
        this.aptosService.getRelayerAddress()
      );
      if (new BigNumber(relayerBalance).lt(config.minAptBalance)) {
        logger.error('Relayer APT balance too low:', relayerBalance);
        return res.status(503).json({ error: 'Service temporarily unavailable' });
      }

      // Get actual gas quote for accurate database tracking
      const gasQuote = await this.gasService.calculateGasQuote(
        fromAddress,
        toAddress,
        amount,
        coinType
      );

      // Create transaction record (non-blocking)
      transactionId = uuidv4();
      try {
        if (db) {
          await db('transactions').insert({
            id: transactionId,
            from_address: fromAddress,
            to_address: toAddress,
            amount,
            coin_type: coinType,
            gas_units: gasQuote.gasUnits,
            gas_price: gasQuote.gasPricePerUnit,
            total_gas_fee: gasQuote.totalGasFee,
            apt_price: gasQuote.aptPrice.toString(),
            usdc_fee: gasQuote.usdcFee, // Actual oracle-based USDC fee
            relayer_fee: relayerFee,
            treasury_fee: gasQuote.treasuryFee || '0',
            status: 'pending'
          });
        }
      } catch (dbError) {
        logger.warn('Database insert failed, continuing without tracking:', dbError);
      }

      // Submit the gasless transaction with relayer as sponsor
      const hash = await this.aptosService.submitGaslessWithSponsor(
        transaction,
        userSignature,
        fromAddress,
        toAddress,
        amount,
        coinType,
        relayerFee
      );

      // Update transaction with hash and success status (non-blocking)
      try {
        if (db) {
          await db('transactions')
            .where('id', transactionId)
            .update({ 
              hash,
              status: 'success' // Mark as successful after submission
            });
        }
      } catch (dbError) {
        logger.warn('Database update failed:', dbError);
      }

      // BETA SAFETY: Record successful transaction for monitoring
      await safetyMonitor.recordTransaction(fromAddress, amount);

      res.json({ 
        success: true,
        transactionId,
        hash,
        gasFeePaidBy: 'relayer',
        userPaidAPT: false,
        relayerFee,
        message: 'Gasless transaction submitted! User pays 0 APT, relayer sponsors all gas.'
      });

    } catch (error) {
      const errAny = error as any;
      if (errAny && (errAny.code === 'EAI_AGAIN' || (errAny.message && (errAny.message.includes('EAI_AGAIN') || errAny.message.includes('getaddrinfo'))))) {
        logger.error('Upstream DNS error contacting Aptos RPC while submitting gasless transaction:', errAny);
        // Mark transaction as failed in database (non-blocking)
        try {
          if (db && transactionId) {
            await db('transactions')
              .where('id', transactionId)
              .update({ 
                status: 'failed',
                error_message: 'Upstream Aptos RPC unreachable (DNS failure)'
              });
          }
        } catch (dbError) {
          logger.warn('Database error update failed:', dbError);
        }
        return res.status(503).json({ error: 'Upstream Aptos RPC unreachable' });
      }
      logger.error('Error submitting gasless transaction:', error);
      
      // Mark transaction as failed in database (non-blocking)
      try {
        if (db && transactionId) {
          await db('transactions')
            .where('id', transactionId)
            .update({ 
              status: 'failed',
              error_message: error instanceof Error ? error.message : String(error)
            });
        }
      } catch (dbError) {
        logger.warn('Database error update failed:', dbError);
      }
      
      res.status(500).json({ error: 'Failed to submit gasless transaction' });
    }
  }

  // The following methods are SAFE and working - user pays USDC fees:

  async submitGaslessWithWallet(req: Request, res: Response): Promise<Response> {
    try {
      const { error, value } = gaslessWithWalletRequestSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ 
          success: false, 
          error: error.details[0].message 
        });
      }

      const { userSignature, fromAddress, toAddress, amount, coinType, relayerFee } = value;

      logger.info('🎯 GASLESS WITH WALLET: Processing user-signed transaction', {
        from: fromAddress,
        to: toAddress,
        amount: (parseInt(amount) / 1e6).toFixed(3) + ' USDC',
        relayerFee: (parseInt(relayerFee) / 1e6).toFixed(6) + ' USDC',
        userApproved: 'Yes ✅'
      });

      // Submit the gasless transaction with proper user signature handling
      const transactionHash = await this.aptosService.submitGaslessWithSponsor(
        null, // transaction will be rebuilt on backend
        userSignature, // user signature from wallet
        fromAddress,
        toAddress, 
        amount,
        coinType,
        relayerFee
      );

      // Try to store in database (non-blocking)
      try {
        if (db) {
          const transactionId = `wallet-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          await db('transactions').insert({
            id: transactionId,
            sender_address: fromAddress,
            recipient_address: toAddress,
            amount: amount,
            coin_type: coinType,
            relayer_fee: relayerFee,
            transaction_hash: transactionHash,
            status: 'completed',
            gas_fee_paid_by: 'relayer',
            user_paid_apt: false,
            created_at: new Date(),
            updated_at: new Date()
          });
        }
      } catch (dbError) {
        logger.warn('Database insert failed (non-blocking):', dbError);
      }

      logger.info('🎉 WALLET GASLESS SUCCESS!', {
        hash: transactionHash,
        userExperience: 'Saw full transaction details in wallet ✅',
        userApproval: 'Explicitly approved transaction ✅',
        gasFeePaidBy: 'Relayer ✅',
        transparency: 'Full transaction breakdown shown ✅'
      });

      return res.json({
        success: true,
        transactionId: `wallet-${Date.now()}`,
        hash: transactionHash,
        gasFeePaidBy: 'relayer',
        userPaidAPT: false,
        transparency: 'User saw full transaction details',
        message: 'GASLESS WITH WALLET: User approved transaction, relayer paid gas!'
      });

    } catch (error) {
      logger.error('Error submitting gasless transaction with wallet:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to submit gasless transaction' 
      });
    }
  }

  // BETA SAFETY: Get current safety statistics
  async getSafetyStats(req: Request, res: Response) {
    try {
      const stats = safetyMonitor.getStats();
      res.json({
        success: true,
        betaLimits: {
          maxSingleTransaction: stats.maxSingleTransaction,
          maxUserDaily: stats.maxUserDaily,
          maxDailyVolume: stats.maxDailyVolume,
          currentDailyVolume: stats.dailyVolume
        },
        usage: {
          dailyVolumeUsed: `${stats.dailyVolume.toFixed(2)} USDC`,
          dailyVolumeRemaining: `${(stats.maxDailyVolume - stats.dailyVolume).toFixed(2)} USDC`,
          utilizationPercentage: `${((stats.dailyVolume / stats.maxDailyVolume) * 100).toFixed(1)}%`
        },
        status: stats.dailyVolume > (stats.maxDailyVolume * 0.8) ? 'warning' : 'normal'
      });
    } catch (error) {
      logger.error('Error getting safety stats:', error);
      res.status(500).json({ error: 'Failed to get safety statistics' });
    }
  }
} 