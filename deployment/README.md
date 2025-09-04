# 🚀 SmoothSend Deployment Guide

This directory contains organized deployment scripts and configurations for deploying SmoothSend to various platforms.

## 📁 Directory Structure

```
deployment/
├── README.md              # This file - deployment documentation
├── deploy.sh              # Main deployment script (unified interface)
├── configs/               # Configuration files for different environments
│   ├── azure.conf         # Azure Container Instances configuration
│   ├── local.conf         # Local development configuration
│   └── docker.conf        # Docker Compose configuration
└── scripts/               # Individual deployment scripts
    ├── azure.sh           # Azure Container Instances deployment
    └── guide.sh           # Interactive deployment guide
```

## 🎯 Quick Start

### Option 1: Interactive Guide (Recommended for first-time users)
```bash
./deployment/deploy.sh guide
```

### Option 2: Direct Deployment
```bash
# Azure Container Instances
./deployment/deploy.sh azure

# Local Development
./deployment/deploy.sh local

# Docker Compose
./deployment/deploy.sh docker
```

## 📋 Prerequisites

### All Deployments
- ✅ Environment variables configured (see [Environment Variables](#environment-variables))
- ✅ SmoothSend relayer account funded with APT
- ✅ Contract deployed on target Aptos network

### Azure Deployment
- ✅ Azure CLI installed and configured (`az login`)
- ✅ Docker installed and running
- ✅ Azure subscription with sufficient credits
- ✅ PostgreSQL and Redis instances (Azure Database/Cache)

### Local Development
- ✅ Node.js 18+ installed
- ✅ PostgreSQL running locally
- ✅ Redis running locally

### Docker Deployment
- ✅ Docker and Docker Compose installed
- ✅ Environment variables configured

## 🔧 Configuration Files

### Azure Configuration (`configs/azure.conf`)
```bash
# Azure Container Instance settings
RESOURCE_GROUP="smoothsend-rg"
LOCATION="centralindia"
CONTAINER_NAME="smoothsend-backend"
IMAGE_NAME="smoothsend-relayer"
REGISTRY_NAME="smoothsendregistry"
DNS_NAME_LABEL="smoothsend-backend"
CPU_CORES="1"
MEMORY_GB="2"

# Application settings
APTOS_NETWORK="testnet"
PYTH_HERMES_URL="https://hermes.pyth.network"
FEE_MARKUP_PERCENTAGE="10"
MIN_APT_BALANCE="1000000000"
MAX_TRANSACTION_AMOUNT="1000000000"
LOG_LEVEL="info"
RATE_LIMIT_WINDOW_MS="60000"
RATE_LIMIT_MAX_REQUESTS="100"
PRICE_CACHE_TTL="30"
GAS_ESTIMATE_BUFFER="20"
```

### Local Configuration (`configs/local.conf`)
```bash
# Local development settings
NODE_ENV="development"
PORT="3000"
LOG_LEVEL="debug"
```

### Docker Configuration (`configs/docker.conf`)
```bash
# Docker Compose settings
COMPOSE_PROJECT_NAME="smoothsend"
POSTGRES_VERSION="15"
REDIS_VERSION="7-alpine"
```

## 🌍 Environment Variables

Create appropriate environment files for your deployment:

### Required for All Deployments
```bash
# Aptos Configuration
APTOS_NETWORK=testnet                           # or mainnet
APTOS_RPC_URL=https://api.testnet.aptoslabs.com/v1
RELAYER_PRIVATE_KEY=0x...                       # Your relayer private key
CONTRACT_ADDRESS=0x...                          # SmoothSend contract address
TREASURY_ADDRESS=0x...                          # Treasury wallet address

# Database Configuration
DATABASE_URL=postgresql://user:pass@host:5432/smoothsend
REDIS_URL=redis://host:6379

# API Configuration
PORT=3000
NODE_ENV=production
LOG_LEVEL=info
```

### Azure-Specific Variables
```bash
# Azure Resource Configuration
AZURE_RESOURCE_GROUP=smoothsend-rg
AZURE_LOCATION=centralindia
AZURE_REGISTRY_NAME=smoothsendregistry
```

### Optional Configuration
```bash
# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# Transaction Limits
MIN_APT_BALANCE=1000000000
MAX_TRANSACTION_AMOUNT=1000000000

# Pricing
FEE_MARKUP_PERCENTAGE=10
PRICE_CACHE_TTL=30
GAS_ESTIMATE_BUFFER=20

# External Services
PYTH_HERMES_URL=https://hermes.pyth.network
```

## 🎛️ Deployment Commands

### Main Deployment Script (`deploy.sh`)

The main deployment script provides a unified interface for all deployment types:

```bash
# Show help
./deployment/deploy.sh help

# Interactive guide
./deployment/deploy.sh guide

# Deploy to Azure with custom config
./deployment/deploy.sh azure --config configs/production.conf

# Local development with custom environment
./deployment/deploy.sh local --env .env.local

# Docker deployment with dry run
./deployment/deploy.sh docker --dry-run

# Validate environment for all deployment types
./deployment/deploy.sh validate

# Clean up deployment artifacts
./deployment/deploy.sh clean
```

#### Command Options
- `--config FILE`: Use specific configuration file
- `--env FILE`: Load environment from specific file
- `--dry-run`: Show what would be done without executing
- `--verbose`: Enable verbose output
- `--force`: Force deployment without confirmation

### Individual Scripts

#### Azure Deployment (`scripts/azure.sh`)
```bash
# Direct execution
./deployment/scripts/azure.sh

# With environment variables
RELAYER_PRIVATE_KEY=0x... ./deployment/scripts/azure.sh
```

#### Deployment Guide (`scripts/guide.sh`)
```bash
# Interactive deployment guide
./deployment/scripts/guide.sh
```

## 🧪 Testing Deployments

### Health Checks
All deployments should respond to health checks:

```bash
# Local
curl http://localhost:3000/api/v1/relayer/health

# Azure
curl https://your-app.azurecontainer.io:3000/api/v1/relayer/health

# Docker
curl http://localhost:3000/api/v1/relayer/health
```

### API Testing
```bash
# Check balance
curl "http://your-endpoint/api/v1/relayer/balance/0x123..."

# Get statistics
curl "http://your-endpoint/api/v1/relayer/stats"

# Check safety stats
curl "http://your-endpoint/api/v1/relayer/safety-stats"
```

## 🔍 Monitoring & Logs

### Azure Container Instances
```bash
# View logs
az container logs --resource-group smoothsend-rg --name smoothsend-backend

# Monitor container
az container show --resource-group smoothsend-rg --name smoothsend-backend
```

### Docker Compose
```bash
# View logs
docker-compose logs -f smoothsend-backend

# Check status
docker-compose ps

# Monitor resources
docker stats
```

### Local Development
```bash
# Application logs are output to console
npm run dev

# Database logs (if using local PostgreSQL)
tail -f /usr/local/var/log/postgresql/*.log
```

## 🚨 Troubleshooting

### Common Issues

#### Azure Deployment
```bash
# Issue: Container fails to start
# Solution: Check environment variables and container logs
az container logs --resource-group smoothsend-rg --name smoothsend-backend

# Issue: Registry authentication fails
# Solution: Recreate registry credentials
az acr credential renew --name smoothsendregistry --password-name password
```

#### Docker Deployment
```bash
# Issue: Port conflicts
# Solution: Stop conflicting services or change ports
docker-compose down
lsof -i :3000  # Check what's using port 3000

# Issue: Database connection fails
# Solution: Verify PostgreSQL container is running
docker-compose ps
docker-compose logs postgres
```

#### Local Development
```bash
# Issue: Node version incompatibility
# Solution: Use Node.js 18+
nvm install 18
nvm use 18

# Issue: Database connection fails
# Solution: Check PostgreSQL service
brew services start postgresql  # macOS
sudo systemctl start postgresql  # Linux
```

### Debug Mode

Enable verbose logging for troubleshooting:

```bash
# Enable debug logs
export LOG_LEVEL=debug

# Verbose deployment
./deployment/deploy.sh azure --verbose

# Check environment validation
./deployment/deploy.sh validate
```

## 🔒 Security Considerations

### Environment Variables
- ✅ Never commit private keys to version control
- ✅ Use secure storage for production secrets (Azure Key Vault, etc.)
- ✅ Rotate private keys regularly
- ✅ Use different keys for different environments

### Network Security
- ✅ Configure CORS properly for your frontend domain
- ✅ Use HTTPS in production
- ✅ Implement rate limiting
- ✅ Monitor for unusual activity

### Access Control
- ✅ Limit Azure resource group access
- ✅ Use principle of least privilege for service accounts
- ✅ Enable audit logging
- ✅ Regular security reviews

## 📚 Additional Resources

- [Main SmoothSend Documentation](../README.md)
- [API Documentation](../docs/API_DOCUMENTATION.md)
- [Environment Variables Guide](../docs/ENVIRONMENT_VARIABLES.md)
- [Backend Architecture](../docs/BACKEND_ARCHITECTURE.md)
- [Azure Container Instances Docs](https://docs.microsoft.com/en-us/azure/container-instances/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)

## 🤝 Getting Help

If you encounter issues:

1. Check the [troubleshooting section](#troubleshooting)
2. Run `./deployment/deploy.sh validate` to check your environment
3. Use `./deployment/deploy.sh guide` for interactive help
4. Check the logs for your specific deployment type
5. Refer to the main project documentation

---

**Happy Deploying! 🚀**
