#!/bin/bash

# Production Deployment Script for AuctionDraft.io
# This script automates the deployment process

set -e  # Exit on any error

echo "🚀 Starting production deployment for AuctionDraft.io..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required tools are installed
check_dependencies() {
    print_status "Checking dependencies..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed"
        exit 1
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed"
        exit 1
    fi
    
    # Check Vercel CLI
    if ! command -v vercel &> /dev/null; then
        print_warning "Vercel CLI not found. Installing..."
        npm install -g vercel
    fi
    
    # Check PartyKit CLI
    if ! command -v partykit &> /dev/null; then
        print_warning "PartyKit CLI not found. Installing..."
        npm install -g partykit
    fi
    
    print_success "All dependencies are available"
}

# Install dependencies
install_dependencies() {
    print_status "Installing npm dependencies..."
    npm ci --production=false
    print_success "Dependencies installed"
}

# Run database migrations
run_migrations() {
    print_status "Running database migrations..."
    
    # Check if database URL is set
    if [ -z "$POSTGRES_URL_NON_POOLING" ]; then
        print_error "POSTGRES_URL_NON_POOLING environment variable is not set"
        exit 1
    fi
    
    # Generate migrations if needed
    npm run db:generate
    
    # Push schema to database
    npm run db:push
    
    print_success "Database migrations completed"
}

# Deploy PartyKit
deploy_partykit() {
    print_status "Deploying PartyKit..."
    
    # Check if PartyKit is logged in
    if ! partykit whoami &> /dev/null; then
        print_warning "PartyKit not logged in. Please run: partykit login"
        read -p "Press Enter after logging in to continue..."
    fi
    
    # Deploy PartyKit
    partykit deploy
    
    print_success "PartyKit deployed successfully"
}

# Build the application
build_app() {
    print_status "Building the application..."
    npm run build
    print_success "Application built successfully"
}

# Deploy to Vercel
deploy_vercel() {
    print_status "Deploying to Vercel..."
    
    # Check if Vercel is logged in
    if ! vercel whoami &> /dev/null; then
        print_warning "Vercel not logged in. Please run: vercel login"
        read -p "Press Enter after logging in to continue..."
    fi
    
    # Deploy to production
    vercel --prod --yes
    
    print_success "Application deployed to Vercel successfully"
}

# Verify deployment
verify_deployment() {
    print_status "Verifying deployment..."
    
    # Get the deployment URL
    DEPLOYMENT_URL=$(vercel ls --prod | grep auctiondraftio | head -1 | awk '{print $2}')
    
    if [ -z "$DEPLOYMENT_URL" ]; then
        print_warning "Could not determine deployment URL"
        return
    fi
    
    print_status "Deployment URL: $DEPLOYMENT_URL"
    
    # Test the deployment
    if curl -f -s "$DEPLOYMENT_URL" > /dev/null; then
        print_success "Deployment verification successful"
    else
        print_warning "Deployment verification failed - site may still be building"
    fi
}

# Main deployment function
main() {
    echo "=========================================="
    echo "  AuctionDraft.io Production Deployment"
    echo "=========================================="
    
    # Check dependencies
    check_dependencies
    
    # Install dependencies
    install_dependencies
    
    # Run database migrations
    run_migrations
    
    # Deploy PartyKit
    deploy_partykit
    
    # Build the application
    build_app
    
    # Deploy to Vercel
    deploy_vercel
    
    # Verify deployment
    verify_deployment
    
    echo ""
    echo "=========================================="
    print_success "Deployment completed successfully!"
    echo "=========================================="
    echo ""
    echo "Next steps:"
echo "1. Configure environment variables in Vercel dashboard"
echo "2. Set up Stripe production account and webhooks (see STRIPE_SETUP.md)"
echo "3. Set up custom domain (if needed)"
echo "4. Configure webhooks for Stripe and Clerk"
echo "5. Test all functionality in production"
echo "6. Set up monitoring and analytics"
}

# Run the main function
main "$@" 