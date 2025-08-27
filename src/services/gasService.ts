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
      // Calculate transaction amount in USD for smart oracle usage
      const amountUSD = parseInt(amount) / 1e6; // Convert USDC to USD
      
      // SMART ORACLE: Use oracle only for large transactions
      logger.info('🔥 PRODUCTION: Smart oracle calculation', {
        transactionAmount: `$${amountUSD}`,
        strategy: amountUSD >= 1000 ? 'Oracle (high value)' : 'Fixed price (beta/low value)'
      });
      
      // Get APT price with smart oracle logic
      const aptPrice = await this.priceService.getAptPrice(amountUSD);
      
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
      
      // Convert gas cost to USDC (6 decimals)
      const gasCostInUSDC = Math.ceil(gasCostInUSD * 1e6); // Convert to USDC micro units
      
      // Add relayer markup (20% markup)
      const markup = 0.20; // 20% markup
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
        markupAmount: `${(markupAmount / 1e6).toFixed(6)} USDC (20%)`,
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