# 🚀 SmoothSend Gasless Relayer

> **Production-ready gasless USDC relayer for Aptos blockchain**

[![Status](https://img.shields.io/badge/status-production--ready-brightgreen.svg)](https://github.com/smoothsend/relayer)
[![Aptos](https://img.shields.io/badge/blockchain-Aptos-blue.svg)](https://aptoslabs.com)
[![TypeScript](https://img.shields.io/badge/language-TypeScript-blue.svg)](https://www.typescriptlang.org)

SmoothSend enables users to send USDC on Aptos without paying gas fees. The relayer sponsors all transaction costs, making crypto transfers as simple as traditional payments.

## ✨ Features

- 🚀 **Gasless Transactions**: Send USDC without gas fees
- 🔒 **Wallet Integration**: Works with all Aptos wallets (Petra, Martian, etc.)
- ⚡ **Fast & Reliable**: 1-2 second transaction processing
- 🛡️ **Production Security**: Rate limiting, signature verification, safety monitors
- 📊 **Real-time Monitoring**: Health checks, stats, and safety metrics
- 🧪 **Beta Ready**: Safe testing with daily limits and monitoring

## 🚀 Quick Start

### 1. Installation
```bash
git clone https://github.com/smoothsend/relayer.git
cd smoothsend
npm install
```

### 2. Environment Setup
```bash
cp .env.example .env
# Edit .env with your configuration using standardized variable names
```

**🆕 New:** SmoothSend now uses a unified environment variable management system with validation. See [`docs/ENVIRONMENT_VARIABLES.md`](./docs/ENVIRONMENT_VARIABLES.md) for the complete configuration guide.

### 3. Start Development Server
```bash
npm run dev
# Server runs on http://localhost:3000
```

### 4. Test the API
```bash
# Check health
curl http://localhost:3000/api/v1/relayer/health

# Check your balance
curl "http://localhost:3000/api/v1/relayer/balance/YOUR_ADDRESS"
```

## 📡 API Overview

**Base URL:** `http://localhost:3000/api/v1/relayer`

### 🎯 Key Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/gasless-wallet-serialized` | **Send gasless USDC** (recommended) |
| `GET` | `/health` | Service health check |
| `GET` | `/balance/:address` | Get USDC balance |
| `GET` | `/stats` | Transaction statistics |
| `GET` | `/safety-stats` | Beta safety limits |
| `POST` | `/quote` | Traditional relayer quotes |
| `GET` | `/status/:txnHash` | Transaction status |

### 💸 Send Gasless USDC
```typescript
// Using the gasless client (see examples/client-example.ts)
const client = new GaslessWalletClient(Network.TESTNET, 'http://localhost:3000');

await client.sendUSDCGasless(
  senderAddress,
  signFunction,     // Your wallet's sign function
  recipientAddress,
  10               // 10 USDC
);
```

**📖 [Complete API Documentation →](docs/API_DOCUMENTATION.md)**

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Relayer      │    │     Aptos       │
│   (Wallet)      │    │    Server       │    │   Blockchain    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │ 1. Build Transaction  │                       │
         │ ────────────────────> │                       │
         │                       │                       │
         │ 2. Sign Transaction   │                       │
         │ <──────────────────── │                       │
         │                       │                       │
         │ 3. Submit Serialized  │ 4. Add Fee Payer      │
         │ ────────────────────> │ ────────────────────> │
         │                       │                       │
         │ 5. Transaction Hash   │ 6. Confirmed          │
         │ <──────────────────── │ <──────────────────── │
```

### Key Benefits
- ✅ **No Race Conditions**: Transaction serialization eliminates sequence number conflicts
- ✅ **Universal Wallet Support**: Works with all Aptos wallets
- ✅ **Production Security**: Comprehensive validation and monitoring
- ✅ **Maintainable Code**: Clean, consolidated architecture

## 🛡️ Security & Safety

### Production Security
- **Rate Limiting**: 100 requests/min per address
- **Signature Verification**: Ed25519 cryptographic validation
- **Transaction Validation**: Balance, amount, and contract checks
- **Relayer Whitelist**: Only approved relayers can sponsor transactions

### Beta Safety Limits
- **Transaction Limit**: 10 USDC per transaction
- **Daily Limit**: 100 USDC per user per day
- **Global Limit**: 1,000 USDC daily system-wide
- **Real-time Monitoring**: Live safety statistics and alerts

## 📊 Monitoring

### Health Dashboard
```bash
# Service health
curl http://localhost:3000/api/v1/relayer/health

# Usage statistics  
curl http://localhost:3000/api/v1/relayer/stats

# Safety monitoring
curl http://localhost:3000/api/v1/relayer/safety-stats
```

### Sample Response
```json
{
  "status": "healthy",
  "relayerBalance": "3039129700", 
  "totalTransactions": 150,
  "successRate": 98.7,
  "betaLimits": {
    "maxSingleTransaction": 10,
    "dailyVolumeRemaining": 945.5
  }
}
```

## 🧪 Testing

### Run Full Test Suite
```bash
npm test
```

### Test Gasless Functionality
```bash
# Test the gasless endpoint
npm run test:gasless

# Test with real wallet integration
npm run example:client
```

### Manual Testing
```bash
# Test endpoints
npm run test:endpoints

# Load testing
npm run test:load
```

## 🚀 Deployment

SmoothSend includes an organized deployment system with support for multiple platforms. All deployment scripts and configurations are located in the `deployment/` directory.

### Quick Start

**🎯 Interactive Guide (Recommended)**
```bash
./deployment/deploy.sh guide
```

**⚡ Direct Deployment**
```bash
# Azure Container Instances (Production)
./deployment/deploy.sh azure

# Local Development
./deployment/deploy.sh local

# Docker Compose (Local + Dependencies)
./deployment/deploy.sh docker
```

### Deployment Options

| Platform | Command | Use Case |
|----------|---------|----------|
| **Azure Container Instances** | `./deployment/deploy.sh azure` | Production deployment with auto-scaling |
| **Local Development** | `./deployment/deploy.sh local` | Development and testing |
| **Docker Compose** | `./deployment/deploy.sh docker` | Local with PostgreSQL + Redis |
| **Interactive Guide** | `./deployment/deploy.sh guide` | Step-by-step deployment help |

### Advanced Usage

```bash
# Deploy with custom configuration
./deployment/deploy.sh azure --config deployment/configs/production.conf

# Dry run (show what would be done)
./deployment/deploy.sh azure --dry-run

# Validate environment for all deployment types
./deployment/deploy.sh validate

# Clean up deployment artifacts
./deployment/deploy.sh clean
```

**📖 [Complete Deployment Guide →](deployment/README.md)**

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| [**API Documentation**](docs/API_DOCUMENTATION.md) | Complete endpoint reference |
| [**Deployment Guide**](deployment/README.md) | Comprehensive deployment instructions |
| [Backend Architecture](docs/BACKEND_ARCHITECTURE.md) | Technical implementation details |
| [Environment Variables](docs/ENVIRONMENT_VARIABLES.md) | Configuration guide |
| [Safety Statistics](docs/SAFETY_STATS_EXPLAINED.md) | Safety monitoring explained |

## 🎯 Roadmap

### ✅ Current (Production Ready)
- Gasless USDC transfers
- Proper wallet integration  
- Rate limiting and safety
- Health monitoring
- Beta testing ready

### 🔄 Upcoming (v1.1)
- Multiple coin support (APT, other tokens)
- Mainnet deployment
- Advanced analytics dashboard
- Auto-scaling relayer infrastructure
- Fee optimization algorithms

## 🤝 Contributing

1. **Fork** the repository
2. **Create** your feature branch (`git checkout -b feature/amazing-feature`)
3. **Test** your changes (`npm test`)
4. **Commit** your changes (`git commit -m 'Add amazing feature'`)
5. **Push** to the branch (`git push origin feature/amazing-feature`)
6. **Open** a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

- **Documentation**: [API Reference](docs/API_DOCUMENTATION.md)
- **Issues**: [GitHub Issues](https://github.com/smoothsend/relayer/issues)
- **Discord**: [Join our community](https://discord.gg/smoothsend)

---

**Built with ❤️ for the Aptos ecosystem**  
*Making crypto transactions as smooth as traditional payments*
