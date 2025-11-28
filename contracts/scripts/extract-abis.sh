#!/bin/bash

# Extract contract ABIs and copy to frontend

set -e

echo "Extracting contract ABIs..."

# Create directory if it doesn't exist
mkdir -p ../frontend/lib/contracts/abis

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    echo "Error: jq is not installed"
    echo "Install with: brew install jq"
    exit 1
fi

# Extract ABIs
echo "Extracting BatchRegistry ABI..."
cat out/BatchRegistry.sol/BatchRegistry.json | jq '.abi' > ../frontend/lib/contracts/abis/BatchRegistry.json

echo "Extracting AuctionManager ABI..."
cat out/AuctionManager.sol/AuctionManager.json | jq '.abi' > ../frontend/lib/contracts/abis/AuctionManager.json

echo "Extracting EscrowManager ABI..."
cat out/EscrowManager.sol/EscrowManager.json | jq '.abi' > ../frontend/lib/contracts/abis/EscrowManager.json

echo "Extracting ReputationSystem ABI..."
cat out/ReputationSystem.sol/ReputationSystem.json | jq '.abi' > ../frontend/lib/contracts/abis/ReputationSystem.json

echo "Extracting MockStablecoin ABI..."
cat out/MockStablecoin.sol/MockStablecoin.json | jq '.abi' > ../frontend/lib/contracts/abis/MockStablecoin.json

echo ""
echo "✓ ABIs extracted successfully to frontend/lib/contracts/abis/"
echo ""
echo "Files created:"
echo "  - BatchRegistry.json"
echo "  - AuctionManager.json"
echo "  - EscrowManager.json"
echo "  - ReputationSystem.json"
echo "  - MockStablecoin.json"
echo ""
