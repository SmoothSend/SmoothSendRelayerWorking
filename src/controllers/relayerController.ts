import { Request, Response } from 'express';
import { AptosService } from '../services/aptosService';
import { PriceService } from '../services/priceService';
import { GasService } from '../services/gasService';
import { 
  transferRequestSchema, 
  sponsoredTransferRequestSchema, 
  sponsoredBuildRequestSchema,
  gaslessQuoteRequestSchema,
  gaslessSubmitRequestSchema,
  addressSchema 
} from '../utils/validation';
import { 
  TransferRequest, 
  SponsoredTransferRequest, 
  SponsoredTransactionBuild,
  GaslessQuoteRequest,
  GaslessSubmitRequest
} from '../types';
import { config } from '../config';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import BigNumber from 'bignumber.js';
import { db } from '../database/postgres';

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

      const { fromAddress, toAddress, amount, coinType }: TransferRequest = value;

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
      logger.error('Error getting quote:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getSponsoredQuote(req: Request, res: Response) {
    try {
      const { error, value } = sponsoredBuildRequestSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }

      const { fromAddress, toAddress, amount, coinType, relayerFee }: SponsoredTransactionBuild = value;

      // Check if amount exceeds maximum
      const amountBN = new BigNumber(amount);
      if (amountBN.gt(config.maxTransactionAmount)) {
        return res.status(400).json({ 
          error: `Transaction amount exceeds maximum of ${config.maxTransactionAmount}` 
        });
      }

      // Check user balance (amount + relayer fee)
      const userBalance = await this.aptosService.getCoinBalance(fromAddress, coinType);
      const totalNeeded = amountBN.plus(relayerFee);
      if (totalNeeded.gt(userBalance)) {
        return res.status(400).json({ error: 'Insufficient balance for amount + relayer fee' });
      }

      // Simulate sponsored transaction
      const { gasUnits, gasPricePerUnit } = await this.aptosService.simulateSponsoredTransaction(
        fromAddress,
        toAddress,
        amount,
        coinType,
        relayerFee
      );

      // Calculate costs
      const totalGasFeeBN = new BigNumber(gasUnits).multipliedBy(gasPricePerUnit);
      const totalGasFee = totalGasFeeBN.toString();

      // Convert APT to USD for display
      const aptPrice = await this.priceService.getAptPrice();
      const aptAmount = totalGasFeeBN.dividedBy(1e8).toNumber();
      const usdGasCost = aptAmount * aptPrice;

      res.json({
        gasUnits,
        gasPricePerUnit,
        totalGasFee,
        aptPrice: aptPrice.toString(),
        gasCostUsd: usdGasCost.toFixed(6),
        relayerFee,
        userPaysGas: false,
        message: 'Relayer will pay all gas costs'
      });
    } catch (error) {
      logger.error('Error getting sponsored quote:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async buildSponsoredTransaction(req: Request, res: Response) {
    try {
      const { error, value } = sponsoredBuildRequestSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }

      const { fromAddress, toAddress, amount, coinType, relayerFee }: SponsoredTransactionBuild = value;

      // Check relayer APT balance
      const relayerBalance = await this.aptosService.getAccountBalance(
        this.aptosService.getRelayerAddress()
      );
      if (new BigNumber(relayerBalance).lt(config.minAptBalance)) {
        logger.error('Relayer APT balance too low:', relayerBalance);
        return res.status(503).json({ error: 'Service temporarily unavailable' });
      }

      // Build transaction for user to sign
      const transaction = await this.aptosService.buildSponsoredTransaction(
        fromAddress,
        toAddress,
        amount,
        coinType,
        relayerFee
      );

      // Convert BigInt values to strings for JSON serialization
      const serializableTransaction = JSON.parse(JSON.stringify(transaction, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value
      ));

      res.json({
        transaction: serializableTransaction,
        message: 'Transaction built successfully. User needs to sign this transaction.',
        instructions: {
          step1: 'User signs this transaction with their private key',
          step2: 'Send signed transaction to /sponsored-submit endpoint',
          step3: 'Relayer will pay gas fees and submit transaction'
        }
      });
    } catch (error) {
      logger.error('Error building sponsored transaction:', error);
      res.status(500).json({ error: 'Failed to build sponsored transaction' });
    }
  }

  async submitSponsoredTransaction(req: Request, res: Response) {
    try {
      const { error, value } = sponsoredTransferRequestSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }

      const { fromAddress, toAddress, amount, coinType, relayerFee, userSignature }: SponsoredTransferRequest = value;

      if (!userSignature) {
        return res.status(400).json({ error: 'User signature required for sponsored transaction' });
      }

      // Check relayer APT balance
      const relayerBalance = await this.aptosService.getAccountBalance(
        this.aptosService.getRelayerAddress()
      );
      if (new BigNumber(relayerBalance).lt(config.minAptBalance)) {
        logger.error('Relayer APT balance too low:', relayerBalance);
        return res.status(503).json({ error: 'Service temporarily unavailable' });
      }

      // Get gas estimate
      const { gasUnits, gasPricePerUnit } = await this.aptosService.simulateSponsoredTransaction(
        fromAddress,
        toAddress,
        amount,
        coinType,
        relayerFee
      );

      // Create transaction record
      const transactionId = uuidv4();
      try {
        await db('transactions').insert({
          id: transactionId,
          from_address: fromAddress,
          to_address: toAddress,
          amount,
          coin_type: coinType,
          gas_units: gasUnits,
          gas_price: gasPricePerUnit,
          total_gas_fee: new BigNumber(gasUnits).multipliedBy(gasPricePerUnit).toString(),
          apt_price: (await this.priceService.getAptPrice()).toString(),
          usdc_fee: '0', // User doesn't pay gas in USDC
          relayer_fee: relayerFee,
          treasury_fee: '0',
          status: 'pending'
        });
      } catch (dbError) {
        logger.warn('Database insert failed, continuing without tracking:', dbError);
      }

      // Parse user signature (simplified - in production you'd validate this properly)
      const userAuthenticator = JSON.parse(userSignature);

      // Submit the sponsored transaction
      const hash = await this.aptosService.submitSponsoredTransaction(
        userAuthenticator,
        fromAddress,
        toAddress,
        amount,
        coinType,
        relayerFee,
        gasUnits,
        gasPricePerUnit
      );

      // Update transaction with hash
      try {
        await db('transactions')
          .where('id', transactionId)
          .update({ hash });
      } catch (dbError) {
        logger.warn('Database update failed:', dbError);
      }

      res.json({ 
        transactionId,
        hash,
        message: 'Sponsored transaction submitted successfully!',
        gasFeePaidBy: 'relayer',
        userPaidGas: false
      });
    } catch (error) {
      logger.error('Error submitting sponsored transaction:', error);
      res.status(500).json({ error: 'Failed to submit sponsored transaction' });
    }
  }

  async submitTransaction(req: Request, res: Response) {
    try {
      const { error, value } = transferRequestSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }

      const { fromAddress, toAddress, amount, coinType }: TransferRequest = value;

      // Check relayer APT balance
      const relayerBalance = await this.aptosService.getAccountBalance(
        this.aptosService.getRelayerAddress()
      );
      if (new BigNumber(relayerBalance).lt(config.minAptBalance)) {
        logger.error('Relayer APT balance too low:', relayerBalance);
        return res.status(503).json({ error: 'Service temporarily unavailable' });
      }

      // Get fresh gas quote
      const quote = await this.gasService.calculateGasQuote(
        fromAddress,
        toAddress,
        amount,
        coinType
      );

      // Create transaction record (non-blocking)
      const transactionId = uuidv4();
      try {
        await db('transactions').insert({
          id: transactionId,
          from_address: fromAddress,
          to_address: toAddress,
          amount,
          coin_type: coinType,
          gas_units: quote.gasUnits,
          gas_price: quote.gasPricePerUnit,
          total_gas_fee: quote.totalGasFee,
          apt_price: quote.aptPrice,
          usdc_fee: quote.usdcFee,
          relayer_fee: quote.relayerFee,
          treasury_fee: quote.treasuryFee,
          status: 'pending'
        });
      } catch (dbError) {
        logger.warn('Database insert failed, continuing without tracking:', dbError);
      }

      // Submit the sponsored transaction
      const hash = await this.aptosService.submitSponsoredTransfer(
        fromAddress,
        toAddress,
        amount,
        coinType,
        quote.gasUnits,
        quote.gasPricePerUnit
      );

      // Update transaction with hash (non-blocking)
      try {
        await db('transactions')
          .where('id', transactionId)
          .update({ hash });
      } catch (dbError) {
        logger.warn('Database update failed:', dbError);
      }

      res.json({ 
        transactionId,
        hash,
        quote
      });
    } catch (error) {
      logger.error('Error submitting transaction:', error);
      res.status(500).json({ error: 'Failed to submit transaction' });
    }
  }

  async getTransactionStatus(req: Request, res: Response) {
    try {
      const { txnHash } = req.params;

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
      logger.error('Error checking health:', error);
      res.status(500).json({ 
        status: 'unhealthy',
        error: 'Health check failed'
      });
    }
  }

  async getStats(req: Request, res: Response) {
    try {
      const stats = await db('transactions')
        .select(
          db.raw('COUNT(*) as total_transactions'),
          db.raw("COUNT(CASE WHEN status = 'success' THEN 1 END) as successful_transactions"),
          db.raw("COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_transactions"),
          db.raw('SUM(CAST(relayer_fee as BIGINT)) as total_revenue')
        )
        .first();

      const relayerBalance = await this.aptosService.getAccountBalance(
        this.aptosService.getRelayerAddress()
      );

      res.json({
        totalTransactions: parseInt(stats.total_transactions),
        successfulTransactions: parseInt(stats.successful_transactions),
        failedTransactions: parseInt(stats.failed_transactions),
        totalRevenue: stats.total_revenue || '0',
        aptBalance: relayerBalance,
        avgResponseTime: 0 // TODO: Implement response time tracking
      });
    } catch (error) {
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

      // Calculate relayer fee (0.1% of amount or minimum 0.001 USDC)
      const amountBN = new BigNumber(amount);
      const relayerFee = BigNumber.max(
        amountBN.multipliedBy(0.001), // 0.1% fee
        new BigNumber(1000) // 0.001 USDC minimum (6 decimals)
      );

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

      // Get gas estimate
      const quote = await this.gasService.calculateGasQuote(
        fromAddress,
        toAddress,
        amount,
        coinType
      );

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
      logger.error('Error generating gasless quote:', error);
      res.status(500).json({ error: 'Failed to generate quote' });
    }
  }

  // NEW: Proper gasless submit with user-signed transaction
  async submitGaslessTransaction(req: Request, res: Response) {
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

      // Create transaction record (non-blocking)
      const transactionId = uuidv4();
      try {
        await db('transactions').insert({
          id: transactionId,
          from_address: fromAddress,
          to_address: toAddress,
          amount,
          coin_type: coinType,
          gas_units: '1000', // Will be updated after submission
          gas_price: '100',
          total_gas_fee: '100000',
          apt_price: '5.0',
          usdc_fee: '0', // User doesn't pay gas in USDC for sponsored transactions
          relayer_fee: relayerFee,
          treasury_fee: '0',
          status: 'pending'
        });
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

      // Update transaction with hash (non-blocking)
      try {
        await db('transactions')
          .where('id', transactionId)
          .update({ hash });
      } catch (dbError) {
        logger.warn('Database update failed:', dbError);
      }

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
      logger.error('Error submitting gasless transaction:', error);
      res.status(500).json({ error: 'Failed to submit gasless transaction' });
    }
  }

  async submitProperSponsoredTransaction(req: Request, res: Response) {
    try {
      const { error, value } = transferRequestSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }

      const { fromAddress, toAddress, amount, coinType }: TransferRequest = value;

      // Check user has enough USDC for transaction + fee
      const userBalance = await this.aptosService.getCoinBalance(fromAddress, coinType);
      const amountBN = new BigNumber(amount);
      const relayerFee = BigNumber.max(
        amountBN.multipliedBy(0.001), // 0.1% fee
        new BigNumber(1000) // 0.001 USDC minimum
      );
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

      // Get gas estimate
      const quote = await this.gasService.calculateGasQuote(
        fromAddress,
        toAddress,
        amount,
        coinType
      );

      // Create transaction record (non-blocking)
      const transactionId = uuidv4();
      try {
        await db('transactions').insert({
          id: transactionId,
          from_address: fromAddress,
          to_address: toAddress,
          amount,
          coin_type: coinType,
          gas_units: quote.gasUnits,
          gas_price: quote.gasPricePerUnit,
          total_gas_fee: quote.totalGasFee,
          apt_price: quote.aptPrice,
          usdc_fee: '0', // User doesn't pay gas in USDC for sponsored transactions
          relayer_fee: relayerFee.toString(),
          treasury_fee: '0',
          status: 'pending'
        });
      } catch (dbError) {
        logger.warn('Database insert failed, continuing without tracking:', dbError);
      }

      // Submit the PROPER sponsored transaction
      const hash = await this.aptosService.submitProperSponsoredTransaction(
        fromAddress,
        toAddress,
        amount,
        coinType,
        quote.gasUnits,
        quote.gasPricePerUnit
      );

      // Update transaction with hash (non-blocking)
      try {
        await db('transactions')
          .where('id', transactionId)
          .update({ hash });
      } catch (dbError) {
        logger.warn('Database update failed:', dbError);
      }

      res.json({ 
        transactionId,
        hash,
        success: true,
        gasFeePaidBy: 'relayer',
        userPaidAPT: false,
        relayerFee: relayerFee.toString(),
        message: 'Proper sponsored transaction submitted! User pays 0 APT, relayer pays all gas.'
      });
    } catch (error) {
      logger.error('Error submitting proper sponsored transaction:', error);
      res.status(500).json({ error: 'Failed to submit sponsored transaction' });
    }
  }

  async submitTrueGaslessTransaction(req: Request, res: Response) {
    try {
      const { error, value } = transferRequestSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }

      const { fromAddress, toAddress, amount, coinType }: TransferRequest = value;

      // Check user has enough USDC for transaction + fees (will be calculated)
      const userBalance = await this.aptosService.getCoinBalance(fromAddress, coinType);
      if (new BigNumber(userBalance).lt(new BigNumber(amount))) {
        return res.status(400).json({ 
          error: `Insufficient USDC balance. Need at least ${new BigNumber(amount).div(1e6).toFixed(6)} USDC for transaction` 
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

      // Get gas estimate
      const quote = await this.gasService.calculateGasQuote(
        fromAddress,
        toAddress,
        amount,
        coinType
      );

      // Create transaction record (non-blocking)
      const transactionId = uuidv4();
      try {
        await db('transactions').insert({
          id: transactionId,
          from_address: fromAddress,
          to_address: toAddress,
          amount,
          coin_type: coinType,
          gas_units: quote.gasUnits,
          gas_price: quote.gasPricePerUnit,
          total_gas_fee: quote.totalGasFee,
          apt_price: quote.aptPrice,
          usdc_fee: '0', // User doesn't pay gas in USDC for sponsored transactions
          relayer_fee: '0', // Will be calculated in service
          treasury_fee: '0',
          status: 'pending'
        });
      } catch (dbError) {
        logger.warn('Database insert failed, continuing without tracking:', dbError);
      }

      // Submit TRUE gasless transaction
      const hash = await this.aptosService.submitTrueGaslessTransaction(
        fromAddress,
        toAddress,
        amount,
        coinType,
        quote.gasUnits,
        quote.gasPricePerUnit
      );

      // Update transaction with hash (non-blocking)
      try {
        await db('transactions')
          .where('id', transactionId)
          .update({ hash });
      } catch (dbError) {
        logger.warn('Database update failed:', dbError);
      }

      res.json({ 
        success: true,
        transactionId,
        hash,
        gasFeePaidBy: 'relayer',
        userPaidAPT: false,
        message: 'TRUE GASLESS: User pays USDC (amount + 10% gas markup), relayer pays ALL gas in APT!'
      });

    } catch (error) {
      logger.error('Error submitting true gasless transaction:', error);
      res.status(500).json({ error: 'Failed to submit true gasless transaction' });
    }
  }
} 