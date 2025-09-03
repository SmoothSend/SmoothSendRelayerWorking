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
 * GaslessWalletClient - Reference implementation for gasless USDC transactions
 * 
 * This example demonstrates how to:
 * 1. Build and sign transactions for gasless relay
 * 2. Send transactions to the SmoothSend relayer
 * 3. Handle responses and errors
 */
export class GaslessWalletClient {
  private aptos: Aptos;
  private relayerUrl: string;

  constructor(
    network: Network = Network.TESTNET,
    relayerUrl: string = 'http://localhost:3000/api/v1/relayer'
  ) {
    const aptosConfig = new AptosConfig({ network });
    this.aptos = new Aptos(aptosConfig);
    this.relayerUrl = relayerUrl;
  }

  /**
   * Send USDC gaslessly using the SmoothSend relayer
   * @param senderPrivateKey - Sender's private key
   * @param recipientAddress - Recipient's address
   * @param amount - Amount in USDC (smallest units)
   * @param relayerFee - Fee for the relayer (smallest units)
   */
  async sendUSDCGasless(
    senderPrivateKey: string,
    recipientAddress: string,
    amount: string,
    relayerFee: string = "50000" // 0.05 USDC default
  ): Promise<any> {
    try {
      console.log('🚀 Starting gasless USDC transaction...');
      
      // Create sender account
      const privateKey = new Ed25519PrivateKey(senderPrivateKey);
      const sender = Account.fromPrivateKey({ privateKey });
      
      console.log(`📤 Sender: ${sender.accountAddress.toString()}`);
      console.log(`📥 Recipient: ${recipientAddress}`);
      console.log(`💰 Amount: ${amount} USDC`);
      console.log(`⚡ Relayer Fee: ${relayerFee} USDC`);

      // Build transaction
      const transaction = await this.aptos.transaction.build.simple({
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

      console.log('📝 Transaction built successfully');

      // Sign transaction
      const senderAuthenticator = this.aptos.transaction.sign({
        signer: sender,
        transaction
      });

      console.log('✍️ Transaction signed successfully');

      // Serialize for relayer
      const transactionBytes = Array.from(transaction.bcsToBytes());
      const authenticatorBytes = Array.from(senderAuthenticator.bcsToBytes());

      // Send to relayer
      console.log('🌐 Sending to relayer...');
      const response = await fetch(`${this.relayerUrl}/gasless-wallet-serialized`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          transactionBytes,
          authenticatorBytes,
          functionName: 'send_with_fee'
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Relayer error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ Gasless transaction successful!');
      console.log('📊 Result:', result);
      
      return result;

    } catch (error) {
      console.error('❌ Gasless transaction failed:', error);
      throw error;
    }
  }

  /**
   * Check relayer health
   */
  async checkRelayerHealth(): Promise<any> {
    try {
      const response = await fetch(`${this.relayerUrl}/health`);
      const health = await response.json();
      console.log('🏥 Relayer health:', health);
      return health;
    } catch (error) {
      console.error('❌ Failed to check relayer health:', error);
      throw error;
    }
  }

  /**
   * Get account USDC balance
   */
  async getUSDCBalance(accountAddress: string): Promise<string> {
    try {
      const resources = await this.aptos.getAccountResources({
        accountAddress
      });
      
      // Find USDC coin store
      const usdcCoinType = "0x3c27315fb69ba6e4b960f1507d1cefcc9a4247869f26a8d59d6b7869d23782c::test_coins::USDC";
      const coinStore = resources.find(resource => 
        resource.type === `0x1::coin::CoinStore<${usdcCoinType}>`
      );
      
      if (coinStore && 'data' in coinStore) {
        const balance = (coinStore.data as any).coin.value;
        console.log(`💰 USDC Balance: ${balance}`);
        return balance;
      }
      
      return "0";
    } catch (error) {
      console.error('❌ Failed to get USDC balance:', error);
      return "0";
    }
  }
}

// Example usage
async function main() {
  const client = new GaslessWalletClient();
  
  // Check relayer health first
  await client.checkRelayerHealth();
  
  // Example transaction (replace with real values)
  const SENDER_PRIVATE_KEY = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef12";
  const RECIPIENT_ADDRESS = "0x742d35Cc6634C0532925a3b8D6Ac6E04d12398aB";
  const AMOUNT = "1000000"; // 1 USDC
  const RELAYER_FEE = "50000"; // 0.05 USDC

  try {
    await client.sendUSDCGasless(
      SENDER_PRIVATE_KEY,
      RECIPIENT_ADDRESS,
      AMOUNT,
      RELAYER_FEE
    );
  } catch (error) {
    console.error('Example transaction failed:', error);
  }
}

// Run if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}
