# Contract Deployment Guide - Somnia Network

## Network Information

### Somnia Testnet
- **Chain ID**: 50312
- **RPC URL**: https://dream-rpc.somnia.network/
- **Block Explorer**: https://shannon-explorer.somnia.network/
- **Alternative Explorer**: https://somnia-testnet.socialscan.io/
- **Symbol**: STT
- **Faucet**: https://testnet.somnia.network/
- **Add to Wallet**: https://testnet.somnia.network/

### Somnia Mainnet
- **Chain ID**: 5031
- **RPC URL**: https://api.infra.mainnet.somnia.network/
- **Block Explorer**: https://explorer.somnia.network/
- **Symbol**: SOMI
- **Faucet**: https://stakely.io/faucet/somnia-somi
- **Add to Wallet**: https://chainlist.org/?chain=50312&search=somnia

## Prerequisites

1. **Install Foundry** (if not already installed)
   ```bash
   curl -L https://foundry.paradigm.xyz | bash
   foundryup
   ```

2. **Get Testnet Tokens**
   - Visit: https://testnet.somnia.network/
   - Connect your wallet and request STT tokens
   - Wait for tokens to arrive (usually instant)

3. **Setup Environment Variables**
   ```bash
   cd contracts
   cp .env.example .env
   ```

4. **Edit `.env` file** with your details:
   ```bash
   # Your deployment wallet private key (KEEP SECRET!)
   PRIVATE_KEY=0x1234567890abcdef...

   # Address that will receive platform fees
   FEE_COLLECTOR=0xYourAddress...
   ```

## Deployment Steps

### Step 1: Verify Setup

```bash
cd contracts

# Check Foundry installation
forge --version

# Compile contracts
forge build

# Run tests to ensure everything works
forge test -vvv
```

All 53 tests should pass.

### Step 2: Deploy to Somnia Testnet

```bash
# Deploy all contracts
forge script script/Deploy.s.sol:DeployAgroDataStreams \
  --rpc-url somnia_testnet \
  --broadcast \
  --verify \
  -vvvv

# Alternative: Using direct RPC URL
forge script script/Deploy.s.sol:DeployAgroDataStreams \
  --rpc-url https://dream-rpc.somnia.network/ \
  --broadcast \
  -vvvv
```

### Step 3: Save Deployment Addresses

After successful deployment, you'll see output like:

```
=== Deployment Summary ===
Stablecoin: 0x1234...
BatchRegistry: 0x5678...
AuctionManager: 0x9abc...
EscrowManager: 0xdef0...
ReputationSystem: 0x1234...
Fee Collector: 0x5678...
```

**IMPORTANT**: Copy these addresses! You'll need them for:
1. Frontend configuration
2. Contract verification
3. Somnia Data Streams setup

### Step 4: Verify Contracts (Optional but Recommended)

If auto-verification fails, manually verify:

```bash
# Verify BatchRegistry
forge verify-contract \
  <BATCH_REGISTRY_ADDRESS> \
  src/BatchRegistry.sol:BatchRegistry \
  --chain-id 50312 \
  --rpc-url somnia_testnet \
  --watch

# Verify AuctionManager
forge verify-contract \
  <AUCTION_MANAGER_ADDRESS> \
  src/AuctionManager.sol:AuctionManager \
  --chain-id 50312 \
  --rpc-url somnia_testnet \
  --constructor-args $(cast abi-encode "constructor(address)" <BATCH_REGISTRY_ADDRESS>) \
  --watch

# Verify EscrowManager
forge verify-contract \
  <ESCROW_MANAGER_ADDRESS> \
  src/EscrowManager.sol:EscrowManager \
  --chain-id 50312 \
  --rpc-url somnia_testnet \
  --constructor-args $(cast abi-encode "constructor(address,address,address)" <STABLECOIN_ADDRESS> <AUCTION_MANAGER_ADDRESS> <FEE_COLLECTOR_ADDRESS>) \
  --watch

# Verify ReputationSystem
forge verify-contract \
  <REPUTATION_SYSTEM_ADDRESS> \
  src/ReputationSystem.sol:ReputationSystem \
  --chain-id 50312 \
  --rpc-url somnia_testnet \
  --constructor-args $(cast abi-encode "constructor(address)" <AUCTION_MANAGER_ADDRESS>) \
  --watch
```

### Step 5: Update Frontend Configuration

Copy contract addresses to frontend:

```bash
cd ../frontend
cp .env.example .env.local
```

Edit `.env.local`:
```env
# Contract addresses from deployment
NEXT_PUBLIC_BATCH_REGISTRY_ADDRESS=0x...
NEXT_PUBLIC_AUCTION_MANAGER_ADDRESS=0x...
NEXT_PUBLIC_ESCROW_MANAGER_ADDRESS=0x...
NEXT_PUBLIC_REPUTATION_SYSTEM_ADDRESS=0x...
NEXT_PUBLIC_STABLECOIN_ADDRESS=0x...

# Network config
NEXT_PUBLIC_SOMNIA_RPC_URL=https://dream-rpc.somnia.network
NEXT_PUBLIC_CHAIN_ID=50312
```

### Step 6: Extract Contract ABIs

```bash
cd contracts

# Copy ABIs to frontend
mkdir -p ../frontend/lib/contracts/abis

# Extract ABIs
cat out/BatchRegistry.sol/BatchRegistry.json | jq '.abi' > ../frontend/lib/contracts/abis/BatchRegistry.json
cat out/AuctionManager.sol/AuctionManager.json | jq '.abi' > ../frontend/lib/contracts/abis/AuctionManager.json
cat out/EscrowManager.sol/EscrowManager.json | jq '.abi' > ../frontend/lib/contracts/abis/EscrowManager.json
cat out/ReputationSystem.sol/ReputationSystem.json | jq '.abi' > ../frontend/lib/contracts/abis/ReputationSystem.json
cat out/MockStablecoin.sol/MockStablecoin.json | jq '.abi' > ../frontend/lib/contracts/abis/MockStablecoin.json
```

## Deployment to Mainnet

⚠️ **WARNING**: Only deploy to mainnet after thorough testing on testnet!

### Before Mainnet Deployment:

1. **Security Audit**: Get contracts professionally audited
2. **Extensive Testing**: Run on testnet for at least 1-2 weeks
3. **Real Stablecoin**: Replace MockStablecoin with actual USDC/USDT
4. **Fee Collector**: Set up multisig for fee collection
5. **Gas Budget**: Ensure you have enough SOMI for deployment

### Mainnet Deployment Command:

```bash
forge script script/Deploy.s.sol:DeployAgroDataStreams \
  --rpc-url somnia_mainnet \
  --broadcast \
  --verify \
  -vvvv
```

## Troubleshooting

### "Insufficient funds" error
```bash
# Check your balance
cast balance <YOUR_ADDRESS> --rpc-url somnia_testnet

# Get more testnet tokens from faucet
# Visit: https://testnet.somnia.network/
```

### "Nonce too low" error
```bash
# Reset nonce
cast nonce <YOUR_ADDRESS> --rpc-url somnia_testnet
```

### Deployment transaction pending
```bash
# Check transaction status
cast tx <TX_HASH> --rpc-url somnia_testnet

# View transaction receipt
cast receipt <TX_HASH> --rpc-url somnia_testnet
```

### Contract verification fails
- Check block explorer supports verification
- Verify manually using the commands in Step 4
- Ensure constructor arguments are correct

### RPC connection issues
Try alternative RPC providers:
- Ankr: https://www.ankr.com/rpc/somnia
- Public Node: https://somnia.publicnode.com
- Stakely: https://somnia-json-rpc.stakely.io

## Post-Deployment Checklist

- [ ] All contracts deployed successfully
- [ ] Deployment addresses saved and backed up
- [ ] Contracts verified on block explorer
- [ ] ABIs extracted and copied to frontend
- [ ] Frontend .env.local updated
- [ ] Test batch registration works
- [ ] Test auction creation works
- [ ] Test bid placement works
- [ ] Somnia Data Streams initialized
- [ ] Documentation updated with addresses

## Contract Addresses (Update after deployment)

### Testnet Deployment
- **MockStablecoin**: 
- **BatchRegistry**: 
- **AuctionManager**: 
- **EscrowManager**: 
- **ReputationSystem**: 
- **Fee Collector**: 

### Mainnet Deployment
- **Stablecoin** (USDC/USDT): 
- **BatchRegistry**: 
- **AuctionManager**: 
- **EscrowManager**: 
- **ReputationSystem**: 
- **Fee Collector**: 

## Useful Commands

```bash
# Check gas price
cast gas-price --rpc-url somnia_testnet

# Estimate deployment gas
forge script script/Deploy.s.sol:DeployAgroDataStreams --rpc-url somnia_testnet

# Get contract code
cast code <CONTRACT_ADDRESS> --rpc-url somnia_testnet

# Call view function
cast call <CONTRACT_ADDRESS> "totalBatches()(uint256)" --rpc-url somnia_testnet

# Send transaction
cast send <CONTRACT_ADDRESS> "registerBatch(string,uint256,uint8,string,string)" "Tomatoes" 100 5 "location" "ipfs://..." --rpc-url somnia_testnet --private-key $PRIVATE_KEY
```

## Support & Resources

- **Somnia Docs**: https://docs.somnia.network
- **Foundry Book**: https://book.getfoundry.sh
- **Block Explorer**: https://shannon-explorer.somnia.network/
- **Testnet Faucet**: https://testnet.somnia.network/
- **Add to Metamask**: https://testnet.somnia.network/

## Security Notes

⚠️ **CRITICAL**:
- NEVER commit `.env` file to git
- NEVER share your private key
- Use a dedicated wallet for deployment
- Store deployment wallet seed phrase securely
- Use hardware wallet for mainnet deployment
- Implement multisig for fee collector on mainnet
