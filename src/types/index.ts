// Gasless transaction interfaces
export interface GaslessQuoteRequest {
  fromAddress: string;
  toAddress: string;
  amount: string;
  coinType: string;
}

export interface GaslessSubmitRequest {
  transaction: any; // Raw transaction object
  userSignature: any; // User's signature
  fromAddress: string;
  toAddress: string;
  amount: string;
  coinType: string;
  relayerFee: string;
}

export interface TransactionQuote {
  gasUnits: string;
  gasPricePerUnit: string;
  totalGasFee: string;
  aptPrice: string;
  usdcFee: string;
  relayerFee: string;
  treasuryFee: string;
}

export interface TransactionStatus {
  id: string;
  hash?: string;
  status: 'pending' | 'submitted' | 'confirmed' | 'failed';
  fromAddress: string;
  toAddress: string;
  amount: string;
  coinType: string;
  gasUnits: string;
  gasPrice: string;
  totalGasFee: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RelayerStats {
  totalTransactions: number;
  successfulTransactions: number;
  failedTransactions: number;
  totalRevenue: string;
  aptBalance: string;
  avgResponseTime: number;
} 