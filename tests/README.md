# Tests

This directory contains test files for validating the SmoothSend gasless relayer functionality.

## Files

### `test-gasless-simple.ts`
A comprehensive test suite that validates:
- Relayer health check
- Transaction serialization and signing
- Gasless transaction submission
- Response handling and error cases
- Edge case testing

## Usage

Run the gasless endpoint test:
```bash
npm run test:gasless
```

Or directly with ts-node:
```bash
npx ts-node tests/test-gasless-simple.ts
```

Run edge case tests:
```bash
RUN_EDGE_CASES=true npm run test:gasless
```

## Environment Variables

Set these for testing:
- `TEST_PRIVATE_KEY` - Your test account private key
- `TEST_RECIPIENT` - Recipient address for test transactions
- `RUN_EDGE_CASES` - Set to 'true' to run additional edge case tests

## Test Coverage

The test suite covers:
- ✅ Health endpoint validation
- ✅ Transaction building and signing
- ✅ Serialization and deserialization
- ✅ Gasless endpoint submission
- ✅ Response validation
- ✅ On-chain transaction verification
- ✅ Error handling
- ✅ Edge cases (invalid data, empty arrays, etc.)

## Requirements

- Node.js with TypeScript
- SmoothSend relayer running on localhost:3000
- Test account with USDC balance
- Valid recipient address
