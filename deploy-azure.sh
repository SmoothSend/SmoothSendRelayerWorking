#!/bin/bash

# SmoothSend Backend Deployment Script for Azure Container Instances

# Configuration
RESOURCE_GROUP="smoothsend-rg"
LOCATION="centralindia"
CONTAINER_NAME="smoothsend-backend"
IMAGE_NAME="smoothsend-relayer"
REGISTRY_NAME="smoothsendregistry"

echo "🚀 Starting SmoothSend Backend Deployment to Azure..."

# Step 1: Login to Azure (if not already logged in)
echo "📝 Logging into Azure..."
az login

# Step 2: Create Resource Group (if not exists)
echo "📁 Creating Resource Group..."
az group create --name $RESOURCE_GROUP --location $LOCATION

# Step 3: Create Azure Container Registry
echo "🏗️ Creating Azure Container Registry..."
az acr create --resource-group $RESOURCE_GROUP \
  --name $REGISTRY_NAME \
  --sku Basic \
  --location $LOCATION

# Step 4: Enable admin access to registry
echo "🔐 Enabling admin access to registry..."
az acr update -n $REGISTRY_NAME --admin-enabled true

# Step 5: Get registry credentials
echo "📋 Getting registry credentials..."
ACR_SERVER=$(az acr show --name $REGISTRY_NAME --query loginServer --output tsv)
ACR_USERNAME=$(az acr credential show --name $REGISTRY_NAME --query username --output tsv)
ACR_PASSWORD=$(az acr credential show --name $REGISTRY_NAME --query passwords[0].value --output tsv)

echo "Registry Server: $ACR_SERVER"
echo "Registry Username: $ACR_USERNAME"

# Step 6: Login to Docker registry
echo "🔑 Logging into Docker registry..."
docker login $ACR_SERVER --username $ACR_USERNAME --password $ACR_PASSWORD

# Step 7: Tag and push image
echo "📦 Tagging and pushing Docker image..."
docker tag $IMAGE_NAME $ACR_SERVER/$IMAGE_NAME:latest
docker push $ACR_SERVER/$IMAGE_NAME:latest

# Step 8: Create Container Instance
echo "🚀 Creating Container Instance..."
az container create \
  --resource-group $RESOURCE_GROUP \
  --name $CONTAINER_NAME \
  --image $ACR_SERVER/$IMAGE_NAME:latest \
  --registry-login-server $ACR_SERVER \
  --registry-username $ACR_USERNAME \
  --registry-password $ACR_PASSWORD \
  --dns-name-label smoothsend-backend \
  --ports 3000 \
  --cpu 1 \
  --memory 2 \
  --environment-variables \
    NODE_ENV=production \
    PORT=3000 \
    APTOS_NETWORK=testnet \
    RELAYER_PRIVATE_KEY=$RELAYER_PRIVATE_KEY \
    CONTRACT_ADDRESS=$CONTRACT_ADDRESS \
    APTOS_RPC_URL=$APTOS_RPC_URL \
    TREASURY_ADDRESS=$TREASURY_ADDRESS \
    REDIS_URL=$REDIS_URL \
    DATABASE_URL=$DATABASE_URL \
    PYTH_HERMES_URL=https://hermes.pyth.network \
    FEE_MARKUP_PERCENTAGE=10 \
    MIN_APT_BALANCE=1000000000 \
    MAX_TRANSACTION_AMOUNT=1000000000 \
    LOG_LEVEL=info \
    RATE_LIMIT_WINDOW_MS=60000 \
    RATE_LIMIT_MAX_REQUESTS=100 \
    PRICE_CACHE_TTL=30 \
    GAS_ESTIMATE_BUFFER=20

# Step 9: Get container details
echo "📊 Getting container details..."
az container show --resource-group $RESOURCE_GROUP --name $CONTAINER_NAME --query ipAddress.fqdn --output tsv

echo "✅ Deployment complete!"
echo "🌐 Your backend is available at: http://$(az container show --resource-group $RESOURCE_GROUP --name $CONTAINER_NAME --query ipAddress.fqdn --output tsv):3000"
