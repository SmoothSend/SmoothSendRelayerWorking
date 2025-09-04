# 🌐 Environment Variable Management Guide

This document outlines the unified environment variable management system for SmoothSend, providing standardized configuration across frontend and backend projects.

## 📋 Table of Contents

- [Overview](#overview)
- [Standardized Naming Convention](#standardized-naming-convention)
- [Environment Validation](#environment-validation)
- [Project-Specific Configuration](#project-specific-configuration)
- [Deployment Guide](#deployment-guide)
- [Migration from Legacy System](#migration-from-legacy-system)
- [Troubleshooting](#troubleshooting)

## 🎯 Overview

The SmoothSend project now uses a unified environment variable management system with:

- ✅ **Zod Schema Validation** - Validates all environment variables at startup
- ✅ **Standardized Naming** - Consistent variable names across projects
- ✅ **Type Safety** - Full TypeScript support with auto-completion
- ✅ **Clear Documentation** - Comprehensive .env.example files
- ✅ **Error Reporting** - Detailed validation errors with helpful messages

## 🏗️ Standardized Naming Convention

### Backend Variables

| Variable | Purpose | Example |
|----------|---------|---------|
| `APTOS_NETWORK` | Aptos network (testnet/mainnet) | `testnet` |
| `APTOS_RPC_URL` | Aptos RPC endpoint | `https://api.testnet.aptoslabs.com/v1` |
| `RELAYER_PRIVATE_KEY` | Relayer's private key | `0x...` |
| `USDC_CONTRACT_ADDRESS` | USDC token contract | `0x3c27...::test_coins::USDC` |
| `SMOOTHSEND_CONTRACT_ADDRESS` | SmoothSend contract | `0x6d88...` |
| `RELAYER_ADDRESS` | Relayer account address | `0x5dfe...` |
| `TREASURY_ADDRESS` | Treasury address | `0x...` |

### Frontend Variables (NEXT_PUBLIC_ prefix)

| Variable | Purpose | Maps to Backend |
|----------|---------|-----------------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | - |
| `NEXT_PUBLIC_APTOS_NETWORK` | Aptos network | `APTOS_NETWORK` |
| `NEXT_PUBLIC_USDC_CONTRACT` | USDC contract | `USDC_CONTRACT_ADDRESS` |
| `NEXT_PUBLIC_SMOOTHSEND_CONTRACT` | SmoothSend contract | `SMOOTHSEND_CONTRACT_ADDRESS` |
| `NEXT_PUBLIC_RELAYER_ADDRESS` | Relayer address | `RELAYER_ADDRESS` |

## 🛡️ Environment Validation

### Backend Validation

```typescript
// Automatically validates environment at startup
import { validateBackendEnv } from './src/config/env-schema';

const env = validateBackendEnv(); // Throws error if invalid
```

### Frontend Validation

```typescript
// Validates environment in layout.tsx
import { validateFrontendEnv } from '@/lib/env-schema';

const env = validateFrontendEnv(); // Validates Next.js environment
```

### Validation Features

- **Required Field Checking** - Ensures all critical variables are present
- **Type Validation** - Validates URLs, numbers, enums
- **Range Checking** - Validates numeric ranges (ports, percentages)
- **Format Validation** - Ensures proper formats for addresses, URLs
- **Helpful Error Messages** - Clear guidance on what needs to be fixed

## 📂 Project-Specific Configuration

### Backend (.env.example)

```bash
# Required Configuration
APTOS_NETWORK=testnet
APTOS_RPC_URL=https://api.testnet.aptoslabs.com/v1
RELAYER_PRIVATE_KEY=your_relayer_private_key_here
USDC_CONTRACT_ADDRESS=0x3c27...::test_coins::USDC
SMOOTHSEND_CONTRACT_ADDRESS=your_contract_address
RELAYER_ADDRESS=your_relayer_address
TREASURY_ADDRESS=your_treasury_address

# Server Configuration
PORT=3000
NODE_ENV=development

# Optional Configuration
DATABASE_URL=postgresql://user:pass@localhost:5432/smoothsend
REDIS_URL=redis://localhost:6379
```

### Frontend (.env.example)

```bash
# Required Configuration
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_APTOS_NETWORK=testnet
NEXT_PUBLIC_USDC_CONTRACT=0x3c27...::test_coins::USDC
NEXT_PUBLIC_SMOOTHSEND_CONTRACT=your_contract_address
NEXT_PUBLIC_RELAYER_ADDRESS=your_relayer_address

# Optional Configuration
NEXT_PUBLIC_SHOW_DEBUG=false
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
```

## 🚀 Deployment Guide

### Local Development

1. **Backend Setup:**
   ```bash
   cd SmoothSendRelayerWorking
   cp .env.example .env
   # Edit .env with your values
   npm run dev
   ```

2. **Frontend Setup:**
   ```bash
   cd smoothsendfrontend
   cp .env.example .env.local
   # Edit .env.local with your values
   npm run dev
   ```

### Production Deployment

#### Azure (Backend)

Add variables in Azure App Service → Configuration → Application Settings:

```bash
APTOS_NETWORK=mainnet
APTOS_RPC_URL=https://api.mainnet.aptoslabs.com/v1
RELAYER_PRIVATE_KEY=your_production_key
# ... other variables from azure-env-template.txt
```

#### Vercel (Frontend)

Add variables in Vercel Dashboard → Project → Settings → Environment Variables:

```bash
NEXT_PUBLIC_API_URL=https://your-backend.azurewebsites.net
NEXT_PUBLIC_APTOS_NETWORK=mainnet
# ... other variables from vercel-env-template.txt
```

## 🔄 Migration from Legacy System

### Variable Name Changes

| Legacy Name | New Standardized Name |
|-------------|----------------------|
| `CONTRACT_ADDRESS` | `SMOOTHSEND_CONTRACT_ADDRESS` |
| `APTOS_NODE_URL` | `APTOS_RPC_URL` |
| `CORS_ORIGIN` | `ALLOWED_ORIGINS` |

### Migration Steps

1. **Update Environment Files:**
   - Replace old variable names with standardized names
   - Update any hardcoded environment variable references

2. **Update Code References:**
   - Backend: Use `config` object from `src/config/index.ts`
   - Frontend: Use validated environment from schema

3. **Test Validation:**
   ```bash
   # Backend
   npm run dev  # Will validate on startup
   
   # Frontend
   npm run build  # Will validate during build
   ```

## 🔧 Troubleshooting

### Common Issues

#### "Environment validation failed"

**Solution:** Check the error messages for specific missing or invalid variables.

```bash
❌ Backend environment validation failed:
  - RELAYER_PRIVATE_KEY: String must contain at least 1 character(s)
  - TREASURY_ADDRESS: String must contain at least 1 character(s)
```

#### "Variable not found" in Frontend

**Cause:** Frontend variables must have `NEXT_PUBLIC_` prefix to be accessible.

**Solution:** Ensure all client-side variables use the correct prefix.

#### Build Fails with Environment Errors

**Cause:** Required environment variables are missing or invalid.

**Solution:** 
1. Check `.env.example` files for required variables
2. Verify all variables are properly set
3. Run validation locally: `npm run dev`

### Debug Mode

Enable debug logging for environment issues:

```bash
# Backend
LOG_LEVEL=debug

# Frontend  
NEXT_PUBLIC_SHOW_DEBUG=true
```

### Validation Override (Development Only)

For development testing, validation errors are logged but don't stop the application. In production, validation failures will prevent startup.

## 📚 Schema Reference

### Backend Schema Location
`src/config/env-schema.ts` - Contains the Zod schema for backend validation

### Frontend Schema Location  
`lib/env-schema.ts` - Contains the Zod schema for frontend validation

### Type Definitions

```typescript
// Backend types
import { BackendEnv } from './src/config/env-schema';

// Frontend types
import { FrontendEnv } from '@/lib/env-schema';
```

## 🎯 Best Practices

1. **Always use .env.example** - Keep example files updated with new variables
2. **Validate early** - Environment validation happens at startup
3. **Use typed access** - Import from config objects instead of direct `process.env`
4. **Document changes** - Update this guide when adding new variables
5. **Test locally** - Verify environment setup before deployment

## 🆘 Support

If you encounter issues with environment configuration:

1. Check this documentation
2. Verify your `.env` files match the `.env.example` templates
3. Review validation error messages
4. Test with minimal configuration first
5. Check deployment platform documentation for environment variable setup

---

*This documentation is maintained as part of the SmoothSend unified environment variable management system.*
