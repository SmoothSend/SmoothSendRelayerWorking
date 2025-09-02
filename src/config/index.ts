import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000'),
  aptosNetwork: process.env.APTOS_NETWORK || 'testnet',
  relayerPrivateKey: process.env.RELAYER_PRIVATE_KEY!,
  contractAddress: process.env.CONTRACT_ADDRESS!,
  pythHermesUrl: process.env.PYTH_HERMES_URL || 'https://hermes.pyth.network',
  aptosRpcUrl: process.env.APTOS_RPC_URL!,
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  databaseUrl: process.env.DATABASE_URL, // Optional - no exclamation mark
  feeMarkupPercentage: parseInt(process.env.FEE_MARKUP_PERCENTAGE || '10'),
  minAptBalance: parseInt(process.env.MIN_APT_BALANCE || '1000000000'),
  maxTransactionAmount: parseInt(process.env.MAX_TRANSACTION_AMOUNT || '1000000000'),
  treasuryAddress: process.env.TREASURY_ADDRESS!,
  logLevel: process.env.LOG_LEVEL || 'info',
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'),
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  priceCacheTtl: parseInt(process.env.PRICE_CACHE_TTL || '30'),
  gasEstimateBuffer: parseInt(process.env.GAS_ESTIMATE_BUFFER || '20'),
  
  // Security Configuration
  allowedOrigins: process.env.ALLOWED_ORIGINS || 'http://localhost:3001',
  corsCredentials: process.env.CORS_CREDENTIALS === 'true',
  maxRequestSize: process.env.MAX_REQUEST_SIZE || '1mb',
  enableSecurityHeaders: process.env.ENABLE_SECURITY_HEADERS !== 'false',
  hstsMaxAge: parseInt(process.env.HSTS_MAX_AGE || '31536000')
}; 