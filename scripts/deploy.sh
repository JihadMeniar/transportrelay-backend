#!/bin/bash
# ===========================================
# TaxiRelay Backend Deployment Script
# ===========================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}   TaxiRelay Backend Deployment${NC}"
echo -e "${GREEN}============================================${NC}"

# Check if .env.production exists
if [ ! -f ".env.production" ]; then
    echo -e "${RED}Error: .env.production file not found!${NC}"
    echo "Please create it from .env.production.example"
    exit 1
fi

# Load environment variables
source .env.production

# Validate required variables
required_vars=("DATABASE_PASSWORD" "JWT_SECRET" "JWT_REFRESH_SECRET")
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ] || [[ "${!var}" == *"CHANGE_THIS"* ]]; then
        echo -e "${RED}Error: $var is not properly configured in .env.production${NC}"
        exit 1
    fi
done

echo -e "${YELLOW}Step 1: Pulling latest changes...${NC}"
git pull origin main || true

echo -e "${YELLOW}Step 2: Building Docker images...${NC}"
docker-compose -f docker/docker-compose.prod.yml build --no-cache

echo -e "${YELLOW}Step 3: Stopping existing containers...${NC}"
docker-compose -f docker/docker-compose.prod.yml down

echo -e "${YELLOW}Step 4: Starting services...${NC}"
docker-compose -f docker/docker-compose.prod.yml up -d

echo -e "${YELLOW}Step 5: Waiting for services to be healthy...${NC}"
sleep 10

# Check health
if curl -s http://localhost:3000/health | grep -q "ok"; then
    echo -e "${GREEN}============================================${NC}"
    echo -e "${GREEN}   Deployment successful!${NC}"
    echo -e "${GREEN}============================================${NC}"
    echo ""
    echo "API is running at: http://localhost:3000"
    echo "Health check: http://localhost:3000/health"
    echo "API Docs: http://localhost:3000/api-docs"
else
    echo -e "${RED}Deployment failed - health check not passing${NC}"
    docker-compose -f docker/docker-compose.prod.yml logs backend
    exit 1
fi
