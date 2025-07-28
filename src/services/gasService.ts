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
      // Calculate relayer fee first for simulation
      const amountBN = new BigNumber(amount);
      const relayerFee = BigNumber.max(
        amountBN.multipliedBy(0.001), // 0.1% fee
        new BigNumber(1000) // 0.001 USDC minimum (6 decimals)
      ).toString();

      // Simulate transaction to get gas estimate
      const gasEstimate = await this.aptosService.simulateSponsoredTransaction(
        fromAddress,
        toAddress,
        amount,
        coinType,
        relayerFee
      );

      // Get current APT price
      const aptPrice = await this.priceService.getAptPrice();

      // Calculate gas fee
      const gasUnits = gasEstimate.gasUnits;
      const gasPricePerUnit = gasEstimate.gasPricePerUnit;
      const totalGasFee = new BigNumber(gasUnits).multipliedBy(gasPricePerUnit).toString();

      // Convert gas fee to USDC equivalent
      const totalGasFeeInAPT = new BigNumber(totalGasFee).dividedBy(1e8);
      const usdcFee = totalGasFeeInAPT.multipliedBy(aptPrice).multipliedBy(1e6);

      // Treasury fee (small percentage)
      const treasuryFee = new BigNumber(relayerFee).multipliedBy(0.1);

      return {
        gasUnits,
        gasPricePerUnit,
        totalGasFee,
        aptPrice: aptPrice.toString(),
        usdcFee: usdcFee.toFixed(0),
        relayerFee: relayerFee,
        treasuryFee: treasuryFee.toFixed(0)
      };
    } catch (error) {
      logger.error('Error calculating gas quote:', error);
      throw new Error('Failed to calculate gas quote');
    }
  }
} 