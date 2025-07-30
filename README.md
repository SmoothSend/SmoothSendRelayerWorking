<img width="364" height="133" alt="image" src="https://github.com/user-attachments/assets/2c1af578-aa22-47e1-86d3-2008589c6ace" /># 🚀 SmoothSend - Aptos Gasless Transaction Relayer

A **production-ready gasless transaction relayer** for Aptos blockchain that allows users to send USDC without holding APT for gas fees. The relayer uses **Pyth Network oracle** for real-time pricing and charges sustainable fees in USDC.

## ✨ Features

- **🔓 True Gasless Transactions**: Users pay 0 APT for gas fees
- **💰 Oracle-Based Pricing**: Dynamic USDC fees based on real APT gas costs (50% markup)
- **🌐 Pyth Network Integration**: Real-time APT/USD price feeds every 30 seconds
- **🛡️ Production Security**: Rate limiting, input validation, error handling
- **📊 Transaction Analytics**: Optional Supabase database for transaction tracking
- **⚡ High Performance**: Redis caching, connection pooling
- **🎯 Sustainable Business Model**: Profitable fee structure proven on testnet
- **🔧 Easy Integration**: Simple REST API + React frontend ready
- **📱 Mobile Ready**: Responsive design with modern UI components

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Frontend│───▶│  Relayer API    │───▶│  Aptos Network  │
│   (Next.js)     │    │  (Node.js)      │    │   (Testnet)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │    Supabase     │    ┌─────────────────┐
                       │  (PostgreSQL)   │◄───│  Pyth Network   │
                       └─────────────────┘    │  (Price Oracle) │
                              │               └─────────────────┘
                              ▼
                       ┌─────────────────┐
                       │     Redis       │
                       │  (Price Cache)  │
                       └─────────────────┘
```

## 💰 Business Model & Proven Success

### How It Works:
1. **User initiates USDC transfer** via frontend
2. **Oracle fetches live APT price** from Pyth Network
3. **System calculates gas cost** in APT → converts to USDC
4. **Applies 50% markup** for sustainability
5. **User pays USDC fee** to relayer
6. **Relayer pays APT gas** and keeps profit

### Recent Live Transaction:
**Hash:** `0xfe8a6c72cc3e3a1f47364cac331eae5808ee89852795157592c288ee696e4efe`

**Results:**
- **User**: Paid 1.001 USDC (1 USDC + 0.001 fee), **0 APT gas** ✅
- **Relayer**: Earned 0.001 USDC profit, paid ~0.0001 APT gas ✅
- **Business Model**: **Profitable & Sustainable** ✅

## 🚀 Quick Start Guide

### Prerequisites
- Node.js 18+
- Git
- Aptos testnet account with APT

### 1. Clone & Setup
```bash
git clone <your-repo-url>
cd smoothsendxyz
npm install
```

### 2. Environment Configuration
```bash
cp env.template .env
```

Edit `.env` with your settings:
```env
# Core Configuration
APTOS_NETWORK=testnet
RELAYER_PRIVATE_KEY=your_relayer_private_key_here
CONTRACT_ADDRESS=0x6d88ee2fde204e756874e13f5d5eddebd50725805c0a332ade87d1ef03f9148b

# Oracle & RPC
PYTH_HERMES_URL=https://hermes.pyth.network
APTOS_RPC_URL=https://api.testnet.aptoslabs.com/v1

# Database (choose one):
# Option 1: SQLite (easiest)
DATABASE_URL=sqlite:./smoothsend.db
# Option 2: Supabase (recommended)
# DATABASE_URL=postgresql://user:pass@db.supabase.co:5432/postgres

# Optional Services
REDIS_URL=redis://localhost:6379
PORT=3000
```

### 3. Start Backend
```bash
# Development
npm run dev

# Production
npm run build && npm start
```

### 4. Start Frontend
```bash
cd smoothsend-frontend
npm install
npm run dev
```

**🎉 Access your app at:** `http://localhost:3001`

## 📊 Supabase Database Setup

### Why Supabase?
- ✅ **Free Tier**: 500MB storage, 2 CPU cores
- ✅ **Real-time**: Live dashboard and analytics
- ✅ **No Setup**: Fully managed PostgreSQL
- ✅ **Built-in APIs**: REST and GraphQL ready

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Click "Start your project"
3. Create new project
4. Choose region (closest to your users)
5. Set strong database password

### 2. Database Schema

Create this table in Supabase SQL Editor:

```sql
-- SmoothSend Transactions Table
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hash TEXT UNIQUE NOT NULL,
    from_address TEXT NOT NULL,
    to_address TEXT NOT NULL,
    amount TEXT NOT NULL,
    coin_type TEXT NOT NULL,
    gas_units TEXT NOT NULL,
    gas_price TEXT NOT NULL,
    total_gas_fee TEXT NOT NULL,
    apt_price TEXT NOT NULL,
    usdc_fee TEXT NOT NULL,
    relayer_fee TEXT NOT NULL,
    treasury_fee TEXT NOT NULL,
    status TEXT CHECK (status IN ('pending', 'success', 'failed')) DEFAULT 'pending',
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_transactions_hash ON transactions(hash);
CREATE INDEX idx_transactions_from_address ON transactions(from_address);
CREATE INDEX idx_transactions_created_at ON transactions(created_at);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_transactions_updated_at 
    BEFORE UPDATE ON transactions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 3. Get Connection String

1. Go to **Settings** → **Database**
2. Copy **Connection string**
3. Replace `[YOUR-PASSWORD]` with your database password
4. Add to your `.env`:

```env
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
```

### 4. Verify Connection

Run your backend:
```bash
npm start
```

Look for this log:
```
✅ Database connected successfully
```

## 🎮 Frontend Integration Guide

### Frontend Architecture

The SmoothSend frontend is built with:
- **Next.js 14** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Radix UI** - Accessible components
- **Aptos SDK** - Blockchain integration

### Key Components

```typescript
// Main transaction flow
smoothsend-frontend/
├── app/
│   ├── components/
│   │   ├── transfer-form.tsx      // Main transfer interface
│   │   ├── wallet-provider.tsx    // Wallet connection logic
│   │   ├── transaction-progress.tsx // Progress indicator
│   │   └── transaction-history.tsx // Transaction list
│   ├── lib/
│   │   ├── api-service.ts         // Backend API calls
│   │   └── constants.ts           // Configuration
│   └── page.tsx                   // Main app page
```

### Transaction Flow

1. **User Input** → Amount & recipient address
2. **Quote Request** → Backend calculates oracle-based fee
3. **User Approval** → Frontend shows fee breakdown
4. **Transaction Submit** → Gasless transaction via relayer
5. **Success Display** → Transaction hash & confirmation

### API Integration

```typescript
// Frontend calls backend like this:
const quote = await apiService.getGaslessQuote({
  fromAddress: userAddress,
  toAddress: recipientAddress,
  amount: (amountInUSDC * 1_000_000).toString(), // Convert to micro units
  coinType: "0x...::USDC"
});

const result = await apiService.submitGaslessTransaction({
  transaction: quote.transactionData,
  userSignature: walletSignature,
  fromAddress: userAddress,
  toAddress: recipientAddress,
  amount: (amountInUSDC * 1_000_000).toString(),
  coinType: "0x...::USDC",
  relayerFee: quote.quote.relayerFee
});
```

### Customization

Update these files to customize:

**1. Branding (`app/page.tsx`)**
```typescript
// Change app title, description, colors
const appConfig = {
  name: "Your App Name",
  description: "Your gasless USDC transfers",
  theme: "your-theme-colors"
}
```

**2. Supported Tokens (`lib/constants.ts`)**
```typescript
export const SUPPORTED_COINS = {
  USDC: "0x...::your_usdc_contract",
  // Add more tokens
}
```

**3. Styling (`globals.css`)**
```css
/* Update colors, fonts, layout */
:root {
  --primary: your-brand-color;
  --background: your-bg-color;
}
```

## 🔌 API Reference

### Base URL
```
http://localhost:3000/api
```

### Endpoints

#### 1. Get Gasless Quote
```http
POST /gasless/quote
Content-Type: application/json

{
  "fromAddress": "0x123...",
  "toAddress": "0x456...",
  "amount": "1000000",  // 1 USDC in micro units
  "coinType": "0x...::USDC"
}
```

**Response:**
```json
{
  "gasUnits": "1000",
  "gasPricePerUnit": "100", 
  "totalGasFee": "100000",
  "aptPrice": "4.52",
  "usdcFee": "1000",
  "relayerFee": "1000",
  "treasuryFee": "100",
  "transactionData": { /* transaction object */ }
}
```

#### 2. Submit Gasless Transaction
```http
POST /gasless/submit
Content-Type: application/json

{
  "transaction": { /* from quote response */ },
  "userSignature": {
    "signature": "0x...",
    "publicKey": "0x..."
  },
  "fromAddress": "0x123...",
  "toAddress": "0x456...",
  "amount": "1000000",
  "coinType": "0x...::USDC",
  "relayerFee": "1000"
}
```

**Response:**
```json
{
  "success": true,
  "hash": "0xabc123...",
  "transactionId": "uuid"
}
```

#### 3. Transaction Status
```http
GET /transaction/{hash}
```

**Response:**
```json
{
  "hash": "0xabc123...",
  "status": "success",
  "from_address": "0x123...",
  "to_address": "0x456...",
  "amount": "1000000",
  "relayer_fee": "1000",
  "apt_price": "4.52",
  "created_at": "2025-01-15T10:30:00Z"
}
```

#### 4. Health Check
```http
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "services": {
    "database": "connected",
    "redis": "connected", 
    "oracle": "working"
  },
  "balances": {
    "relayer": {
      "apt": "1.234567",
      "usdc": "0.005"
    }
  },
  "pricing": {
    "apt_usd": "4.52",
    "last_updated": "2025-01-15T10:30:00Z"
  }
}
```

## 📊 Analytics & Monitoring

### Supabase Dashboard

Access your transaction data:

1. **Go to Supabase Dashboard**
2. **Click "Table Editor"**
3. **Select "transactions" table**

### Useful Queries

**Daily Transaction Volume:**
```sql
SELECT 
    DATE(created_at) as date,
    COUNT(*) as transactions,
    SUM(CAST(amount AS BIGINT)) / 1000000.0 as total_usdc,
    SUM(CAST(relayer_fee AS BIGINT)) / 1000000.0 as total_fees
FROM transactions 
WHERE status = 'success'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

**Top Users:**
```sql
SELECT 
    from_address,
    COUNT(*) as transaction_count,
    SUM(CAST(amount AS BIGINT)) / 1000000.0 as total_volume
FROM transactions 
WHERE status = 'success'
GROUP BY from_address
ORDER BY transaction_count DESC;
```

**Success Rate:**
```sql
SELECT 
    status,
    COUNT(*) as count,
    COUNT(*) * 100.0 / SUM(COUNT(*)) OVER() as percentage
FROM transactions
GROUP BY status;
```

### Real-time Monitoring

Enable real-time updates in Supabase:

1. **Go to Database → Replication**
2. **Enable realtime for "transactions" table**
3. **Use in your frontend:**

```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(url, key)

// Listen to transaction updates
supabase
  .channel('transactions')
  .on('postgres_changes', 
    { event: 'INSERT', schema: 'public', table: 'transactions' },
    (payload) => {
      console.log('New transaction:', payload.new)
    }
  )
  .subscribe()
```

## 🛡️ Security & Production Deployment

### Environment Security

**Never commit these to git:**
```env
RELAYER_PRIVATE_KEY=  # Keep this secret!
DATABASE_URL=         # Contains password
```

**Use environment variables in production:**
```bash
# Vercel/Netlify
RELAYER_PRIVATE_KEY=${{ secrets.RELAYER_PRIVATE_KEY }}

# Docker
docker run -e RELAYER_PRIVATE_KEY=$RELAYER_PRIVATE_KEY yourapp
```

### Rate Limiting

Default limits:
- **Global**: 100 requests per minute
- **Per IP**: 10 requests per minute
- **Per Address**: 5 transactions per minute

### Input Validation

All endpoints validate:
- ✅ Address format (Aptos format)
- ✅ Amount range (min/max limits)
- ✅ Coin type (supported tokens only)
- ✅ Signature format

## 🚀 Deployment Options

### 1. Railway (Recommended)
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway init
railway up
```

### 2. Vercel (Frontend)
```bash
# Deploy frontend
cd smoothsend-frontend
vercel --prod
```

### 3. Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### 4. VPS (Manual)
```bash
# Ubuntu/Debian setup
sudo apt update
sudo apt install nodejs npm postgresql redis
git clone your-repo
cd smoothsendxyz
npm install && npm run build
sudo systemctl enable smoothsend
```

## 🧪 Testing

### Backend Testing
```bash
# Run the verification script
node test-verify-relayer-earnings.js
```

### Frontend Testing
```bash
cd smoothsend-frontend
npm run test
```

### Load Testing
```bash
# Install artillery
npm install -g artillery

# Test quote endpoint
artillery quick --count 100 --num 10 http://localhost:3000/api/gasless/quote
```

## 🔧 Troubleshooting

### Common Issues

**❌ "Oracle price fetch failed"**
```bash
# Check Pyth Network connection
curl "https://hermes.pyth.network/api/latest_price_feeds?ids[]=0x03ae4db29ed4ae33d323568895aa00337e658e348b37509f5372ae51f0af00d5"
```

**❌ "Database connection failed"**
```bash
# Test Supabase connection
psql "postgresql://user:pass@db.supabase.co:5432/postgres"
```

**❌ "Insufficient APT balance"**
- Add APT to your relayer wallet
- Check balance: `npm run check-balance`

**❌ "Transaction failed"**
- Verify contract address in .env
- Check user has sufficient USDC
- Ensure testnet RPC is working

### Debug Mode
```bash
LOG_LEVEL=debug npm run dev
```

### Health Checks
```bash
# Backend health
curl http://localhost:3000/health

# Frontend health  
curl http://localhost:3001/api/health
```

## 📈 Performance Optimization

### Backend Optimizations
- **Redis Caching**: APT prices cached for 30 seconds
- **Connection Pooling**: Database connections reused
- **Compression**: Gzip enabled for API responses
- **Rate Limiting**: Prevents abuse and overload

### Frontend Optimizations
- **Code Splitting**: Pages loaded on demand
- **Image Optimization**: Next.js automatic optimization
- **API Caching**: SWR for smart data fetching
- **Bundle Analysis**: Use `npm run analyze`

### Monitoring
```bash
# Monitor backend
npm run monitor

# Check performance
npm run perf-test
```

## ✨ Success Metrics

**Your SmoothSend relayer is ready to scale!**

✅ **Proven Business Model**: Profitable USDC fees for APT gas  
✅ **Production Security**: Rate limiting, validation, monitoring  
✅ **Real-time Oracle**: Pyth Network integration working  
✅ **Full Stack**: Backend + Frontend + Database ready  
✅ **Scalable**: Deploy to cloud in minutes  

**🚀 Start earning from gasless transactions today!**
