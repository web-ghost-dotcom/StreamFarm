# New Deployment - November 19, 2025

## Contract Addresses (Somnia Testnet - Chain ID: 50312)

### MockStablecoin
- **Address:** `0x87FAD5732C553eb939F89F0D1ec9C5C67d651a05`
- **Transaction:** `0xdf0fb37629579a21f044d67725e78f34b6741404307b7f45b27f12e78a852ac1`

### BatchRegistry (with getAllBatches)
- **Address:** `0x18a516aEBAa0e4301775CC1Ad250da4a46B322D1`
- **Transaction:** `0x4a1c2d0e85244b5c95419edc902d395b102eee9e493d9449ba3b9bdf94ca65d9`
- **New Features:**
  - `getAllBatchIds()` - Returns array of all batch IDs
  - `getBatchesByFarmer(bytes32)` - Returns batches for specific farmer
  - `getAllBatches()` - Returns array of all batch structs

### AuctionManager (with getAllAuctions)
- **Address:** `0xbAB77132577706B143458D6858B83227E8214F3d`
- **Transaction:** `0x9a2626762b7624803a015eb2a1187fe761be75fa20bef14a458fd6e99dbf855c`
- **Constructor Args:** BatchRegistry (0x18a516aEBAa0e4301775CC1Ad250da4a46B322D1)
- **New Features:**
  - `getAllAuctionIds()` - Returns array of all auction IDs
  - `getActiveAuctionIds()` - Returns only active auction IDs
  - `getAuctionsByFarmer(bytes32)` - Returns auctions for specific farmer
  - `getAllAuctions()` - Returns array of all auction structs
  - `getActiveAuctions()` - Returns only active auction structs

### ReputationSystem
- **Address:** `0xfE2567096081eB4CF4E0DE60f4E76A9cFD3b39D7`
- **Transaction:** `0x76a54c247b6792f4a0ea4001758601702e46a54ed21c6a0cc64751dbe0fff946`
- **Constructor Args:** AuctionManager (0xbAB77132577706B143458D6858B83227E8214F3d)

### EscrowManager
- **Address:** `0xb69AE33bd9aDe08F4E89A0Ca6038CFA2d18c97d3`
- **Transaction:** `0xb4f50265026edbaf1f46deb0c0ef89aa6645a91515bd8cdf4d8f951fae16ca9b`
- **Constructor Args:** 
  - Stablecoin: 0x87FAD5732C553eb939F89F0D1ec9C5C67d651a05
  - AuctionManager: 0xbAB77132577706B143458D6858B83227E8214F3d
  - FeeCollector: 0xeD6c9f2573343043DD443bc633f9071ABDF688Fd

## Key Improvements

### No More Event Log Queries!
The new contracts store auction and batch IDs in arrays, eliminating the need to:
- Query event logs with block range limits
- Deal with RPC "block range exceeds 1000" errors
- Parse events to reconstruct state

### Direct Array Access
Frontend can now call:
```solidity
// Get all active auctions directly
Auction[] memory auctions = auctionManager.getActiveAuctions();

// Get all batches
Batch[] memory batches = batchRegistry.getAllBatches();

// Get auctions by specific farmer
bytes32[] memory farmerAuctions = auctionManager.getAuctionsByFarmer(farmerId);
```

### Gas Efficient
- IDs stored once during creation
- Arrays managed efficiently
- No duplicate storage

## Frontend Update Required

Update `.env.local`:
```bash
NEXT_PUBLIC_BATCH_REGISTRY_ADDRESS=0x18a516aEBAa0e4301775CC1Ad250da4a46B322D1
NEXT_PUBLIC_AUCTION_MANAGER_ADDRESS=0xbAB77132577706B143458D6858B83227E8214F3d
NEXT_PUBLIC_ESCROW_MANAGER_ADDRESS=0xb69AE33bd9aDe08F4E89A0Ca6038CFA2d18c97d3
NEXT_PUBLIC_REPUTATION_SYSTEM_ADDRESS=0xfE2567096081eB4CF4E0DE60f4E76A9cFD3b39D7
NEXT_PUBLIC_STABLECOIN_ADDRESS=0x87FAD5732C553eb939F89F0D1ec9C5C67d651a05
```

Also need to extract new ABIs and update frontend hooks to use the new functions!
