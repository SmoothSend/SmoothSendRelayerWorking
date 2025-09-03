# 🚀 SmoothSend Gasless Relayer API Documentation

## 📋 Overview

SmoothSend is a production-ready gasless USDC relayer for the Aptos blockchain. It enables users to send USDC without paying gas fees, with the relayer sponsoring all transaction costs.

**Base URL:** `http://localhost:3000/api/v1/relayer`

---

## 🎯 Quick Start

### 1. Check Relayer Health
```bash
curl -X GET http://localhost:3000/api/v1/relayer/health
```

### 2. Send Gasless USDC (Recommended Method)
```typescript
// See client-example.ts for complete implementation
const response = await fetch('/api/v1/relayer/gasless-wallet-serialized', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    transactionBytes: [/* serialized transaction */],
    authenticatorBytes: [/* user signature */],
    functionName: 'send_with_fee'
  })
});
```

---

## 📡 API Endpoints

### 🚀 **Gasless Transactions** (Recommended)

#### `POST /gasless-wallet-serialized`
**Purpose:** Send USDC without gas fees using proper wallet integration

**Method:** `POST`  
**Content-Type:** `application/json`  
**Rate Limited:** ✅ (per address)

**Request Body:**
```json
{
  "transactionBytes": [/* Array of transaction bytes */],
  "authenticatorBytes": [/* Array of signature bytes */],
  "functionName": "send_with_fee"
}
```

**Response (Success):**
```json
{
  "success": true,
  "txnHash": "0x...",
  "gasUsed": "26",
  "vmStatus": "Executed successfully",
  "sender": "0x...",
  "function": "send_with_fee"
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": "Failed to process gasless transaction",
  "details": "Error details..."
}
```

**Implementation Guide:**
1. Client builds transaction with `withFeePayer: true`
2. Client signs transaction with wallet
3. Client serializes transaction + authenticator
4. Client sends serialized data to this endpoint
5. Relayer deserializes, adds fee payer signature, submits

**Advantages:**
- ✅ No sequence number race conditions
- ✅ Works with all Aptos wallets
- ✅ Proper signature handling
- ✅ Production-ready

---

### 💰 **Balance & Status**

#### `GET /balance/:address`
**Purpose:** Get USDC balance for an address

**Parameters:**
- `address` (path): Aptos wallet address

**Example:**
```bash
curl -X GET "http://localhost:3000/api/v1/relayer/balance/0x083f..."
```

**Response:**
```json
{
  "success": true,
  "address": "0x083f...",
  "balance": 4819.118477,
  "currency": "USDC",
  "coinType": "0x3c27315fb69ba6e4b960f1507d1cefcc9a4247869f26a8d59d6b7869d23782c::test_coins::USDC",
  "rawBalance": "4819118477"
}
```

#### `GET /status/:txnHash`
**Purpose:** Get transaction status by hash

**Parameters:**
- `txnHash` (path): Transaction hash

**Example:**
```bash
curl -X GET "http://localhost:3000/api/v1/relayer/status/0x915e..."
```

**Response:**
```json
{
  "success": true,
  "status": "confirmed",
  "txnHash": "0x915e...",
  "gasUsed": "26",
  "vmStatus": "Executed successfully"
}
```

---

### 🏥 **Health & Monitoring**

#### `GET /health`
**Purpose:** Check relayer health and status

**Example:**
```bash
curl -X GET http://localhost:3000/api/v1/relayer/health
```

**Response:**
```json
{
  "status": "healthy",
  "relayerAddress": "0x5dfe...",
  "relayerBalance": "3039129700",
  "aptPrice": 4
}
```

#### `GET /stats`
**Purpose:** Get relayer statistics

**Example:**
```bash
curl -X GET http://localhost:3000/api/v1/relayer/stats
```

**Response:**
```json
{
  "totalTransactions": 150,
  "successfulTransactions": 148,
  "failedTransactions": 2,
  "totalRevenue": "15.250000",
  "aptBalance": "3039129700",
  "avgResponseTime": 1250,
  "note": "Database features limited"
}
```

#### `GET /safety-stats`
**Purpose:** Get safety monitoring and beta limits

**Example:**
```bash
curl -X GET http://localhost:3000/api/v1/relayer/safety-stats
```

**Response:**
```json
{
  "success": true,
  "betaLimits": {
    "maxSingleTransaction": 10,
    "maxUserDaily": 100,
    "maxDailyVolume": 1000,
    "currentDailyVolume": 0
  },
  "usage": {
    "dailyVolumeUsed": "0.00 USDC",
    "dailyVolumeRemaining": "1000.00 USDC",
    "utilizationPercentage": 0
  },
  "status": "normal"
}
```

---

### 📊 **Traditional Relayer** (User Pays Gas)

#### `POST /quote`
**Purpose:** Get quote for traditional relayer transaction where user pays gas

**Method:** `POST`  
**Content-Type:** `application/json`  
**Rate Limited:** ✅ (per address)

**Request Body:**
```json
{
  "fromAddress": "0x...",
  "toAddress": "0x...",
  "amount": "1000000",
  "coinType": "0x3c27315fb69ba6e4b960f1507d1cefcc9a4247869f26a8d59d6b7869d23782c::test_coins::USDC"
}
```

**Response:**
```json
{
  "success": true,
  "quote": {
    "gasEstimate": "500",
    "gasFee": "50000",
    "relayerFee": "1000",
    "totalCost": "51000"
  }
}
```

---

## 🔧 Implementation Examples

### Frontend Integration (React + Petra Wallet)

```typescript
import { GaslessWalletClient } from './client-example';

// Initialize client
const client = new GaslessWalletClient(Network.TESTNET, 'http://localhost:3000');

// Send USDC gaslessly
await client.sendUSDCGasless(
  userWalletAddress,
  async (tx) => await window.aptos.signTransaction(tx), // Petra wallet
  recipientAddress,
  10 // 10 USDC
);
```

### Backend Integration (Node.js)

```typescript
import { testGaslessEndpoint } from './test-gasless-simple';

// Test gasless functionality
const success = await testGaslessEndpoint();
console.log('Gasless test result:', success);
```

---

## 🛡️ Security Features

### Rate Limiting
- **Per Address:** 100 requests per minute
- **Global:** Standard Express rate limiting
- **Beta Limits:** 10 USDC per transaction, 100 USDC per user daily

### Transaction Validation
- ✅ **Signature Verification:** Ed25519 signature validation
- ✅ **Balance Checks:** Insufficient balance protection
- ✅ **Contract Validation:** Whitelisted relayer verification
- ✅ **Amount Limits:** Beta safety limits enforced
- ✅ **Self-Transfer Prevention:** Cannot send to same address

### Move Contract Security
- ✅ **Relayer Whitelist:** Only approved relayers can sponsor
- ✅ **Coin Type Validation:** Only supported coins allowed
- ✅ **Zero Amount Protection:** Prevents zero value transfers
- ✅ **Overflow Protection:** Safe arithmetic operations

---

## 🔍 Error Handling

### Common Error Responses

**400 Bad Request:**
```json
{
  "success": false,
  "error": "Missing required parameters",
  "details": "transactionBytes and authenticatorBytes required"
}
```

**429 Too Many Requests:**
```json
{
  "success": false,
  "error": "Rate limit exceeded",
  "details": "Too many requests from this address"
}
```

**500 Internal Server Error:**
```json
{
  "success": false,
  "error": "Failed to process gasless transaction",
  "details": "Transaction validation failed"
}
```

### Blockchain Errors

**Insufficient Balance:**
```json
{
  "success": false,
  "error": "Invalid transaction format",
  "details": "Move abort: E_INSUFFICIENT_BALANCE(0x3)"
}
```

**Invalid Signature:**
```json
{
  "success": false,
  "error": "Invalid transaction format", 
  "details": "Transaction signature verification failed"
}
```

---

## 🚀 Production Deployment

### Environment Variables
```bash
# Required
APTOS_NETWORK=testnet
RELAYER_PRIVATE_KEY=0x...
CONTRACT_ADDRESS=0x...

# Optional
PORT=3000
REDIS_URL=redis://localhost:6379
DATABASE_URL=postgresql://...
CORS_ORIGIN=http://localhost:3001
```

### Health Monitoring
- **Health Check:** `GET /health` - Monitor relayer status
- **Stats:** `GET /stats` - Track transaction metrics  
- **Safety:** `GET /safety-stats` - Monitor usage limits

### Scaling Considerations
- Redis for rate limiting and caching
- PostgreSQL for transaction history
- Multiple relayer instances for load balancing
- Gas fee optimization strategies

---

## 📞 Support

### Test Endpoints
```bash
# Quick health check
curl http://localhost:3000/api/v1/relayer/health

# Check user balance
curl "http://localhost:3000/api/v1/relayer/balance/0x083f..."

# View stats
curl http://localhost:3000/api/v1/relayer/stats
```

### Explorer Links
- **Testnet:** https://explorer.aptoslabs.com/?network=testnet
- **Transaction:** https://explorer.aptoslabs.com/txn/[HASH]?network=testnet

### Repository
- **GitHub:** SmoothSend/SmoothSendRelayerWorking
- **Branch:** main
- **Status:** Production Ready ✅

---

## 🎯 Roadmap

### Current Features (v1.0)
- ✅ Gasless USDC transfers
- ✅ Proper wallet integration
- ✅ Rate limiting and safety
- ✅ Health monitoring
- ✅ Beta testing ready

### Upcoming Features (v1.1)
- 🔄 Multiple coin support
- 🔄 Mainnet deployment
- 🔄 Advanced analytics
- 🔄 Auto-scaling relayers
- 🔄 Fee optimization

---

*Last updated: September 2, 2025*  
*Version: 1.0.0*  
*Status: Production Ready* ✅
