#!/bin/bash

# SmoothSend Main Deployment Script
# Unified deployment script that can handle different deployment targets

set -e

# Script directory and paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOYMENT_DIR="$(dirname "$SCRIPT_DIR")"
PROJECT_ROOT="$(dirname "$DEPLOYMENT_DIR")"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
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

log_header() {
    echo -e "\n${BOLD}${BLUE}🚀 $1${NC}"
    echo -e "${BLUE}$(printf '=%.0s' $(seq 1 $((${#1} + 4))))${NC}"
}

# Help function
show_help() {
    echo -e "${BOLD}SmoothSend Deployment Script${NC}"
    echo -e "\nUsage: $0 [COMMAND] [OPTIONS]"
    echo -e "\n${BOLD}Commands:${NC}"
    echo -e "  ${GREEN}azure${NC}       Deploy to Azure Container Instances"
    echo -e "  ${GREEN}local${NC}       Setup local development environment"
    echo -e "  ${GREEN}docker${NC}      Deploy using Docker Compose"
    echo -e "  ${GREEN}guide${NC}       Show interactive deployment guide"
    echo -e "  ${GREEN}validate${NC}    Validate environment configuration"
    echo -e "  ${GREEN}clean${NC}       Clean up deployment artifacts"
    echo -e "  ${GREEN}help${NC}        Show this help message"
    echo -e "\n${BOLD}Options:${NC}"
    echo -e "  ${CYAN}--env FILE${NC}      Load environment from specific file"
    echo -e "  ${CYAN}--config FILE${NC}   Use specific configuration file"
    echo -e "  ${CYAN}--dry-run${NC}       Show what would be done without executing"
    echo -e "  ${CYAN}--verbose${NC}       Enable verbose output"
    echo -e "  ${CYAN}--force${NC}         Force deployment without confirmation"
    echo -e "\n${BOLD}Examples:${NC}"
    echo -e "  $0 azure --config configs/production.conf"
    echo -e "  $0 local --env .env.local"
    echo -e "  $0 docker --dry-run"
    echo -e "  $0 guide"
}

# Validation function
validate_environment() {
    log_info "Validating environment..."
    
    # Check if required files exist
    local required_files=(
        "$PROJECT_ROOT/package.json"
        "$PROJECT_ROOT/Dockerfile"
        "$PROJECT_ROOT/docker-compose.yml"
    )
    
    for file in "${required_files[@]}"; do
        if [[ ! -f "$file" ]]; then
            log_error "Required file not found: $file"
            return 1
        fi
    done
    
    # Check Node.js version if deploying locally
    if [[ "$1" == "local" ]]; then
        if ! command -v node &> /dev/null; then
            log_error "Node.js is required for local deployment"
            return 1
        fi
        
        local node_version=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
        if [[ $node_version -lt 18 ]]; then
            log_error "Node.js 18+ is required (current: $(node --version))"
            return 1
        fi
    fi
    
    # Check Docker if deploying with containers
    if [[ "$1" == "docker" || "$1" == "azure" ]]; then
        if ! command -v docker &> /dev/null; then
            log_error "Docker is required for container deployment"
            return 1
        fi
        
        if ! docker info &> /dev/null; then
            log_error "Docker daemon is not running"
            return 1
        fi
    fi
    
    # Check Azure CLI for Azure deployment
    if [[ "$1" == "azure" ]]; then
        if ! command -v az &> /dev/null; then
            log_error "Azure CLI is required for Azure deployment"
            return 1
        fi
        
        if ! az account show &> /dev/null; then
            log_error "Not logged in to Azure. Run 'az login' first"
            return 1
        fi
    fi
    
    log_success "Environment validation passed"
    return 0
}

# Load configuration
load_config() {
    local config_file="$1"
    
    if [[ -n "$config_file" && -f "$config_file" ]]; then
        log_info "Loading configuration from: $config_file"
        source "$config_file"
    else
        # Try to load default config based on deployment type
        local default_config="$DEPLOYMENT_DIR/configs/${DEPLOYMENT_TYPE}.conf"
        if [[ -f "$default_config" ]]; then
            log_info "Loading default configuration: $default_config"
            source "$default_config"
        fi
    fi
}

# Azure deployment
deploy_azure() {
    log_header "Azure Container Instances Deployment"
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "DRY RUN: Would execute Azure deployment script"
        log_info "Script: $SCRIPT_DIR/azure.sh"
        return 0
    fi
    
    if [[ ! -f "$SCRIPT_DIR/azure.sh" ]]; then
        log_error "Azure deployment script not found: $SCRIPT_DIR/azure.sh"
        return 1
    fi
    
    # Make sure the script is executable
    chmod +x "$SCRIPT_DIR/azure.sh"
    
    # Execute Azure deployment script
    "$SCRIPT_DIR/azure.sh"
}

# Local deployment
deploy_local() {
    log_header "Local Development Setup"
    
    cd "$PROJECT_ROOT"
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "DRY RUN: Would execute local setup"
        log_info "Commands that would be run:"
        echo "  npm install"
        echo "  npm run db:migrate"
        echo "  npm run dev"
        return 0
    fi
    
    log_info "Installing dependencies..."
    npm install
    
    log_info "Setting up database..."
    if command -v npm run db:migrate &> /dev/null; then
        npm run db:migrate
    else
        log_warning "Database migration script not found, skipping..."
    fi
    
    log_success "Local setup complete!"
    log_info "Start the development server with: npm run dev"
}

# Docker deployment
deploy_docker() {
    log_header "Docker Compose Deployment"
    
    cd "$PROJECT_ROOT"
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "DRY RUN: Would execute Docker Compose deployment"
        log_info "Commands that would be run:"
        echo "  docker-compose down"
        echo "  docker-compose build"
        echo "  docker-compose up -d"
        return 0
    fi
    
    log_info "Stopping existing containers..."
    docker-compose down --remove-orphans
    
    log_info "Building containers..."
    docker-compose build
    
    log_info "Starting services..."
    docker-compose up -d
    
    log_success "Docker deployment complete!"
    log_info "Check status with: docker-compose ps"
    log_info "View logs with: docker-compose logs -f"
}

# Show interactive guide
show_guide() {
    if [[ -f "$SCRIPT_DIR/guide.sh" ]]; then
        chmod +x "$SCRIPT_DIR/guide.sh"
        "$SCRIPT_DIR/guide.sh"
    else
        log_error "Deployment guide not found: $SCRIPT_DIR/guide.sh"
        return 1
    fi
}

# Clean up function
clean_deployment() {
    log_header "Cleaning Deployment Artifacts"
    
    cd "$PROJECT_ROOT"
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "DRY RUN: Would clean deployment artifacts"
        log_info "Commands that would be run:"
        echo "  docker-compose down --volumes --remove-orphans"
        echo "  docker system prune -f"
        echo "  rm -rf node_modules/.cache"
        return 0
    fi
    
    log_info "Stopping and removing Docker containers..."
    docker-compose down --volumes --remove-orphans 2>/dev/null || true
    
    log_info "Cleaning Docker system..."
    docker system prune -f
    
    log_info "Cleaning build artifacts..."
    rm -rf node_modules/.cache 2>/dev/null || true
    rm -rf dist/ 2>/dev/null || true
    
    log_success "Cleanup complete!"
}

# Parse command line arguments
parse_arguments() {
    DEPLOYMENT_TYPE=""
    CONFIG_FILE=""
    ENV_FILE=""
    DRY_RUN="false"
    VERBOSE="false"
    FORCE="false"
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            azure|local|docker|guide|validate|clean|help)
                DEPLOYMENT_TYPE="$1"
                shift
                ;;
            --config)
                CONFIG_FILE="$2"
                shift 2
                ;;
            --env)
                ENV_FILE="$2"
                shift 2
                ;;
            --dry-run)
                DRY_RUN="true"
                shift
                ;;
            --verbose)
                VERBOSE="true"
                set -x
                shift
                ;;
            --force)
                FORCE="true"
                shift
                ;;
            *)
                log_error "Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
    done
    
    if [[ -z "$DEPLOYMENT_TYPE" ]]; then
        log_error "No deployment type specified"
        show_help
        exit 1
    fi
}

# Main execution function
main() {
    parse_arguments "$@"
    
    # Load environment file if specified
    if [[ -n "$ENV_FILE" && -f "$ENV_FILE" ]]; then
        log_info "Loading environment from: $ENV_FILE"
        source "$ENV_FILE"
    fi
    
    # Load configuration
    load_config "$CONFIG_FILE"
    
    case "$DEPLOYMENT_TYPE" in
        azure)
            validate_environment "azure" && deploy_azure
            ;;
        local)
            validate_environment "local" && deploy_local
            ;;
        docker)
            validate_environment "docker" && deploy_docker
            ;;
        guide)
            show_guide
            ;;
        validate)
            log_info "Running validation for all deployment types..."
            validate_environment "local"
            validate_environment "docker"
            validate_environment "azure"
            log_success "All validations passed!"
            ;;
        clean)
            clean_deployment
            ;;
        help)
            show_help
            ;;
        *)
            log_error "Unknown deployment type: $DEPLOYMENT_TYPE"
            show_help
            exit 1
            ;;
    esac
}

# Script execution
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
