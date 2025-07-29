# Production Deployment Script for AuctionDraft.io (Windows PowerShell)
# This script automates the deployment process for Windows users

param(
    [switch]$SkipPartyKit,
    [switch]$SkipVercel,
    [switch]$SkipMigrations
)

# Set error action preference
$ErrorActionPreference = "Stop"

Write-Host "🚀 Starting production deployment for AuctionDraft.io..." -ForegroundColor Green

# Function to print colored output
function Write-Status {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

# Check if required tools are installed
function Test-Dependencies {
    Write-Status "Checking dependencies..."
    
    # Check Node.js
    try {
        $nodeVersion = node --version
        Write-Success "Node.js found: $nodeVersion"
    }
    catch {
        Write-Error "Node.js is not installed"
        exit 1
    }
    
    # Check npm
    try {
        $npmVersion = npm --version
        Write-Success "npm found: $npmVersion"
    }
    catch {
        Write-Error "npm is not installed"
        exit 1
    }
    
    # Check Vercel CLI
    try {
        $vercelVersion = vercel --version
        Write-Success "Vercel CLI found: $vercelVersion"
    }
    catch {
        Write-Warning "Vercel CLI not found. Installing..."
        npm install -g vercel
    }
    
    # Check PartyKit CLI
    try {
        $partykitVersion = partykit --version
        Write-Success "PartyKit CLI found: $partykitVersion"
    }
    catch {
        Write-Warning "PartyKit CLI not found. Installing..."
        npm install -g partykit
    }
    
    Write-Success "All dependencies are available"
}

# Install dependencies
function Install-Dependencies {
    Write-Status "Installing npm dependencies..."
    npm ci --production=false
    Write-Success "Dependencies installed"
}

# Run database migrations
function Run-Migrations {
    if ($SkipMigrations) {
        Write-Warning "Skipping database migrations"
        return
    }
    
    Write-Status "Running database migrations..."
    
    # Check if database URL is set
    if (-not $env:POSTGRES_URL_NON_POOLING) {
        Write-Error "POSTGRES_URL_NON_POOLING environment variable is not set"
        exit 1
    }
    
    # Generate migrations if needed
    npm run db:generate
    
    # Push schema to database
    npm run db:push
    
    Write-Success "Database migrations completed"
}

# Deploy PartyKit
function Deploy-PartyKit {
    if ($SkipPartyKit) {
        Write-Warning "Skipping PartyKit deployment"
        return
    }
    
    Write-Status "Deploying PartyKit..."
    
    # Check if PartyKit is logged in
    try {
        partykit whoami | Out-Null
    }
    catch {
        Write-Warning "PartyKit not logged in. Please run: partykit login"
        Read-Host "Press Enter after logging in to continue"
    }
    
    # Deploy PartyKit
    partykit deploy
    
    Write-Success "PartyKit deployed successfully"
}

# Build the application
function Build-App {
    Write-Status "Building the application..."
    npm run build
    Write-Success "Application built successfully"
}

# Deploy to Vercel
function Deploy-Vercel {
    if ($SkipVercel) {
        Write-Warning "Skipping Vercel deployment"
        return
    }
    
    Write-Status "Deploying to Vercel..."
    
    # Check if Vercel is logged in
    try {
        vercel whoami | Out-Null
    }
    catch {
        Write-Warning "Vercel not logged in. Please run: vercel login"
        Read-Host "Press Enter after logging in to continue"
    }
    
    # Deploy to production
    vercel --prod --yes
    
    Write-Success "Application deployed to Vercel successfully"
}

# Verify deployment
function Verify-Deployment {
    Write-Status "Verifying deployment..."
    
    # Get the deployment URL
    try {
        $deploymentInfo = vercel ls --prod | Select-String "auctiondraftio" | Select-Object -First 1
        if ($deploymentInfo) {
            $deploymentUrl = ($deploymentInfo -split '\s+')[1]
            Write-Status "Deployment URL: $deploymentUrl"
            
            # Test the deployment
            try {
                $response = Invoke-WebRequest -Uri $deploymentUrl -UseBasicParsing -TimeoutSec 10
                if ($response.StatusCode -eq 200) {
                    Write-Success "Deployment verification successful"
                }
            }
            catch {
                Write-Warning "Deployment verification failed - site may still be building"
            }
        }
        else {
            Write-Warning "Could not determine deployment URL"
        }
    }
    catch {
        Write-Warning "Could not verify deployment"
    }
}

# Main deployment function
function Main {
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host "  AuctionDraft.io Production Deployment" -ForegroundColor Cyan
    Write-Host "==========================================" -ForegroundColor Cyan
    
    # Check dependencies
    Test-Dependencies
    
    # Install dependencies
    Install-Dependencies
    
    # Run database migrations
    Run-Migrations
    
    # Deploy PartyKit
    Deploy-PartyKit
    
    # Build the application
    Build-App
    
    # Deploy to Vercel
    Deploy-Vercel
    
    # Verify deployment
    Verify-Deployment
    
    Write-Host ""
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Success "Deployment completed successfully!"
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "1. Configure environment variables in Vercel dashboard" -ForegroundColor White
    Write-Host "2. Set up Stripe production account and webhooks (see STRIPE_SETUP.md)" -ForegroundColor White
    Write-Host "3. Set up custom domain (if needed)" -ForegroundColor White
    Write-Host "4. Configure webhooks for Stripe and Clerk" -ForegroundColor White
    Write-Host "5. Test all functionality in production" -ForegroundColor White
    Write-Host "6. Set up monitoring and analytics" -ForegroundColor White
}

# Run the main function
Main 