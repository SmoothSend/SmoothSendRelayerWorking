# SmoothSend Gasless Relayer - Production Ready

A production-ready USDC relayer for Aptos blockchain with proper gasless transaction support using wallet integration.

## ✅ What's Working Now

### Core Functionality
- **✅ NEW: Proper Gasless Wallet Integration** - Transaction serialization approach (no sequence number race conditions)
- **✅ Traditional Relayer** - User pays gas for their transactions
- **✅ Utility Endpoints** - Balance, health, stats, safety monitoring
- **✅ Production Security** - Move contract whitelisting, comprehensive validation

### Architecture Highlights
- **Proper Fee Payer Pattern**: Uses Aptos native `withFeePayer()` for sponsored transactions
- **Transaction Serialization**: Frontend serializes, backend deserializes (prevents race conditions)
- **Ed25519 Signature Verification**: Native Aptos signature verification
- **Move Contract Security**: Entry function with relayer whitelisting

## 🚀 Quick Start

### 1. Environment Setup
```bash
# Copy environment template
cp env.template .env

# Configure your environment
vim .env
```

Required environment variables:
```env
# Aptos Configuration
APTOS_NETWORK=testnet
APTOS_RELAYER_PRIVATE_KEY=your_private_key_here

# Server Configuration
PORT=3000
NODE_ENV=production

# Database (Optional - core functionality works without it)
DATABASE_URL=postgresql://user:password@localhost:5432/smoothsend
REDIS_URL=redis://localhost:6379
```

### 2. Install and Run
```bash
# Install dependencies
npm install

# Run the server
npm start

# For development
npm run dev
```

### 3. Health Check
```bash
curl http://localhost:3000/health
```

## 📚 API Documentation

### 🆕 Gasless Wallet Integration (RECOMMENDED)

**Endpoint**: `POST /gasless-wallet-serialized`

This is the **production-ready** endpoint that properly integrates with wallet adapters.

#### How it Works
1. **Frontend**: User signs transaction with wallet, frontend serializes transaction + signature
2. **Backend**: Deserializes transaction, adds relayer as fee payer, submits to blockchain
3. **Result**: User gets gasless experience, relayer pays gas fees

#### Request Body
```json
{
  "transactionBytes": [1, 2, 3, ...],      // Serialized transaction
  "authenticatorBytes": [4, 5, 6, ...],    // Serialized user signature
  "functionName": "send_with_fee"          // Optional: for logging
}
```

#### Response
```json
{
  "success": true,
  "txnHash": "0x915eeb0a621ab881a9cc04eed16a69d1d5ea2a876780f7161d0de61b73e2f88c",
  "gasUsed": "26",
  "vmStatus": "Executed successfully",
  "sender": "0x123...",
  "function": "send_with_fee"
}
```

#### Frontend Integration Example
```typescript
// Using Aptos Wallet Adapter
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk';

const { signTransaction } = useWallet();
const aptos = new Aptos(new AptosConfig({ network: Network.TESTNET }));

// 1. Build transaction
const transaction = await aptos.transaction.build.simple({
  sender: userAddress,
  data: {
    function: "0x123::smoothsend::send_with_fee",
    functionArguments: [recipientAddress, amount, relayerFee]
  }
});

// 2. User signs transaction
const senderAuthenticator = await signTransaction(transaction);

// 3. Serialize both transaction and signature
const transactionBytes = Array.from(transaction.bcsToBytes());
const authenticatorBytes = Array.from(senderAuthenticator.bcsToBytes());

// 4. Send to relayer
const response = await fetch('/gasless-wallet-serialized', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    transactionBytes,
    authenticatorBytes,
    functionName: 'send_with_fee'
  })
});
```

### Utility Endpoints

#### Get Balance
```bash
GET /balance/:address
```

#### Get Health Status
```bash
GET /health
```

#### Get Relayer Statistics
```bash
GET /stats
```

#### Get Safety Statistics
```bash
GET /safety-stats
```

## 🔧 Testing

### Test All Endpoints
```bash
# Health check
curl http://localhost:3000/health

# Balance check (example address)
curl http://localhost:3000/balance/0x123...

# Stats
curl http://localhost:3000/stats

# Safety stats
curl http://localhost:3000/safety-stats
```

### Test Gasless Transaction
Create a test file `tests/test-gasless.ts`:
```typescript
import { 
  Aptos, 
  AptosConfig, 
  Network, 
  Ed25519PrivateKey,
  Account,
  SimpleTransaction,
  Deserializer
} from '@aptos-labs/ts-sdk';

async function testGaslessTransaction() {
  const aptos = new Aptos(new AptosConfig({ network: Network.TESTNET }));
  
  // Create test sender
  const senderKey = new Ed25519PrivateKey("your_test_private_key");
  const sender = Account.fromPrivateKey({ privateKey: senderKey });
  
  // Build transaction
  const transaction = await aptos.transaction.build.simple({
    sender: sender.accountAddress,
    data: {
      function: "0x3c27315fb69ba6e4b960f1507d1cefcc9a4247869f26a8d59d6b7869d23782c::smoothsend::send_with_fee",
      functionArguments: [
        "0x742d35cc6366c3def9f2c3c9415d4e9a1d8be7dc3b9e43b4c48b0b7b9f6aa2dc", // recipient
        "1000000", // 1 USDC
        "50000"    // 0.05 USDC relayer fee
      ]
    }
  });
  
  // Sign transaction
  const senderAuthenticator = aptos.transaction.sign({
    signer: sender,
    transaction
  });
  
  // Serialize
  const transactionBytes = Array.from(transaction.bcsToBytes());
  const authenticatorBytes = Array.from(senderAuthenticator.bcsToBytes());
  
  // Send to relayer
  const response = await fetch('http://localhost:3000/gasless-wallet-serialized', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      transactionBytes,
      authenticatorBytes,
      functionName: 'send_with_fee'
    })
  });
  
  const result = await response.json();
  console.log('✅ GASLESS SUCCESS:', result);
}

testGaslessTransaction().catch(console.error);
```

Run the test:
```bash
npx ts-node tests/test-gasless.ts
```

## 🏗️ Architecture Details

### Move Smart Contract
Location: `contract/smoothsend.move`

Key features:
- **Entry Function**: `send_with_fee(sender, recipient, amount, relayer_fee)`
- **Security**: Relayer whitelist verification
- **Fee Structure**: User pays relayer fee in USDC
- **Gas Coverage**: Relayer covers all gas costs

### Backend Services

#### AptosService (`src/services/aptosService.ts`)
- **Core Method**: `submitTransactionWithDeserializedData()` - Handles fee payer integration
- **Signature Verification**: Native Ed25519 verification
- **Transaction Submission**: Uses `withFeePayer()` pattern

#### RelayerController (`src/controllers/relayerController.ts`)
- **Clean Architecture**: Only working endpoints included
- **New Method**: `submitGaslessWithProperWallet()` - Production gasless endpoint
- **Utility Methods**: Balance, health, stats endpoints

### Security Features
- **Move Contract Whitelisting**: Only approved relayers can process transactions
- **Signature Verification**: All transactions cryptographically verified
- **Rate Limiting**: Built-in protection against abuse
- **Balance Validation**: Comprehensive balance checks
- **Error Handling**: Detailed error responses for debugging

## 🔄 Migration from Old Version

If upgrading from the previous broken gasless implementation:

### What Was Removed
- ❌ `getGaslessQuote()` - Had sequence number race conditions
- ❌ `submitGaslessTransaction()` - INVALID_SIGNATURE errors
- ❌ `submitGaslessWithWallet()` - Transaction rebuilding issues

### What's New
- ✅ `submitGaslessWithProperWallet()` - Proper wallet integration
- ✅ Transaction serialization approach
- ✅ Aptos Gas Station pattern implementation
- ✅ Clean controller architecture

## 🛡️ Production Considerations

### Security
- Ensure relayer private key is securely stored
- Configure rate limiting for production traffic
- Monitor relayer balance to prevent service interruption
- Set up alerting for failed transactions

### Scaling
- Database integration for transaction tracking (optional)
- Redis for caching and rate limiting
- Load balancing for multiple relayer instances
- Fee optimization based on network conditions

### Monitoring
- Health check endpoint for uptime monitoring
- Statistics endpoint for usage analytics
- Safety stats for volume monitoring
- Comprehensive logging for debugging

## 📞 Support

### Common Issues
1. **INVALID_SIGNATURE**: Ensure using transaction serialization approach
2. **Insufficient Balance**: Check relayer APT balance for gas fees
3. **Sequence Number Issues**: Use proper wallet integration endpoint

### Debug Mode
Set `NODE_ENV=development` for detailed logging.

### Production Deployment
See `deploy.sh` for production deployment script.

---

**Status**: ✅ Production Ready
**Last Updated**: $(date)
**Version**: 1.0.0 (Clean Architecture)
