# 🧪 Testing `/gasless-with-wallet` Endpoint Without Frontend

## 📋 **Prerequisites**

1. **Relayer service running** on `http://localhost:3000`
2. **Test account with USDC** balance
3. **API testing tool** (cURL, Postman, or Thunder Client)

## 🔧 **Step 1: Generate Test Account & Signature**

First, let's create a simple Node.js script to generate the required signature:

### **Create Test Script: `test-gasless.js`**

```javascript
import { Account, Aptos, AptosConfig, Network, Ed25519PrivateKey } from '@aptos-labs/ts-sdk';

// Configuration
const config = new AptosConfig({ network: Network.TESTNET });
const aptos = new Aptos(config);

// Test account (you can replace with your own private key)
const TEST_PRIVATE_KEY = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef12"; // Replace with real key
const testAccount = Account.fromPrivateKey({ 
  privateKey: new Ed25519PrivateKey(TEST_PRIVATE_KEY) 
});

// Transaction details
const CONTRACT_ADDRESS = "YOUR_CONTRACT_ADDRESS"; // Replace with your contract
const RELAYER_ADDRESS = "YOUR_RELAYER_ADDRESS";   // Replace with your relayer
const TO_ADDRESS = "0x742d35Cc6634C0532925a3b8D6Ac6E04d12398aB"; // Replace with recipient
const AMOUNT = "1000000"; // 1 USDC
const COIN_TYPE = "0x3c27315fb69ba6e4b960f1507d1cefcc9a4247869f26a8d59d6b7869d23782c::test_coins::USDC";
const RELAYER_FEE = "1000"; // 0.001 USDC

async function generateSignature() {
  try {
    console.log("🔧 Generating signature for gasless transaction...");
    
    // Create transaction payload
    const transactionPayload = {
      type: "entry_function_payload",
      function: `${CONTRACT_ADDRESS}::smoothsend::send_with_fee`,
      type_arguments: [COIN_TYPE],
      arguments: [
        RELAYER_ADDRESS,
        TO_ADDRESS,
        AMOUNT,
        RELAYER_FEE
      ]
    };

    console.log("📝 Transaction Payload:", JSON.stringify(transactionPayload, null, 2));

    // Sign the transaction
    const signedTx = await aptos.transaction.sign({
      signer: testAccount,
      transaction: transactionPayload
    });

    console.log("✅ Signature Generated Successfully!");
    console.log("📊 Test Data:");
    console.log({
      fromAddress: testAccount.accountAddress.toString(),
      toAddress: TO_ADDRESS,
      amount: AMOUNT,
      coinType: COIN_TYPE,
      relayerFee: RELAYER_FEE,
      userSignature: {
        signature: signedTx.signature,
        publicKey: testAccount.publicKey.toString()
      }
    });

    // Generate cURL command
    const curlData = {
      userSignature: {
        signature: signedTx.signature,
        publicKey: testAccount.publicKey.toString()
      },
      fromAddress: testAccount.accountAddress.toString(),
      toAddress: TO_ADDRESS,
      amount: AMOUNT,
      coinType: COIN_TYPE,
      relayerFee: RELAYER_FEE
    };

    console.log("\n🚀 cURL Command:");
    console.log(`curl -X POST http://localhost:3000/api/v1/relayer/gasless-with-wallet \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(curlData, null, 2)}'`);

  } catch (error) {
    console.error("❌ Error generating signature:", error);
  }
}

generateSignature();
```

## 🚀 **Step 2: Direct API Testing**

### **Method 1: Using cURL**

```bash
# Get a quote first (optional)
curl -X POST http://localhost:3000/api/v1/relayer/gasless/quote \
  -H "Content-Type: application/json" \
  -d '{
    "fromAddress": "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    "toAddress": "0x742d35Cc6634C0532925a3b8D6Ac6E04d12398aB",
    "amount": "1000000",
    "coinType": "0x3c27315fb69ba6e4b960f1507d1cefcc9a4247869f26a8d59d6b7869d23782c::test_coins::USDC"
  }'

# Submit gasless transaction
curl -X POST http://localhost:3000/api/v1/relayer/gasless-with-wallet \
  -H "Content-Type: application/json" \
  -d '{
    "userSignature": {
      "signature": "0x...", 
      "publicKey": "0x..."
    },
    "fromAddress": "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    "toAddress": "0x742d35Cc6634C0532925a3b8D6Ac6E04d12398aB",
    "amount": "1000000",
    "coinType": "0x3c27315fb69ba6e4b960f1507d1cefcc9a4247869f26a8d59d6b7869d23782c::test_coins::USDC",
    "relayerFee": "1000"
  }'
```

### **Method 2: Using Node.js Script**

```javascript
// test-endpoint.js
import fetch from 'node-fetch';

const API_BASE = 'http://localhost:3000/api/v1/relayer';

// Test data (replace with actual values)
const testData = {
  userSignature: {
    signature: "0x...", // Generated signature
    publicKey: "0x..."  // Account public key
  },
  fromAddress: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
  toAddress: "0x742d35Cc6634C0532925a3b8D6Ac6E04d12398aB",
  amount: "1000000",
  coinType: "0x3c27315fb69ba6e4b960f1507d1cefcc9a4247869f26a8d59d6b7869d23782c::test_coins::USDC",
  relayerFee: "1000"
};

async function testGaslessEndpoint() {
  try {
    console.log("🧪 Testing /gasless-with-wallet endpoint...");
    
    const response = await fetch(`${API_BASE}/gasless-with-wallet`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log("✅ Success:", result);
    } else {
      console.log("❌ Error:", result);
    }
  } catch (error) {
    console.error("🚨 Request failed:", error);
  }
}

testGaslessEndpoint();
```

## 🔍 **Step 3: Test Health & Status Endpoints**

```bash
# Check service health
curl http://localhost:3000/api/v1/relayer/health

# Check relayer balance
curl http://localhost:3000/api/v1/relayer/balance/YOUR_RELAYER_ADDRESS

# Check transaction status (after submission)
curl http://localhost:3000/api/v1/relayer/status/TRANSACTION_HASH
```

## 🛠️ **Step 4: Create Complete Test Suite**

### **Create: `complete-test.js`**

```javascript
import { Account, Aptos, AptosConfig, Network, Ed25519PrivateKey } from '@aptos-labs/ts-sdk';
import fetch from 'node-fetch';

class GaslessEndpointTester {
  constructor() {
    this.config = new AptosConfig({ network: Network.TESTNET });
    this.aptos = new Aptos(this.config);
    this.apiBase = 'http://localhost:3000/api/v1/relayer';
    
    // Test configuration
    this.testAccount = Account.fromPrivateKey({ 
      privateKey: new Ed25519PrivateKey("YOUR_TEST_PRIVATE_KEY") 
    });
    this.contractAddress = "YOUR_CONTRACT_ADDRESS";
    this.relayerAddress = "YOUR_RELAYER_ADDRESS";
  }

  async testHealthEndpoint() {
    console.log("\n🔍 Testing health endpoint...");
    try {
      const response = await fetch(`${this.apiBase}/health`);
      const result = await response.json();
      console.log("✅ Health check:", result);
      return true;
    } catch (error) {
      console.error("❌ Health check failed:", error);
      return false;
    }
  }

  async testQuoteEndpoint() {
    console.log("\n💰 Testing quote endpoint...");
    try {
      const quoteData = {
        fromAddress: this.testAccount.accountAddress.toString(),
        toAddress: "0x742d35Cc6634C0532925a3b8D6Ac6E04d12398aB",
        amount: "1000000",
        coinType: "0x3c27315fb69ba6e4b960f1507d1cefcc9a4247869f26a8d59d6b7869d23782c::test_coins::USDC"
      };

      const response = await fetch(`${this.apiBase}/gasless/quote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(quoteData)
      });

      const result = await response.json();
      if (response.ok) {
        console.log("✅ Quote received:", result);
        return result;
      } else {
        console.log("❌ Quote failed:", result);
        return null;
      }
    } catch (error) {
      console.error("❌ Quote request failed:", error);
      return null;
    }
  }

  async generateSignature(relayerFee) {
    console.log("\n🔐 Generating transaction signature...");
    try {
      const transactionPayload = {
        type: "entry_function_payload",
        function: `${this.contractAddress}::smoothsend::send_with_fee`,
        type_arguments: ["0x3c27315fb69ba6e4b960f1507d1cefcc9a4247869f26a8d59d6b7869d23782c::test_coins::USDC"],
        arguments: [
          this.relayerAddress,
          "0x742d35Cc6634C0532925a3b8D6Ac6E04d12398aB",
          "1000000",
          relayerFee || "1000"
        ]
      };

      const signedTx = await this.aptos.transaction.sign({
        signer: this.testAccount,
        transaction: transactionPayload
      });

      console.log("✅ Signature generated successfully");
      return {
        signature: signedTx.signature,
        publicKey: this.testAccount.publicKey.toString()
      };
    } catch (error) {
      console.error("❌ Signature generation failed:", error);
      return null;
    }
  }

  async testGaslessWithWallet(userSignature, relayerFee) {
    console.log("\n🚀 Testing gasless-with-wallet endpoint...");
    try {
      const requestData = {
        userSignature,
        fromAddress: this.testAccount.accountAddress.toString(),
        toAddress: "0x742d35Cc6634C0532925a3b8D6Ac6E04d12398aB",
        amount: "1000000",
        coinType: "0x3c27315fb69ba6e4b960f1507d1cefcc9a4247869f26a8d59d6b7869d23782c::test_coins::USDC",
        relayerFee: relayerFee || "1000"
      };

      console.log("📤 Request data:", JSON.stringify(requestData, null, 2));

      const response = await fetch(`${this.apiBase}/gasless-with-wallet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      });

      const result = await response.json();
      
      if (response.ok) {
        console.log("✅ Gasless transaction successful!");
        console.log("📊 Result:", result);
        return result;
      } else {
        console.log("❌ Gasless transaction failed:");
        console.log("📊 Error:", result);
        return null;
      }
    } catch (error) {
      console.error("❌ Request failed:", error);
      return null;
    }
  }

  async runCompleteTest() {
    console.log("🧪 Starting complete gasless endpoint test...");
    console.log("📍 Test account:", this.testAccount.accountAddress.toString());

    // 1. Test health
    const healthOk = await this.testHealthEndpoint();
    if (!healthOk) return;

    // 2. Get quote
    const quote = await this.testQuoteEndpoint();
    if (!quote) return;

    // 3. Generate signature
    const userSignature = await this.generateSignature(quote.quote?.relayerFee);
    if (!userSignature) return;

    // 4. Test gasless transaction
    const result = await this.testGaslessWithWallet(userSignature, quote.quote?.relayerFee);
    
    if (result) {
      console.log("\n🎉 All tests passed! Transaction hash:", result.hash);
    } else {
      console.log("\n❌ Test failed");
    }
  }
}

// Run the test
const tester = new GaslessEndpointTester();
tester.runCompleteTest().catch(console.error);
```

## 🎯 **Quick Test Commands**

```bash
# Install dependencies
npm install @aptos-labs/ts-sdk node-fetch

# Run test script
node complete-test.js

# Or simple cURL test
curl -X POST http://localhost:3000/api/v1/relayer/health
```

## 📋 **Expected Responses**

### **Success Response**
```json
{
  "success": true,
  "transactionId": "wallet-1693123456789",
  "hash": "0xabc123...",
  "gasFeePaidBy": "relayer",
  "userPaidAPT": false,
  "transparency": "User saw full transaction details",
  "message": "GASLESS WITH WALLET: User approved transaction, relayer paid gas!"
}
```

### **Error Response**
```json
{
  "error": "Beta Safety Limit: Daily limit exceeded",
  "betaInfo": "Currently in beta with daily limits. Contact support for higher limits."
}
```

This gives you multiple ways to test the endpoint without building a frontend! 🚀
