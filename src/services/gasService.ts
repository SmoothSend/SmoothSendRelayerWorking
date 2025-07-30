import { AptosService } from './aptosService';
import { PriceService } from './priceService';
import BigNumber from 'bignumber.js';
import { TransactionQuote } from '../types';
import { logger } from '../utils/logger';

export class GasService {
  constructor(
    private aptosService: AptosService,
    private priceService: PriceService
  ) {}

  async calculateGasQuote(
    fromAddress: string,
    toAddress: string,
    amount: string,
    coinType: string
  ): Promise<TransactionQuote> {
    try {
      // PRODUCTION: Calculate relayer fee based on actual gas cost + oracle price
      logger.info('🔥 PRODUCTION: Calculating gas-based fee using APT price oracle');
      
      // Get current APT price from oracle
      const aptPrice = await this.priceService.getAptPrice();
      
      // Calculate a temporary relayer fee for simulation
      const amountBN = new BigNumber(amount);
      const tempRelayerFee = BigNumber.max(
        amountBN.multipliedBy(0.001), // 0.1% fee as fallback
        new BigNumber(1000) // 0.001 USDC minimum (6 decimals)
      ).toString();

      // Simulate transaction to get accurate gas estimate
      const gasEstimate = await this.aptosService.simulateSponsoredTransaction(
        fromAddress,
        toAddress,
        amount,
        coinType,
        tempRelayerFee
      );

      // Calculate actual gas cost in APT and convert to USDC
      const gasUnits = parseInt(gasEstimate.gasUnits);
      const gasPricePerUnit = parseInt(gasEstimate.gasPricePerUnit);
      const totalGasFeeInOctas = gasUnits * gasPricePerUnit;
      const totalGasFeeInAPT = totalGasFeeInOctas / 1e8; // Convert octas to APT
      const gasCostInUSD = totalGasFeeInAPT * aptPrice;
      
      // Add relayer markup (50% markup for business sustainability)
      const relayerMarkup = 1.5; // 50% markup
      const totalCostWithMarkup = gasCostInUSD * relayerMarkup;
      
      // Convert to USDC (6 decimals) and ensure minimum fee
      const calculatedRelayerFeeUSDC = Math.ceil(totalCostWithMarkup * 1e6);
      const minimumFeeUSDC = 1000; // 0.001 USDC minimum
      const gasBasedFee = Math.max(calculatedRelayerFeeUSDC, minimumFeeUSDC);

      // For comparison, calculate the simple percentage-based fee
      const percentageBasedFee = parseInt(tempRelayerFee);

      // Use whichever is higher: gas-based fee or percentage-based fee
      const finalRelayerFee = Math.max(gasBasedFee, percentageBasedFee);

      logger.info('� PRODUCTION Gas Fee Calculation', {
        aptPrice: `$${aptPrice.toFixed(4)}`,
        gasUnits,
        gasPricePerUnit,
        gasCostAPT: `${totalGasFeeInAPT.toFixed(6)} APT`,
        gasCostUSD: `$${gasCostInUSD.toFixed(6)}`,
        withMarkup: `$${totalCostWithMarkup.toFixed(6)} (+50%)`,
        gasBasedFeeUSDC: `${(gasBasedFee / 1e6).toFixed(6)} USDC`,
        percentageBasedFee: `${(percentageBasedFee / 1e6).toFixed(6)} USDC`,
        finalFee: `${(finalRelayerFee / 1e6).toFixed(6)} USDC`,
        strategy: gasBasedFee > percentageBasedFee ? 'gas-based' : 'percentage-based'
      });

      // Calculate total gas fee for frontend display
      const totalGasFee = new BigNumber(gasUnits).multipliedBy(gasPricePerUnit).toString();
      
      // Treasury fee (small percentage of relayer fee)
      const treasuryFee = new BigNumber(finalRelayerFee).multipliedBy(0.1);

      return {
        gasUnits: gasEstimate.gasUnits,
        gasPricePerUnit: gasEstimate.gasPricePerUnit,
        totalGasFee,
        aptPrice: aptPrice.toString(),
        usdcFee: finalRelayerFee.toString(),
        relayerFee: finalRelayerFee.toString(),
        treasuryFee: treasuryFee.toFixed(0)
      };
    } catch (error) {
      logger.error('Error calculating gas quote:', error);
      throw new Error('Failed to calculate gas quote');
    }
  }
} 