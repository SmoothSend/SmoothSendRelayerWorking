import dotenv from 'dotenv';
import { validateBackendEnv } from './env-schema';

dotenv.config();

// Validate environment variables at startup
const env = validateBackendEnv();

export const config = {
  port: env.PORT,
  aptosNetwork: env.APTOS_NETWORK,
  relayerPrivateKey: env.RELAYER_PRIVATE_KEY,
  contractAddress: env.SMOOTHSEND_CONTRACT_ADDRESS,
  pythHermesUrl: env.PYTH_HERMES_URL,
  aptosRpcUrl: env.APTOS_RPC_URL,
  redisUrl: env.REDIS_URL,
  databaseUrl: env.DATABASE_URL,
  feeMarkupPercentage: env.FEE_MARKUP_PERCENTAGE,
  minAptBalance: env.MIN_APT_BALANCE,
  maxTransactionAmount: env.MAX_TRANSACTION_AMOUNT,
  treasuryAddress: env.TREASURY_ADDRESS,
  logLevel: env.LOG_LEVEL,
  rateLimitWindowMs: env.RATE_LIMIT_WINDOW_MS,
  rateLimitMaxRequests: env.RATE_LIMIT_MAX_REQUESTS,
  priceCacheTtl: env.PRICE_CACHE_TTL,
  gasEstimateBuffer: env.GAS_ESTIMATE_BUFFER,
  
  // Security Configuration
  allowedOrigins: env.ALLOWED_ORIGINS,
  corsCredentials: env.CORS_CREDENTIALS,
  maxRequestSize: env.MAX_REQUEST_SIZE,
  enableSecurityHeaders: env.ENABLE_SECURITY_HEADERS,
  hstsMaxAge: env.HSTS_MAX_AGE,
  
  // Legacy support for existing code
  usdcContractAddress: env.USDC_CONTRACT_ADDRESS,
  relayerAddress: env.RELAYER_ADDRESS,
}; 