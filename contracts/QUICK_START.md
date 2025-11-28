# 🚀 Quick Start Guide - Agro Data Streams Smart Contracts

## Prerequisites

```bash
# Install Foundry
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

## Installation

```bash
cd contracts
forge install
forge build
```

## Run Tests

```bash
# All tests
forge test

# With verbosity
forge test -vvv

# Specific test
forge test --match-test test_RegisterBatch -vv

# Gas report
forge test --gas-report

# Coverage
forge coverage
```

## Deploy to Testnet

```bash
# 1. Setup environment
cp .env.example .env
# Edit .env with your private key and fee collector address

# 2. Deploy
forge script script/Deploy.s.sol:DeployAgroDataStreams \
  --rpc-url $SOMNIA_TESTNET_RPC \
  --broadcast \
  --verify

# 3. Save contract addresses from output
```

## Interact with Contracts

### Using Cast (CLI)

```bash
# Read: Get batch info
cast call $BATCH_REGISTRY "getBatch(bytes32)" $BATCH_ID

# Read: Get auction details
cast call $AUCTION_MANAGER "getAuction(bytes32)" $AUCTION_ID

# Write: Register batch
cast send $BATCH_REGISTRY "registerBatch(...)" \
  --rpc-url $RPC \
  --private-key $PRIVATE_KEY

# Write: Create auction
cast send $AUCTION_MANAGER "createAuction(...)" \
  --rpc-url $RPC \
  --private-key $PRIVATE_KEY
```

### Using JavaScript/TypeScript

```typescript
import { ethers } from 'ethers';

// Connect to contract
const batchRegistry = new ethers.Contract(
  BATCH_REGISTRY_ADDRESS,
  batchRegistryABI,
  signer
);

// Register batch
const tx = await batchRegistry.registerBatch(
  batchId,
  harvestTimestamp,
  "maize",
  24000, // 24kg
  8,     // quality
  farmerId,
  "gbsuv7",
  "QmIPFSHash"
);
await tx.wait();

// Read batch
const batch = await batchRegistry.getBatch(batchId);
console.log(batch);
```

## Common Operations

### 1. Register a Batch

```solidity
function registerBatch(
    bytes32 batchId,           // keccak256("batch-001")
    uint64 harvestTimestamp,   // block.timestamp
    string cropType,           // "maize"
    uint32 weightKg,           // 24000 (24kg in grams)
    uint8 qualityGrade,        // 8 (1-10)
    bytes32 farmerId,          // keccak256("farmer1")
    string locationHash,       // "gbsuv7"
    string mediaCid            // "QmIPFSHash"
)
```

### 2. Create Auction

```solidity
function createAuction(
    bytes32 auctionId,         // keccak256("auction-001")
    bytes32 batchId,           // batch ID from step 1
    bytes32 farmerId,          // keccak256("farmer1")
    uint64 durationSeconds,    // 3600 (1 hour)
    uint256 startingPrice,     // 10000e6 (10,000 USDC)
    uint256 reservePrice,      // 12000e6 (12,000 USDC)
    string deliveryLocation    // "gbsuv7"
)
```

### 3. Place Bid

```solidity
function placeBid(
    bytes32 auctionId,         // auction ID
    uint256 bidAmount          // 11000e6 (11,000 USDC)
)
```

### 4. Lock Escrow

```solidity
// First approve
stablecoin.approve(escrowManager, bidAmount);

// Then lock
escrowManager.lockFunds(auctionId, bidAmount);
```

### 5. Close & Settle Auction

```solidity
// After end time
auctionManager.closeAuction(auctionId);
auctionManager.settleAuction(auctionId);
```

### 6. Release Payment

```solidity
escrowManager.releaseFunds(auctionId, farmerAddress);
```

### 7. Submit Feedback

```solidity
reputationSystem.submitQualityFeedback(
    batchId,
    auctionId,
    farmerId,
    9,                          // quality score (1-10)
    "Excellent quality maize"   // comment
);
```

## Events to Monitor

### BatchRegistry Events
- `BatchRegistered(bytes32 indexed batchId, bytes32 indexed farmerId, ...)`
- `BatchMediaUpdated(bytes32 indexed batchId, string mediaCid)`
- `LabTestAdded(bytes32 indexed batchId, bytes32 labTestCidHash)`

### AuctionManager Events
- `AuctionCreated(bytes32 indexed auctionId, bytes32 indexed batchId, ...)`
- `NewBid(bytes32 indexed auctionId, address indexed bidder, uint256 amount, ...)`
- `AuctionClosed(bytes32 indexed auctionId, address indexed winner, ...)`
- `AuctionSettled(bytes32 indexed auctionId, bytes32 indexed batchId, ...)`

### EscrowManager Events
- `FundsLocked(bytes32 indexed auctionId, address indexed buyer, uint256 amount)`
- `FundsReleased(bytes32 indexed auctionId, address indexed farmer, ...)`
- `FundsRefunded(bytes32 indexed auctionId, address indexed buyer, ...)`

### ReputationSystem Events
- `SaleRecorded(bytes32 indexed farmerId, address indexed buyer, ...)`
- `QualityFeedbackSubmitted(bytes32 indexed batchId, address indexed buyer, ...)`

## Troubleshooting

### Build Issues

```bash
# Clean and rebuild
forge clean
forge build --force
```

### Test Failures

```bash
# Run specific test with traces
forge test --match-test test_name -vvvv

# Check errors
forge test --match-contract ContractName
```

### Gas Issues

```bash
# Compile with IR for complex functions
# (already enabled in foundry.toml)
forge build --via-ir
```

## Security Checklist

- [ ] Never commit private keys
- [ ] Verify contract addresses after deployment
- [ ] Test on testnet before mainnet
- [ ] Audit critical functions
- [ ] Monitor events for suspicious activity
- [ ] Set appropriate platform fees
- [ ] Configure fee collector securely

## Support

For issues or questions:
1. Check test files for examples
2. Review contract comments
3. See IMPLEMENTATION_SUMMARY.md for architecture details

---

**Contract Versions**: Solidity 0.8.30  
**Test Framework**: Foundry Forge  
**Blockchain**: Somnia (EVM-compatible)
