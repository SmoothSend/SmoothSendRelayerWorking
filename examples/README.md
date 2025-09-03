# Examples

This directory contains example implementations for using the SmoothSend gasless relayer.

## Files

### `client-example.ts`
A comprehensive reference implementation showing how to:
- Build and sign transactions for gasless relay
- Send transactions to the SmoothSend relayer
- Handle responses and errors
- Check relayer health
- Get USDC balances

## Usage

Run the client example:
```bash
npm run example:client
```

Or directly with ts-node:
```bash
npx ts-node examples/client-example.ts
```

## Configuration

Make sure to set the following environment variables:
- `TEST_PRIVATE_KEY` - Your test account private key
- `TEST_RECIPIENT` - Recipient address for test transactions

## Requirements

- Node.js
- TypeScript
- A test account with USDC balance
- SmoothSend relayer running on localhost:3000
