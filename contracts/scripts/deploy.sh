#!/bin/bash

# Agro Data Streams - Contract Deployment Script
# This script deploys all contracts to Somnia Testnet

set -e  # Exit on error

echo "========================================="
echo "  Agro Data Streams - Contract Deployment"
echo "========================================="
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${RED}Error: .env file not found!${NC}"
    echo "Please create .env file from .env.example"
    echo ""
    echo "Steps:"
    echo "  1. cp .env.example .env"
    echo "  2. Edit .env with your PRIVATE_KEY and FEE_COLLECTOR"
    echo "  3. Get testnet tokens from: https://testnet.somnia.network/"
    exit 1
fi

# Load environment variables
source .env

# Check if PRIVATE_KEY is set
if [ -z "$PRIVATE_KEY" ] || [ "$PRIVATE_KEY" = "0x..." ]; then
    echo -e "${RED}Error: PRIVATE_KEY not set in .env file${NC}"
    echo "Please set your deployment wallet private key in .env"
    exit 1
fi

# Check if FEE_COLLECTOR is set
if [ -z "$FEE_COLLECTOR" ] || [ "$FEE_COLLECTOR" = "0x..." ]; then
    echo -e "${RED}Error: FEE_COLLECTOR not set in .env file${NC}"
    echo "Please set the fee collector address in .env"
    exit 1
fi

# Derive deployer address
DEPLOYER=$(cast wallet address --private-key $PRIVATE_KEY)
echo -e "${GREEN}Deployer Address:${NC} $DEPLOYER"
echo -e "${GREEN}Fee Collector:${NC} $FEE_COLLECTOR"
echo ""

# Check balance on Somnia Testnet
echo "Checking balance on Somnia Testnet..."
BALANCE=$(cast balance $DEPLOYER --rpc-url https://dream-rpc.somnia.network/)
BALANCE_ETH=$(cast to-unit $BALANCE ether)
echo -e "${GREEN}Balance:${NC} $BALANCE_ETH STT"
echo ""

# Check if balance is sufficient (at least 0.1 STT)
if (( $(echo "$BALANCE_ETH < 0.1" | bc -l) )); then
    echo -e "${YELLOW}Warning: Low balance! You may need more STT tokens.${NC}"
    echo "Get testnet tokens from: https://testnet.somnia.network/"
    echo ""
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Compile contracts
echo "Compiling contracts..."
forge build
if [ $? -ne 0 ]; then
    echo -e "${RED}Compilation failed!${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Compilation successful${NC}"
echo ""

# Run tests
echo "Running tests..."
forge test
if [ $? -ne 0 ]; then
    echo -e "${RED}Tests failed!${NC}"
    exit 1
fi
echo -e "${GREEN}✓ All tests passed${NC}"
echo ""

# Deploy contracts
echo "Deploying contracts to Somnia Testnet..."
echo "This may take a few minutes..."
echo ""

forge script script/Deploy.s.sol:DeployAgroDataStreams \
  --rpc-url https://dream-rpc.somnia.network/ \
  --broadcast \
  --legacy \
  -vvvv

if [ $? -ne 0 ]; then
    echo -e "${RED}Deployment failed!${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}  Deployment Successful!${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""
echo "Next steps:"
echo "  1. Save the contract addresses displayed above"
echo "  2. Update frontend/.env.local with the addresses"
echo "  3. Extract ABIs: ./scripts/extract-abis.sh"
echo "  4. Verify contracts on block explorer"
echo ""
echo "Block Explorer: https://shannon-explorer.somnia.network/"
echo ""
