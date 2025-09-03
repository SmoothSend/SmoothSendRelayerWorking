# 🚀 Production Wallet Integration Guide

## Overview
For production wallet integration, use `/gasless/submit` endpoint as it includes full safety features, monitoring, and transaction limits.

## Frontend Implementation Flow

### Step 1: Get Quote
```typescript
// 1. Get gasless quote from backend
const quoteResponse = await fetch('/api/v1/relayer/gasless/quote', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    fromAddress: userAddress,
    toAddress: recipientAddress,
    amount: "1000000", // 1 USDC in micro units
    coinType: "0x3c27315fb69ba6e4b960f1507d1cefcc9a4247869f26a8d59d6b7869d23782c::test_coins::USDC"
  })
});

const quote = await quoteResponse.json();
// quote.transactionData contains the transaction to sign
```

### Step 2: Sign Transaction with Wallet
```typescript
// 2. Sign the transaction using wallet
const transactionData = quote.transactionData;

// For Petra Wallet
const signedTransaction = await window.aptos.signTransaction(transactionData);

// For Pontem Wallet  
const signedTransaction = await window.pontem.signTransaction(transactionData);

// For Martian Wallet
const signedTransaction = await window.martian.signTransaction(transactionData);
```

### Step 3: Submit Signed Transaction
```typescript
// 3. Submit to backend with proper format
const submitResponse = await fetch('/api/v1/relayer/gasless/submit', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    transaction: transactionData,        // Original transaction object
    userSignature: signedTransaction,    // Signed transaction from wallet
    fromAddress: userAddress,
    toAddress: recipientAddress,
    amount: "1000000",
    coinType: "0x3c27315fb69ba6e4b960f1507d1cefcc9a4247869f26a8d59d6b7869d23782c::test_coins::USDC",
    relayerFee: quote.quote.relayerFee
  })
});

const result = await submitResponse.json();
console.log('Transaction hash:', result.hash);
```

## Complete React Component Example

```typescript
import React, { useState } from 'react';

const GaslessTransfer = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const sendGaslessTransaction = async () => {
    try {
      setLoading(true);

      // Check if wallet is connected
      if (!window.aptos) {
        throw new Error('Petra wallet not found. Please install Petra wallet.');
      }

      // Connect wallet if needed
      await window.aptos.connect();
      const account = await window.aptos.account();
      
      const fromAddress = account.address;
      const toAddress = "0x742d35Cc6634C0532925a3b8D6Ac6E04d12398aB"; // Example
      const amount = "1000000"; // 1 USDC
      const coinType = "0x3c27315fb69ba6e4b960f1507d1cefcc9a4247869f26a8d59d6b7869d23782c::test_coins::USDC";

      // Step 1: Get quote
      console.log('Getting quote...');
      const quoteResponse = await fetch('/api/v1/relayer/gasless/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromAddress,
          toAddress,
          amount,
          coinType
        })
      });

      if (!quoteResponse.ok) {
        throw new Error('Failed to get quote');
      }

      const quote = await quoteResponse.json();
      console.log('Quote received:', quote);

      // Step 2: Sign transaction with wallet
      console.log('Signing transaction...');
      const signedTransaction = await window.aptos.signTransaction(quote.transactionData);
      console.log('Transaction signed:', signedTransaction);

      // Step 3: Submit to backend
      console.log('Submitting transaction...');
      const submitResponse = await fetch('/api/v1/relayer/gasless/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transaction: quote.transactionData,
          userSignature: signedTransaction,
          fromAddress,
          toAddress,
          amount,
          coinType,
          relayerFee: quote.quote.relayerFee
        })
      });

      if (!submitResponse.ok) {
        throw new Error('Failed to submit transaction');
      }

      const result = await submitResponse.json();
      console.log('Transaction successful:', result);
      setResult(result);

    } catch (error) {
      console.error('Transaction failed:', error);
      alert(`Transaction failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Gasless USDC Transfer</h2>
      <button 
        onClick={sendGaslessTransaction} 
        disabled={loading}
        style={{
          padding: '10px 20px',
          backgroundColor: loading ? '#ccc' : '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: loading ? 'not-allowed' : 'pointer'
        }}
      >
        {loading ? 'Processing...' : 'Send 1 USDC (Gasless)'}
      </button>

      {result && (
        <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#d4edda', border: '1px solid #c3e6cb', borderRadius: '5px' }}>
          <h3>Transaction Successful!</h3>
          <p><strong>Hash:</strong> {result.hash}</p>
          <p><strong>Status:</strong> {result.success ? 'Success' : 'Failed'}</p>
          <p><strong>Gas Paid By:</strong> Relayer (You paid 0 APT!)</p>
        </div>
      )}
    </div>
  );
};

export default GaslessTransfer;
```

## Multi-Wallet Support

```typescript
// Detect and connect to different wallets
const connectWallet = async () => {
  let wallet = null;
  let account = null;

  if (window.aptos) {
    // Petra Wallet
    wallet = window.aptos;
    await wallet.connect();
    account = await wallet.account();
  } else if (window.pontem) {
    // Pontem Wallet
    wallet = window.pontem;
    await wallet.connect();
    account = await wallet.account();
  } else if (window.martian) {
    // Martian Wallet
    wallet = window.martian;
    await wallet.connect();
    account = await wallet.account();
  } else {
    throw new Error('No Aptos wallet found. Please install Petra, Pontem, or Martian wallet.');
  }

  return { wallet, account };
};

// Sign transaction with detected wallet
const signTransaction = async (transactionData) => {
  const { wallet } = await connectWallet();
  return await wallet.signTransaction(transactionData);
};
```

## Error Handling

```typescript
const handleTransactionError = (error) => {
  if (error.message.includes('Beta Safety Limit')) {
    alert('Transaction exceeds beta limits. Please try a smaller amount or contact support.');
  } else if (error.message.includes('Insufficient balance')) {
    alert('Insufficient USDC balance for this transaction.');
  } else if (error.message.includes('Service temporarily unavailable')) {
    alert('Relayer service is temporarily unavailable. Please try again later.');
  } else if (error.message.includes('User rejected')) {
    alert('Transaction was cancelled by user.');
  } else {
    alert(`Transaction failed: ${error.message}`);
  }
};
```

## Production Considerations

### 1. Environment Configuration
```typescript
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://your-production-api.com'
  : 'http://localhost:3000';

const COIN_TYPE = process.env.NODE_ENV === 'production'
  ? '0x1::coin::USDC'  // Mainnet USDC
  : '0x3c27315fb69ba6e4b960f1507d1cefcc9a4247869f26a8d59d6b7869d23782c::test_coins::USDC'; // Testnet
```

### 2. Transaction Monitoring
```typescript
const monitorTransaction = async (hash) => {
  let attempts = 0;
  const maxAttempts = 30; // 30 seconds

  while (attempts < maxAttempts) {
    try {
      const response = await fetch(`/api/v1/relayer/status/${hash}`);
      const status = await response.json();
      
      if (status.status === 'success') {
        return 'confirmed';
      } else if (status.status === 'failed') {
        return 'failed';
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
    } catch (error) {
      console.error('Error checking transaction status:', error);
      break;
    }
  }
  
  return 'timeout';
};
```

### 3. User Experience
```typescript
const showTransactionProgress = (step) => {
  const steps = [
    '1. Getting quote...',
    '2. Please sign transaction in wallet...',
    '3. Submitting to blockchain...',
    '4. Confirming transaction...',
    '5. Complete!'
  ];
  
  console.log(steps[step - 1]);
  // Update UI with progress indicator
};
```

## Why `/gasless/submit` is Better for Production

✅ **Full Safety Features**: Beta limits, transaction monitoring
✅ **Detailed Tracking**: Complete database logging for analytics
✅ **Error Handling**: Comprehensive error responses
✅ **Scalability**: Built for production traffic
✅ **Monitoring**: Integration with safety monitoring systems

## Next Steps

1. Implement the frontend code above
2. Test with testnet first
3. Deploy to production with mainnet coin types
4. Monitor transaction success rates
5. Implement proper error handling and user feedback

This approach gives you a production-ready gasless transaction system with proper wallet integration! 🚀
