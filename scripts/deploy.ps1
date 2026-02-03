# ===========================================
# TaxiRelay Backend Deployment Script (Windows)
# ===========================================

$ErrorActionPreference = "Stop"

Write-Host "============================================" -ForegroundColor Green
Write-Host "   TaxiRelay Backend Deployment" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green

# Check if .env.production exists
if (-not (Test-Path ".env.production")) {
    Write-Host "Error: .env.production file not found!" -ForegroundColor Red
    Write-Host "Please create it from .env.production.example"
    exit 1
}

# Read and validate environment variables
$envContent = Get-Content ".env.production" | Where-Object { $_ -match "=" -and $_ -notmatch "^#" }
$envVars = @{}
foreach ($line in $envContent) {
    $parts = $line -split "=", 2
    if ($parts.Count -eq 2) {
        $envVars[$parts[0].Trim()] = $parts[1].Trim()
    }
}

# Validate required variables
$requiredVars = @("DATABASE_PASSWORD", "JWT_SECRET", "JWT_REFRESH_SECRET")
foreach ($var in $requiredVars) {
    if (-not $envVars[$var] -or $envVars[$var] -match "CHANGE_THIS") {
        Write-Host "Error: $var is not properly configured in .env.production" -ForegroundColor Red
        exit 1
    }
}

Write-Host "Step 1: Building Docker images..." -ForegroundColor Yellow
docker-compose -f docker/docker-compose.prod.yml build --no-cache

Write-Host "Step 2: Stopping existing containers..." -ForegroundColor Yellow
docker-compose -f docker/docker-compose.prod.yml down

Write-Host "Step 3: Starting services..." -ForegroundColor Yellow
docker-compose -f docker/docker-compose.prod.yml up -d

Write-Host "Step 4: Waiting for services to be healthy..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

# Check health
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/health" -Method Get
    if ($response.status -eq "ok") {
        Write-Host "============================================" -ForegroundColor Green
        Write-Host "   Deployment successful!" -ForegroundColor Green
        Write-Host "============================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "API is running at: http://localhost:3000"
        Write-Host "Health check: http://localhost:3000/health"
        Write-Host "API Docs: http://localhost:3000/api-docs"
    }
} catch {
    Write-Host "Deployment failed - health check not passing" -ForegroundColor Red
    docker-compose -f docker/docker-compose.prod.yml logs backend
    exit 1
}
