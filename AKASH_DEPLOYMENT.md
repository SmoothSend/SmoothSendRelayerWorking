
--------------------------------# Akash Deployment Guide for SmoothSend Backend

This guide will help you deploy the SmoothSend backend to Akash Network's decentralized cloud platform.

## Prerequisites

1. **Akash CLI installed** - Follow the guide you provided earlier
2. **Docker installed** and running
3. **Akash wallet** with some AKT tokens for deployment costs
4. **Environment variables** configured for your backend

## Step 1: Prepare Environment Variables

Before deploying, you need to configure your environment variables. Edit the `deploy.yaml` file and add your actual values:

```yaml
env:
  - NODE_ENV=production
  - PORT=3000
  - DATABASE_URL=your-postgres-url
  - REDIS_URL=your-redis-url
  - APTOS_NODE_URL=https://api.testnet.aptoslabs.com
  - PRIVATE_KEY=your-private-key
  - GAS_STATION_ACCOUNT_ADDRESS=your-gas-station-address
```

## Step 2: Build Docker Image

Run the build script to create your Docker image:

```bash
./build-akash.sh
```

## Step 3: Deploy to Akash

### 3.1 Create Deployment

```bash
akash tx deployment create deploy.yaml \
  --from <your-wallet-name> \
  --gas auto \
  --gas-adjustment 1.3 \
  --chain-id akashnet-2 \
  --node https://rpc.akashnet.io:443
```

**Note the deployment sequence number (DSEQ) from the output - you'll need it for the next steps.**

### 3.2 Check Deployment Status

```bash
akash query deployment get \
  --owner <your-akash-address> \
  --dseq <deployment-sequence> \
  --node https://rpc.akashnet.io:443
```

### 3.3 View Available Bids

```bash
akash query market bid list \
  --owner <your-akash-address> \
  --dseq <deployment-sequence> \
  --node https://rpc.akashnet.io:443
```

### 3.4 Create Lease with Selected Provider

```bash
akash tx market lease create \
  --owner <your-akash-address> \
  --dseq <deployment-sequence> \
  --gseq 1 \
  --oseq 1 \
  --provider <provider-address> \
  --from <your-wallet-name> \
  --chain-id akashnet-2 \
  --node https://rpc.akashnet.io:443
```

### 3.5 Get Service Status and URL

```bash
akash provider service-status \
  --owner <your-akash-address> \
  --dseq <deployment-sequence> \
  --gseq 1 \
  --oseq 1 \
  --provider <provider-address> \
  --node https://rpc.akashnet.io:443
```

This will return your service URL where your backend is deployed.

## Step 4: Test Your Deployment

Once deployed, test your backend endpoints:

```bash
# Health check
curl https://your-akash-url/ping

# Test gasless transaction endpoint
curl -X POST https://your-akash-url/api/relayer/gasless-with-wallet \
  -H "Content-Type: application/json" \
  -d '{
    "transactionBytes": "...",
    "authenticatorBytes": "..."
  }'
```

## Step 5: Update Frontend Configuration

Update your frontend's API service to point to the new Akash deployment URL:

```typescript
// In smoothsend-frontend/app/lib/api-service.ts
const API_BASE_URL = 'https://your-akash-url/api';
```

## Troubleshooting

### Common Issues:

1. **Deployment fails**: Check your environment variables and ensure all required values are set
2. **Image not found**: Make sure you've built the Docker image locally first
3. **Service not responding**: Check the logs using the Akash provider tools
4. **High costs**: Adjust the pricing in `deploy.yaml` or choose a different provider

### Useful Commands:

```bash
# Check deployment logs
akash provider service-logs \
  --owner <your-address> \
  --dseq <dseq> \
  --gseq 1 \
  --oseq 1 \
  --provider <provider-address> \
  --service web \
  --node https://rpc.akashnet.io:443

# Close deployment
akash tx deployment close \
  --owner <your-address> \
  --dseq <dseq> \
  --from <your-wallet> \
  --chain-id akashnet-2 \
  --node https://rpc.akashnet.io:443
```

## Security Notes

- Never commit private keys to your repository
- Use environment variables for all sensitive data
- Consider using Akash's secrets management for production deployments
- Monitor your deployment costs regularly

## Next Steps

1. Deploy and test on Akash sandbox first
2. Configure proper monitoring and logging
3. Set up automated deployment pipelines
4. Consider using multiple providers for redundancy
