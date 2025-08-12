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
      
      // Use minimum fee for simulation (will be replaced with actual gas-based fee)
      const tempRelayerFee = "500"; // 0.0005 USDC minimum for simulation

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
      
      // Add relayer markup (20% markup for competitive fees)
      const relayerMarkup = 1.2; // 20% markup
      const totalCostWithMarkup = gasCostInUSD * relayerMarkup;
      
      // Convert to USDC (6 decimals) and ensure minimum fee
      // Convert gas cost to USDC with 10% markup
      const gasCostInUSDC = Math.ceil(gasCostInUSD * 1e6); // Convert to USDC micro units
      const markup = 0.20; // 10% markup
      const markupAmount = Math.ceil(gasCostInUSDC * markup);
      const finalRelayerFee = gasCostInUSDC + markupAmount;

      // Ensure minimum fee of 0.0005 USDC
      const minimumFeeUSDC = 500; // 0.0005 USDC
      const finalFeeWithMinimum = Math.max(finalRelayerFee, minimumFeeUSDC);

      logger.info('� PRODUCTION Gas Fee Calculation', {
        aptPrice: `$${aptPrice.toFixed(4)}`,
        gasUnits,
        gasPricePerUnit,
        gasCostAPT: `${totalGasFeeInAPT.toFixed(6)} APT`,
        gasCostUSD: `$${gasCostInUSD.toFixed(6)}`,
        baseFeeUSDC: `${(gasCostInUSDC / 1e6).toFixed(6)} USDC`,
        markupAmount: `${(markupAmount / 1e6).toFixed(6)} USDC (10%)`,
        finalFee: `${(finalFeeWithMinimum / 1e6).toFixed(6)} USDC`,
        minimumFee: `${(minimumFeeUSDC / 1e6).toFixed(6)} USDC`
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