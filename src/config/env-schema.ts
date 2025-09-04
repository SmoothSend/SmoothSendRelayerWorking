import { z } from 'zod';

/**
 * Shared Environment Variable Schema
 * This file defines the standardized environment variables for both frontend and backend
 */

// Base environment validation schema
const baseEnvSchema = z.object({
  // Node.js Environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // Aptos Network Configuration
  APTOS_NETWORK: z.enum(['mainnet', 'testnet', 'devnet']).default('testnet'),
  APTOS_RPC_URL: z.string().url(),
  
  // Contract Addresses (standardized naming)
  USDC_CONTRACT_ADDRESS: z.string().min(1, 'USDC contract address is required'),
  SMOOTHSEND_CONTRACT_ADDRESS: z.string().min(1, 'SmoothSend contract address is required'),
  RELAYER_ADDRESS: z.string().min(1, 'Relayer address is required'),
  
  // Network URLs
  API_URL: z.string().url().optional(),
  PYTH_HERMES_URL: z.string().url().default('https://hermes.pyth.network'),
});

// Backend-specific environment schema
export const backendEnvSchema = baseEnvSchema.extend({
  // Server Configuration
  PORT: z.string().default('3000').transform(val => parseInt(val, 10)).pipe(z.number().min(1).max(65535)),
  
  // Authentication & Security
  RELAYER_PRIVATE_KEY: z.string().min(1, 'Relayer private key is required'),
  
  // Database Configuration (optional for core functionality)
  DATABASE_URL: z.string().url().optional(),
  
  // Redis Configuration
  REDIS_URL: z.string().url().default('redis://localhost:6379'),
  
  // Financial Configuration
  FEE_MARKUP_PERCENTAGE: z.string().default('10').transform(val => parseInt(val, 10)).pipe(z.number().min(0).max(100)),
  MIN_APT_BALANCE: z.string().default('1000000000').transform(val => parseInt(val, 10)).pipe(z.number().min(0)),
  MAX_TRANSACTION_AMOUNT: z.string().default('1000000000').transform(val => parseInt(val, 10)).pipe(z.number().min(0)),
  TREASURY_ADDRESS: z.string().min(1, 'Treasury address is required'),
  
  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.string().default('60000').transform(val => parseInt(val, 10)).pipe(z.number().min(1000)),
  RATE_LIMIT_MAX_REQUESTS: z.string().default('100').transform(val => parseInt(val, 10)).pipe(z.number().min(1)),
  
  // Performance & Caching
  PRICE_CACHE_TTL: z.string().default('30').transform(val => parseInt(val, 10)).pipe(z.number().min(1)),
  GAS_ESTIMATE_BUFFER: z.string().default('20').transform(val => parseInt(val, 10)).pipe(z.number().min(0)),
  
  // CORS & Security
  ALLOWED_ORIGINS: z.string().default('http://localhost:3001'),
  CORS_CREDENTIALS: z.string().default('false').transform(val => val === 'true'),
  MAX_REQUEST_SIZE: z.string().default('1mb'),
  ENABLE_SECURITY_HEADERS: z.string().default('true').transform(val => val !== 'false'),
  HSTS_MAX_AGE: z.string().default('31536000').transform(val => parseInt(val, 10)).pipe(z.number().min(0)),
  
  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  
  // Gas Configuration (Azure template compatibility)
  MAX_GAS_UNITS: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(1)).optional(),
  GAS_UNIT_PRICE: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(1)).optional(),
  RELAYER_FEE_PERCENTAGE: z.string().transform(val => parseFloat(val)).pipe(z.number().min(0)).optional(),
});

// Frontend-specific environment schema (Next.js requires NEXT_PUBLIC_ prefix)
export const frontendEnvSchema = z.object({
  // API Configuration
  NEXT_PUBLIC_API_URL: z.string().url(),
  
  // Aptos Network Configuration
  NEXT_PUBLIC_APTOS_NETWORK: z.enum(['mainnet', 'testnet', 'devnet']).default('testnet'),
  
  // Contract Addresses
  NEXT_PUBLIC_USDC_CONTRACT: z.string().min(1, 'USDC contract address is required'),
  NEXT_PUBLIC_SMOOTHSEND_CONTRACT: z.string().min(1, 'SmoothSend contract address is required'),
  NEXT_PUBLIC_RELAYER_ADDRESS: z.string().min(1, 'Relayer address is required'),
  
  // Optional Test Configuration
  NEXT_PUBLIC_TESTNET_SENDER_ADDRESS: z.string().optional(),
  
  // Supabase Configuration (optional)
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
  
  // Debug Configuration
  NEXT_PUBLIC_SHOW_DEBUG: z.string().default('false').transform(val => val === 'true'),
});

// Type definitions
export type BackendEnv = z.infer<typeof backendEnvSchema>;
export type FrontendEnv = z.infer<typeof frontendEnvSchema>;

/**
 * Environment Variable Mapping
 * Maps frontend variables to backend variables for consistency
 */
export const ENV_MAPPING = {
  // Network configuration
  'NEXT_PUBLIC_APTOS_NETWORK': 'APTOS_NETWORK',
  'NEXT_PUBLIC_API_URL': 'API_URL',
  
  // Contract addresses
  'NEXT_PUBLIC_USDC_CONTRACT': 'USDC_CONTRACT_ADDRESS',
  'NEXT_PUBLIC_SMOOTHSEND_CONTRACT': 'SMOOTHSEND_CONTRACT_ADDRESS',
  'NEXT_PUBLIC_RELAYER_ADDRESS': 'RELAYER_ADDRESS',
} as const;

/**
 * Validates and parses backend environment variables
 */
export function validateBackendEnv(): BackendEnv {
  try {
    const parsed = backendEnvSchema.parse(process.env);
    console.log('✅ Backend environment variables validated successfully');
    return parsed;
  } catch (error) {
    console.error('❌ Backend environment validation failed:');
    if (error instanceof z.ZodError) {
      error.issues.forEach(issue => {
        console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
      });
    }
    throw new Error('Invalid environment configuration');
  }
}

/**
 * Validates and parses frontend environment variables
 */
export function validateFrontendEnv(): FrontendEnv {
  try {
    const parsed = frontendEnvSchema.parse(process.env);
    console.log('✅ Frontend environment variables validated successfully');
    return parsed;
  } catch (error) {
    console.error('❌ Frontend environment validation failed:');
    if (error instanceof z.ZodError) {
      error.issues.forEach(issue => {
        console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
      });
    }
    throw new Error('Invalid environment configuration');
  }
}

/**
 * Gets a standardized environment variable name
 * Handles the mapping between frontend and backend variable names
 */
export function getStandardizedEnvName(varName: string, isClient: boolean = false): string {
  if (isClient) {
    // Convert backend name to frontend name
    const frontendName = Object.entries(ENV_MAPPING).find(([_, backend]) => backend === varName)?.[0];
    return frontendName || varName;
  } else {
    // Convert frontend name to backend name
    return ENV_MAPPING[varName as keyof typeof ENV_MAPPING] || varName;
  }
}

/**
 * Environment variable documentation for developers
 */
export const ENV_DOCS = {
  required: {
    backend: [
      'APTOS_RPC_URL',
      'RELAYER_PRIVATE_KEY', 
      'USDC_CONTRACT_ADDRESS',
      'SMOOTHSEND_CONTRACT_ADDRESS',
      'RELAYER_ADDRESS',
      'TREASURY_ADDRESS'
    ],
    frontend: [
      'NEXT_PUBLIC_API_URL',
      'NEXT_PUBLIC_USDC_CONTRACT',
      'NEXT_PUBLIC_SMOOTHSEND_CONTRACT', 
      'NEXT_PUBLIC_RELAYER_ADDRESS'
    ]
  },
  optional: {
    backend: [
      'DATABASE_URL',
      'REDIS_URL', 
      'PYTH_HERMES_URL',
      'LOG_LEVEL'
    ],
    frontend: [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'NEXT_PUBLIC_SHOW_DEBUG'
    ]
  }
} as const;
