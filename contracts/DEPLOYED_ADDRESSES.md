# Deployed Contract Addresses - Somnia Testnet

**Network:** Somnia Testnet (Chain ID: 50312)  
**Deployer:** 0xeD6c9f2573343043DD443bc633f9071ABDF688Fd  
**Deployment Date:** November 16, 2025

## Core Contracts

### MockStablecoin (mUSDC)
- **Address:** `0x448435CD815c430bC7c0751aAF612cFD3D225416`
- **Transaction:** `0x751cf10820619359e77b2c553033ea31942c7be58e7e6703bca7b65ebc7de86f`
- **Explorer:** https://shannon-explorer.somnia.network/address/0x448435CD815c430bC7c0751aAF612cFD3D225416

### BatchRegistry
- **Address:** `0xC80709259ab049DF1C0E3Fa07DB51d61ce0FACB4`
- **Transaction:** `0x95b405599e4ddd0f844b7b5a879c907dc948bf039ec368c9cd2550049d366c05`
- **Explorer:** https://shannon-explorer.somnia.network/address/0xC80709259ab049DF1C0E3Fa07DB51d61ce0FACB4

### AuctionManager
- **Address:** `0x4E48877eCd651Be45850ea2aecf31d846fb5cd5c`
- **Transaction:** `0x6e4a1dcc5de8005b7cd606b3ee933a3638e56877a20b1587b911638998fa9d43`
- **Constructor Args:**
  - BatchRegistry: `0xC80709259ab049DF1C0E3Fa07DB51d61ce0FACB4`
- **Explorer:** https://shannon-explorer.somnia.network/address/0x4E48877eCd651Be45850ea2aecf31d846fb5cd5c

### EscrowManager
- **Address:** `0x8408aE020473c6aEDa083aBc90B4E9CcC2d98322`
- **Transaction:** `0x1574a6b06804cd597274033bce51ca6c5812fd0dd7c657f91abb26ed6854e002`
- **Constructor Args:**
  - Stablecoin: `0x448435CD815c430bC7c0751aAF612cFD3D225416`
  - AuctionManager: `0x4E48877eCd651Be45850ea2aecf31d846fb5cd5c`
  - FeeCollector: `0xeD6c9f2573343043DD443bc633f9071ABDF688Fd`
- **Explorer:** https://shannon-explorer.somnia.network/address/0x8408aE020473c6aEDa083aBc90B4E9CcC2d98322

### ReputationSystem
- **Address:** `0x05006Df81AcBCEeE357670738119070349Ac103f`
- **Transaction:** `0x035046d9fd7be6591e518bf9d801f6cb1bf618bd350591444b913538cca44cd2`
- **Constructor Args:**
  - AuctionManager: `0x4E48877eCd651Be45850ea2aecf31d846fb5cd5c`
- **Explorer:** https://shannon-explorer.somnia.network/address/0x05006Df81AcBCEeE357670738119070349Ac103f

## Environment Variables for Frontend

Copy these to `frontend/.env.local`:

```bash
NEXT_PUBLIC_BATCH_REGISTRY_ADDRESS=0xC80709259ab049DF1C0E3Fa07DB51d61ce0FACB4
NEXT_PUBLIC_AUCTION_MANAGER_ADDRESS=0x4E48877eCd651Be45850ea2aecf31d846fb5cd5c
NEXT_PUBLIC_ESCROW_MANAGER_ADDRESS=0x8408aE020473c6aEDa083aBc90B4E9CcC2d98322
NEXT_PUBLIC_REPUTATION_SYSTEM_ADDRESS=0x05006Df81AcBCEeE357670738119070349Ac103f
NEXT_PUBLIC_STABLECOIN_ADDRESS=0x448435CD815c430bC7c0751aAF612cFD3D225416
```

## Next Steps

1. **Extract ABIs:**
   ```bash
   cd contracts
   ./scripts/extract-abis.sh
   ```

2. **Verify Contracts** (when verification is available):
   ```bash
   forge verify-contract <ADDRESS> <CONTRACT> --chain 50312
   ```

3. **Update Frontend:** Copy ABIs to frontend and configure addresses

4. **Test Deployment:** Interact with contracts to verify functionality
