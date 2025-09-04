#!/bin/bash

# SmoothSend Deployment Guide
# Interactive guide for deploying SmoothSend to various platforms

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Logging functions
print_header() {
    echo -e "\n${BOLD}${BLUE}$1${NC}"
    echo -e "${BLUE}$(printf '=%.0s' $(seq 1 ${#1}))${NC}"
}

print_section() {
    echo -e "\n${BOLD}${CYAN}$1${NC}"
    echo -e "${CYAN}$(printf '-%.0s' $(seq 1 ${#1}))${NC}"
}

print_step() {
    echo -e "${GREEN}$1${NC}"
}

print_command() {
    echo -e "${YELLOW}$1${NC}"
}

print_note() {
    echo -e "${BLUE}💡 Note: $1${NC}"
}

print_warning() {
    echo -e "${RED}⚠️  Warning: $1${NC}"
}

# Main guide function
show_deployment_guide() {
    clear
    print_header "🚀 SmoothSend Deployment Guide"
    
    echo -e "\nWelcome to the SmoothSend deployment guide!"
    echo -e "This guide will help you deploy SmoothSend to your preferred platform.\n"
    
    # Platform selection
    echo -e "${BOLD}Available deployment options:${NC}"
    echo -e "1. ${GREEN}Azure Container Instances${NC} (Recommended for production)"
    echo -e "2. ${GREEN}Azure App Service${NC} (Alternative Azure option)"
    echo -e "3. ${GREEN}Local Development${NC} (For testing)"
    echo -e "4. ${GREEN}Docker Compose${NC} (Local with dependencies)"
    echo -e "5. ${GREEN}Frontend Deployment${NC} (Vercel)"
    echo -e "0. Exit\n"
    
    read -p "Select deployment option (0-5): " choice
    
    case $choice in
        1) show_azure_container_guide ;;
        2) show_azure_app_service_guide ;;
        3) show_local_development_guide ;;
        4) show_docker_compose_guide ;;
        5) show_frontend_guide ;;
        0) echo "Goodbye! 👋"; exit 0 ;;
        *) echo "Invalid option. Please try again."; show_deployment_guide ;;
    esac
}

# Azure Container Instances guide
show_azure_container_guide() {
    print_header "📦 Azure Container Instances Deployment"
    
    print_section "📋 Prerequisites"
    print_step "1. Azure CLI installed and configured"
    print_step "2. Docker installed and running"
    print_step "3. Environment variables configured"
    print_step "4. Azure subscription with sufficient credits"
    
    print_section "🔧 Setup Steps"
    print_step "1. Configure your environment:"
    print_command "   cp deployment/configs/azure.conf.example deployment/configs/azure.conf"
    print_command "   # Edit azure.conf with your settings"
    
    print_step "2. Set required environment variables:"
    print_command "   export RELAYER_PRIVATE_KEY=\"your_private_key\""
    print_command "   export CONTRACT_ADDRESS=\"your_contract_address\""
    print_command "   export DATABASE_URL=\"your_database_url\""
    print_command "   export REDIS_URL=\"your_redis_url\""
    
    print_step "3. Run the deployment script:"
    print_command "   ./deployment/scripts/azure.sh"
    
    print_section "🧪 Testing"
    print_step "After deployment, test your endpoint:"
    print_command "   curl https://your-app.azurecontainer.io:3000/api/v1/relayer/health"
    
    print_note "This method provides automatic scaling and container management"
    print_warning "Make sure your Azure subscription has sufficient resources"
    
    ask_continue_or_menu
}

# Azure App Service guide
show_azure_app_service_guide() {
    print_header "🌐 Azure App Service Deployment"
    
    print_section "📋 Prerequisites"
    print_step "1. Azure account with active subscription"
    print_step "2. Git repository with your code"
    print_step "3. Azure Database for PostgreSQL"
    print_step "4. Azure Cache for Redis"
    
    print_section "🔧 Manual Setup Steps"
    print_step "1. Create Azure App Service:"
    echo -e "   • Go to Azure Portal"
    echo -e "   • Create new App Service"
    echo -e "   • Runtime: Node.js 18 LTS"
    echo -e "   • Region: Choose closest to your users"
    
    print_step "2. Configure Environment Variables:"
    echo -e "   • Go to App Service → Configuration → Application Settings"
    echo -e "   • Add all variables from azure-env-template.txt"
    
    print_step "3. Set up Dependencies:"
    echo -e "   • Create Azure Database for PostgreSQL flexible server"
    echo -e "   • Create Azure Cache for Redis"
    echo -e "   • Update connection strings in app settings"
    
    print_step "4. Deploy using Git:"
    print_command "   git remote add azure https://\$username@your-app.scm.azurewebsites.net:443/your-app.git"
    print_command "   git push azure main"
    
    print_section "🧪 Verification"
    print_step "Test your deployment:"
    print_command "   curl https://your-app.azurewebsites.net/api/v1/relayer/health"
    
    print_note "App Service provides easy CI/CD integration"
    print_warning "Requires separate setup of PostgreSQL and Redis"
    
    ask_continue_or_menu
}

# Local development guide
show_local_development_guide() {
    print_header "💻 Local Development Setup"
    
    print_section "📋 Prerequisites"
    print_step "1. Node.js 18+ installed"
    print_step "2. PostgreSQL running locally"
    print_step "3. Redis running locally"
    print_step "4. Environment variables configured"
    
    print_section "🔧 Setup Steps"
    print_step "1. Install dependencies:"
    print_command "   npm install"
    
    print_step "2. Setup environment:"
    print_command "   cp .env.example .env"
    print_command "   # Edit .env with your local configuration"
    
    print_step "3. Setup database:"
    print_command "   npm run db:migrate"
    print_command "   npm run db:seed  # Optional test data"
    
    print_step "4. Start the development server:"
    print_command "   npm run dev"
    
    print_section "🧪 Testing"
    print_step "Server will be available at:"
    print_command "   http://localhost:3000"
    
    print_step "Test the API:"
    print_command "   curl http://localhost:3000/api/v1/relayer/health"
    
    print_note "Perfect for development and testing"
    print_warning "Not suitable for production use"
    
    ask_continue_or_menu
}

# Docker Compose guide
show_docker_compose_guide() {
    print_header "🐳 Docker Compose Deployment"
    
    print_section "📋 Prerequisites"
    print_step "1. Docker and Docker Compose installed"
    print_step "2. Environment variables configured"
    
    print_section "🔧 Setup Steps"
    print_step "1. Configure environment:"
    print_command "   cp .env.example .env"
    print_command "   # Edit .env with your configuration"
    
    print_step "2. Start all services:"
    print_command "   docker-compose up -d"
    
    print_step "3. Check service status:"
    print_command "   docker-compose ps"
    
    print_step "4. View logs:"
    print_command "   docker-compose logs -f smoothsend-backend"
    
    print_section "🧪 Testing"
    print_step "Services will be available at:"
    echo -e "   • Backend: http://localhost:3000"
    echo -e "   • PostgreSQL: localhost:5432"
    echo -e "   • Redis: localhost:6379"
    
    print_step "Stop services:"
    print_command "   docker-compose down"
    
    print_note "Includes all dependencies (PostgreSQL, Redis)"
    print_note "Great for local testing with production-like environment"
    
    ask_continue_or_menu
}

# Frontend deployment guide
show_frontend_guide() {
    print_header "🌐 Frontend Deployment (Vercel)"
    
    print_section "📋 Prerequisites"
    print_step "1. Vercel account"
    print_step "2. Backend deployed and accessible"
    print_step "3. Environment variables ready"
    
    print_section "🔧 Setup Steps"
    print_step "1. Install Vercel CLI:"
    print_command "   npm i -g vercel"
    
    print_step "2. Navigate to frontend directory:"
    print_command "   cd smoothsendfrontend"
    
    print_step "3. Deploy to Vercel:"
    print_command "   vercel --prod"
    
    print_step "4. Configure Environment Variables:"
    echo -e "   • Go to Vercel Dashboard → Project → Settings → Environment Variables"
    echo -e "   • Add variables from vercel-env-template.txt"
    echo -e "   • Update NEXT_PUBLIC_API_URL with your backend URL"
    
    print_section "🧪 Verification"
    print_step "1. Test frontend: https://your-frontend.vercel.app"
    print_step "2. Test full flow: Transfer USDC through the UI"
    print_step "3. Check browser console for any errors"
    
    print_section "🔒 Security Checklist"
    echo -e "   ✅ CORS configured in backend for Vercel domain"
    echo -e "   ✅ Environment variables set in Vercel (not in code)"
    echo -e "   ✅ API endpoints working correctly"
    echo -e "   ✅ Wallet connections functioning"
    
    print_note "Vercel provides automatic deployments from Git"
    print_warning "Make sure backend CORS allows your Vercel domain"
    
    ask_continue_or_menu
}

# Helper function to ask user to continue or return to menu
ask_continue_or_menu() {
    echo -e "\n${BOLD}What would you like to do next?${NC}"
    echo -e "1. Return to main menu"
    echo -e "2. Exit"
    
    read -p "Select option (1-2): " next_choice
    
    case $next_choice in
        1) show_deployment_guide ;;
        2) echo "Happy deploying! 🚀"; exit 0 ;;
        *) echo "Invalid option."; ask_continue_or_menu ;;
    esac
}

# Script execution
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    show_deployment_guide "$@"
fi
