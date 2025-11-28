## Foundry

# Agro Data Streams - Smart Contracts

Solidity smart contracts for the Agro Produce Provenance & Micro-Auction Platform.

## 📋 Contracts Overview

### Core Contracts

1. **BatchRegistry** - Immutable provenance records for produce batches
   - Register harvest batches with IPFS metadata
   - Track farmer batches
   - Add lab test certificates

2. **AuctionManager** - Micro-auction lifecycle management
   - Create time-bound auctions
   - Competitive bidding system
   - Automatic settlement

3. **EscrowManager** - Stablecoin escrow & payments
   - Lock buyer funds
   - Release to farmers on settlement
   - Handle refunds
   - Platform fee collection (2%)

4. **ReputationSystem** - Trust & quality tracking
   - Farmer reputation scores
   - Buyer reliability metrics
   - Quality feedback system
   - Verification badges

## 🚀 Getting Started

### Prerequisites

- [Foundry](https://book.getfoundry.sh/getting-started/installation)

### Installation

```bash
cd contracts
forge install
```

### Build

```bash
forge build
```

### Test

```bash
# Run all tests
forge test

# Run with verbosity
forge test -vvv

# Run specific test file
forge test --match-path test/BatchRegistry.t.sol

# Run with gas reporting
forge test --gas-report

# Run integration tests
forge test --match-path test/Integration.t.sol -vv
```

### Test Coverage

```bash
forge coverage
```

## 📦 Deployment

### Setup Environment

```bash
cp .env.example .env
# Edit .env with your values
```

### Deploy to Testnet

```bash
forge script script/Deploy.s.sol:DeployAgroDataStreams \
  --rpc-url $SOMNIA_TESTNET_RPC \
  --broadcast \
  --verify
```

### Deploy to Mainnet

```bash
forge script script/Deploy.s.sol:DeployAgroDataStreams \
  --rpc-url $SOMNIA_MAINNET_RPC \
  --broadcast \
  --verify
```

## 🧪 Contract Architecture

```
┌─────────────────┐
│  BatchRegistry  │ ← Immutable provenance data
└────────┬────────┘
         │
         ↓
┌─────────────────┐     ┌──────────────┐
│ AuctionManager  │ ←──→│ EscrowManager│
└────────┬────────┘     └──────────────┘
         │                      │
         ↓                      ↓
┌──────────────────┐    ┌──────────────┐
│ ReputationSystem │    │  Stablecoin  │
└──────────────────┘    └──────────────┘
```

## 📊 Key Features

### BatchRegistry
- ✅ Immutable batch records
- ✅ IPFS integration for photos
- ✅ Quality grades (1-10)
- ✅ Geohash location tracking
- ✅ Lab test certificates

### AuctionManager
- ✅ Configurable auction duration (15min - 7 days)
- ✅ Starting price & reserve price
- ✅ Minimum bid increment
- ✅ Bid history tracking
- ✅ Automatic settlement

### EscrowManager
- ✅ Secure fund locking
- ✅ Automated release on settlement
- ✅ Refund mechanism
- ✅ 2% platform fee
- ✅ Fee collector management

### ReputationSystem
- ✅ Farmer score (0-100)
- ✅ Buyer score (0-100)
- ✅ Quality feedback
- ✅ Sales history
- ✅ Verification badges

## 🔍 Testing

### Test Files

- `BatchRegistry.t.sol` - Batch registration tests
- `AuctionManager.t.sol` - Auction lifecycle tests
- `EscrowManager.t.sol` - Escrow & payment tests
- `ReputationSystem.t.sol` - Reputation calculation tests
- `Integration.t.sol` - End-to-end flow tests

### Example Test Run

```bash
forge test --match-test test_CompleteAuctionFlow -vv
```

## 📝 License

MIT
