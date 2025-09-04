#!/bin/bash

# SmoothSend Azure Container Instance Deployment Script
# Deploys the SmoothSend backend to Azure Container Instances with Redis and PostgreSQL

set -e  # Exit on any error

# Load configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/../configs/azure.conf"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Validation function
validate_environment() {
    log_info "Validating environment variables..."
    
    local required_vars=(
        "RELAYER_PRIVATE_KEY"
        "CONTRACT_ADDRESS"
        "APTOS_RPC_URL"
        "TREASURY_ADDRESS"
        "DATABASE_URL"
        "REDIS_URL"
    )
    
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var}" ]]; then
            log_error "Required environment variable $var is not set"
            log_info "Please check your environment configuration"
            exit 1
        fi
    done
    
    log_success "Environment validation passed"
}

# Main deployment function
deploy_to_azure() {
    log_info "🚀 Starting SmoothSend Backend Deployment to Azure Container Instances"
    
    # Validate environment
    validate_environment
    
    # Step 1: Login to Azure
    log_info "📝 Checking Azure login status..."
    if ! az account show &>/dev/null; then
        log_info "Not logged in to Azure. Starting login process..."
        az login
    else
        log_success "Already logged in to Azure"
    fi
    
    # Step 2: Create Resource Group
    log_info "📁 Creating Resource Group: $RESOURCE_GROUP"
    az group create --name "$RESOURCE_GROUP" --location "$LOCATION" &>/dev/null || log_warning "Resource group may already exist"
    log_success "Resource group ready"
    
    # Step 3: Create Azure Container Registry
    log_info "🏗️  Creating Azure Container Registry: $REGISTRY_NAME"
    if ! az acr show --name "$REGISTRY_NAME" &>/dev/null; then
        az acr create --resource-group "$RESOURCE_GROUP" \
          --name "$REGISTRY_NAME" \
          --sku Basic \
          --location "$LOCATION"
        log_success "Container registry created"
    else
        log_success "Container registry already exists"
    fi
    
    # Step 4: Enable admin access to registry
    log_info "🔐 Enabling admin access to registry..."
    az acr update -n "$REGISTRY_NAME" --admin-enabled true
    log_success "Admin access enabled"
    
    # Step 5: Get registry credentials
    log_info "📋 Getting registry credentials..."
    ACR_SERVER=$(az acr show --name "$REGISTRY_NAME" --query loginServer --output tsv)
    ACR_USERNAME=$(az acr credential show --name "$REGISTRY_NAME" --query username --output tsv)
    ACR_PASSWORD=$(az acr credential show --name "$REGISTRY_NAME" --query passwords[0].value --output tsv)
    
    log_info "Registry Server: $ACR_SERVER"
    log_info "Registry Username: $ACR_USERNAME"
    
    # Step 6: Build Docker image if it doesn't exist
    log_info "🐳 Checking Docker image..."
    if ! docker image inspect "$IMAGE_NAME" &>/dev/null; then
        log_info "Building Docker image..."
        cd "${SCRIPT_DIR}/../../"
        docker build -t "$IMAGE_NAME" .
        log_success "Docker image built"
    else
        log_success "Docker image already exists"
    fi
    
    # Step 7: Login to Docker registry
    log_info "🔑 Logging into Docker registry..."
    echo "$ACR_PASSWORD" | docker login "$ACR_SERVER" --username "$ACR_USERNAME" --password-stdin
    log_success "Docker registry login successful"
    
    # Step 8: Tag and push image
    log_info "📦 Tagging and pushing Docker image..."
    docker tag "$IMAGE_NAME" "$ACR_SERVER/$IMAGE_NAME:latest"
    docker push "$ACR_SERVER/$IMAGE_NAME:latest"
    log_success "Docker image pushed"
    
    # Step 9: Create Container Instance
    log_info "🚀 Creating Container Instance: $CONTAINER_NAME"
    
    # Delete existing container if it exists
    if az container show --resource-group "$RESOURCE_GROUP" --name "$CONTAINER_NAME" &>/dev/null; then
        log_warning "Existing container found. Deleting..."
        az container delete --resource-group "$RESOURCE_GROUP" --name "$CONTAINER_NAME" --yes
        log_success "Existing container deleted"
    fi
    
    az container create \
      --resource-group "$RESOURCE_GROUP" \
      --name "$CONTAINER_NAME" \
      --image "$ACR_SERVER/$IMAGE_NAME:latest" \
      --registry-login-server "$ACR_SERVER" \
      --registry-username "$ACR_USERNAME" \
      --registry-password "$ACR_PASSWORD" \
      --dns-name-label "$DNS_NAME_LABEL" \
      --ports 3000 \
      --cpu "$CPU_CORES" \
      --memory "$MEMORY_GB" \
      --environment-variables \
        NODE_ENV=production \
        PORT=3000 \
        APTOS_NETWORK="$APTOS_NETWORK" \
        RELAYER_PRIVATE_KEY="$RELAYER_PRIVATE_KEY" \
        CONTRACT_ADDRESS="$CONTRACT_ADDRESS" \
        APTOS_RPC_URL="$APTOS_RPC_URL" \
        TREASURY_ADDRESS="$TREASURY_ADDRESS" \
        REDIS_URL="$REDIS_URL" \
        DATABASE_URL="$DATABASE_URL" \
        PYTH_HERMES_URL="$PYTH_HERMES_URL" \
        FEE_MARKUP_PERCENTAGE="$FEE_MARKUP_PERCENTAGE" \
        MIN_APT_BALANCE="$MIN_APT_BALANCE" \
        MAX_TRANSACTION_AMOUNT="$MAX_TRANSACTION_AMOUNT" \
        LOG_LEVEL="$LOG_LEVEL" \
        RATE_LIMIT_WINDOW_MS="$RATE_LIMIT_WINDOW_MS" \
        RATE_LIMIT_MAX_REQUESTS="$RATE_LIMIT_MAX_REQUESTS" \
        PRICE_CACHE_TTL="$PRICE_CACHE_TTL" \
        GAS_ESTIMATE_BUFFER="$GAS_ESTIMATE_BUFFER"
    
    log_success "Container instance created"
    
    # Step 10: Get container details
    log_info "📊 Getting container details..."
    FQDN=$(az container show --resource-group "$RESOURCE_GROUP" --name "$CONTAINER_NAME" --query ipAddress.fqdn --output tsv)
    
    log_success "🎉 Deployment complete!"
    log_info "🌐 Your backend is available at: http://$FQDN:3000"
    log_info "🔍 Health check: http://$FQDN:3000/api/v1/relayer/health"
    
    # Test the deployment
    log_info "🧪 Testing deployment..."
    sleep 30  # Wait for container to start
    
    if curl -s "http://$FQDN:3000/api/v1/relayer/health" | grep -q "healthy"; then
        log_success "✅ Health check passed! Deployment is working correctly."
    else
        log_warning "⚠️  Health check failed. Please check container logs:"
        log_info "az container logs --resource-group $RESOURCE_GROUP --name $CONTAINER_NAME"
    fi
}

# Script execution
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    deploy_to_azure "$@"
fi
