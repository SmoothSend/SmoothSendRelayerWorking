import { 
  Aptos, 
  AptosConfig, 
  Network, 
  Ed25519PrivateKey,
  Account,
  SimpleTransaction
} from '@aptos-labs/ts-sdk';
import { config } from '../src/config';

/**
 * Simple test script for gasless endpoint validation
 * 
 * This test validates:
 * 1. Relayer health check
 * 2. Transaction serialization
 * 3. Gasless transaction submission
 * 4. Response handling
 */

interface GaslessResponse {
  success: boolean;
  transactionHash?: string;
  message?: string;
  error?: string;
}

export async function testGaslessEndpoint(): Promise<void> {
  console.log('🧪 Starting gasless endpoint test...');
  
  const aptos = new Aptos(new AptosConfig({ network: Network.TESTNET }));
  const relayerUrl = 'http://localhost:3000/api/v1/relayer';
  
  try {
    // Step 1: Health check
    console.log('\n1️⃣ Testing relayer health...');
    const healthResponse = await fetch(`${relayerUrl}/health`);
    const health = await healthResponse.json();
    console.log('✅ Health check:', health);
    
    if (!health.status || health.status !== 'healthy') {
      throw new Error('Relayer is not healthy');
    }

    // Step 2: Create test account and transaction
    console.log('\n2️⃣ Setting up test transaction...');
    
    // Test account (replace with your test private key)
    const TEST_PRIVATE_KEY = process.env.TEST_PRIVATE_KEY || 
      "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef12";
    
    const senderKey = new Ed25519PrivateKey(TEST_PRIVATE_KEY);
    const sender = Account.fromPrivateKey({ privateKey: senderKey });
    
    // Test parameters
    const recipientAddress = process.env.TEST_RECIPIENT || 
      "0x742d35Cc6634C0532925a3b8D6Ac6E04d12398aB";
    const amount = "1000000"; // 1 USDC
    const relayerFee = "50000"; // 0.05 USDC
    
    console.log(`📤 Sender: ${sender.accountAddress.toString()}`);
    console.log(`📥 Recipient: ${recipientAddress}`);
    console.log(`💰 Amount: ${amount} (1 USDC)`);
    console.log(`⚡ Fee: ${relayerFee} (0.05 USDC)`);

    // Step 3: Build transaction
    console.log('\n3️⃣ Building transaction...');
    
    const transaction = await aptos.transaction.build.simple({
      sender: sender.accountAddress,
      data: {
        function: `${config.contractAddress}::smoothsend::send_with_fee`,
        functionArguments: [
          recipientAddress,
          amount,
          relayerFee
        ]
      }
    });
    
    console.log('✅ Transaction built successfully');

    // Step 4: Sign transaction
    console.log('\n4️⃣ Signing transaction...');
    
    const senderAuthenticator = aptos.transaction.sign({
      signer: sender,
      transaction
    });
    
    console.log('✅ Transaction signed successfully');

    // Step 5: Serialize for relayer
    console.log('\n5️⃣ Serializing transaction...');
    
    const transactionBytes = Array.from(transaction.bcsToBytes());
    const authenticatorBytes = Array.from(senderAuthenticator.bcsToBytes());
    
    console.log(`📦 Transaction bytes length: ${transactionBytes.length}`);
    console.log(`📦 Authenticator bytes length: ${authenticatorBytes.length}`);

    // Step 6: Submit to relayer
    console.log('\n6️⃣ Submitting to relayer...');
    
    const requestBody = {
      transactionBytes,
      authenticatorBytes,
      functionName: 'send_with_fee'
    };
    
    console.log('📡 Sending request to gasless endpoint...');
    
    const response = await fetch(`${relayerUrl}/gasless-wallet-serialized`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    // Step 7: Handle response
    console.log('\n7️⃣ Processing response...');
    
    console.log(`📊 Response status: ${response.status}`);
    console.log(`📊 Response headers:`, Object.fromEntries(response.headers.entries()));
    
    const responseText = await response.text();
    console.log(`📊 Raw response: ${responseText}`);
    
    let result: GaslessResponse;
    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      throw new Error(`Failed to parse response: ${parseError}. Raw response: ${responseText}`);
    }

    // Step 8: Validate results
    console.log('\n8️⃣ Validating results...');
    
    if (response.ok && result.success) {
      console.log('✅ GASLESS TEST PASSED!');
      console.log(`🎉 Transaction hash: ${result.transactionHash}`);
      console.log(`💬 Message: ${result.message}`);
      
      // Optional: Wait and verify transaction on chain
      if (result.transactionHash) {
        console.log('\n🔍 Verifying transaction on chain...');
        try {
          const txnInfo = await aptos.getTransactionByHash({
            transactionHash: result.transactionHash
          });
          console.log('✅ Transaction confirmed on chain');
          console.log(`� Transaction info:`, txnInfo);
          
          // Check if it's a UserTransactionResponse with gas info
          if ('gas_used' in txnInfo) {
            console.log(`�📈 Gas used: ${(txnInfo as any).gas_used}`);
          }
          if ('gas_unit_price' in txnInfo) {
            console.log(`💸 Gas unit price: ${(txnInfo as any).gas_unit_price}`);
          }
        } catch (verifyError) {
          console.log('⚠️ Could not verify transaction (may still be pending)');
        }
      }
    } else {
      console.log('❌ GASLESS TEST FAILED!');
      console.log(`💔 Error: ${result.error || result.message}`);
      throw new Error(`Test failed: ${result.error || result.message}`);
    }

  } catch (error) {
    console.log('\n❌ TEST FAILED WITH ERROR!');
    console.error('🚨 Error details:', error);
    throw error;
  }
}

/**
 * Test specific edge cases
 */
export async function testEdgeCases(): Promise<void> {
  console.log('\n🔬 Testing edge cases...');
  
  const relayerUrl = 'http://localhost:3000/api/v1/relayer';
  
  // Test 1: Invalid request body
  console.log('\n🧪 Test 1: Invalid request body');
  try {
    const response = await fetch(`${relayerUrl}/gasless-wallet-serialized`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invalid: 'data' })
    });
    
    const result = await response.json();
    console.log(`📊 Status: ${response.status}`);
    console.log(`📊 Response:`, result);
    
    if (response.status === 400) {
      console.log('✅ Correctly rejected invalid request');
    } else {
      console.log('⚠️ Unexpected response to invalid request');
    }
  } catch (error) {
    console.log('⚠️ Edge case test error:', error);
  }
  
  // Test 2: Empty arrays
  console.log('\n🧪 Test 2: Empty transaction bytes');
  try {
    const response = await fetch(`${relayerUrl}/gasless-wallet-serialized`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transactionBytes: [],
        authenticatorBytes: [],
        functionName: 'send_with_fee'
      })
    });
    
    const result = await response.json();
    console.log(`📊 Status: ${response.status}`);
    console.log(`📊 Response:`, result);
  } catch (error) {
    console.log('⚠️ Edge case test error:', error);
  }
}

// Main test function
async function main(): Promise<void> {
  console.log('🚀 SmoothSend Gasless Endpoint Test Suite');
  console.log('==========================================');
  
  try {
    await testGaslessEndpoint();
    console.log('\n🎊 ALL TESTS PASSED!');
  } catch (error) {
    console.log('\n💥 TEST SUITE FAILED!');
    console.error(error);
    process.exit(1);
  }
  
  // Optionally run edge case tests
  if (process.env.RUN_EDGE_CASES === 'true') {
    try {
      await testEdgeCases();
      console.log('\n🧪 Edge case tests completed');
    } catch (error) {
      console.log('\n⚠️ Edge case tests had issues:', error);
    }
  }
}

// Run if this file is executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });
}
