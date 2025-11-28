# Agro-Data-Streams Frontend Integration Guide

## 🎉 Deployment Status

All smart contracts successfully deployed to **Somnia Testnet**:

| Contract         | Address                                      |
| ---------------- | -------------------------------------------- |
| MockStablecoin   | `0x448435CD815c430bC7c0751aAF612cFD3D225416` |
| BatchRegistry    | `0xC80709259ab049DF1C0E3Fa07DB51d61ce0FACB4` |
| AuctionManager   | `0x4E48877eCd651Be45850ea2aecf31d846fb5cd5c` |
| EscrowManager    | `0x8408aE020473c6aEDa083aBc90B4E9CcC2d98322` |
| ReputationSystem | `0x05006Df81AcBCEeE357670738119070349Ac103f` |

## 📁 Project Structure

```
frontend/
├── app/
│   ├── actions/
│   │   ├── contracts.ts      # Server-side contract interactions
│   │   └── ipfs.ts           # IPFS upload handlers
│   ├── api/
│   │   ├── batches/route.ts  # Batch data API
│   │   ├── auctions/route.ts # Auction data API
│   │   └── bids/route.ts     # Bid data API
│   ├── farmer/page.tsx       # Farmer dashboard
│   ├── buyer/page.tsx        # Buyer dashboard
│   └── consumer/page.tsx     # Consumer verification
├── lib/
│   ├── contracts/
│   │   ├── config.ts         # Contract addresses & ABIs
│   │   └── abis/             # Extracted contract ABIs
│   ├── hooks/
│   │   ├── useContracts.ts   # Contract read hooks
│   │   └── useRealtimeUpdates.ts # Somnia Streams
│   ├── somnia/
│   │   ├── service.ts        # Somnia SDK wrapper
│   │   └── schemas.ts        # Data stream schemas
│   └── ipfs/
└── .env.local                # Environment configuration
```

## 🔧 Setup

### 1. Environment Variables

The `.env.local` file is already configured with deployed addresses:

```env
# Blockchain Configuration
NEXT_PUBLIC_CHAIN_ID=50312
NEXT_PUBLIC_RPC_URL=https://dream-rpc.somnia.network/
NEXT_PUBLIC_EXPLORER_URL=https://shannon-explorer.somnia.network

# Contract Addresses
NEXT_PUBLIC_BATCH_REGISTRY_ADDRESS=0xC80709259ab049DF1C0E3Fa07DB51d61ce0FACB4
NEXT_PUBLIC_AUCTION_MANAGER_ADDRESS=0x4E48877eCd651Be45850ea2aecf31d846fb5cd5c
NEXT_PUBLIC_ESCROW_MANAGER_ADDRESS=0x8408aE020473c6aEDa083aBc90B4E9CcC2d98322
NEXT_PUBLIC_REPUTATION_SYSTEM_ADDRESS=0x05006Df81AcBCEeE357670738119070349Ac103f
NEXT_PUBLIC_STABLECOIN_ADDRESS=0x448435CD815c430bC7c0751aAF612cFD3D225416
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Run Development Server

```bash
npm run dev
```

Visit http://localhost:3000

## 📚 Usage Guide

### Server Actions (app/actions/contracts.ts)

Server-side functions for contract interactions:

```typescript
import { registerBatchOnChain, createAuctionOnChain, placeBidOnChain } from '@/app/actions/contracts';

// Register a batch
const result = await registerBatchOnChain({
  batchId: 'BATCH-001',
  farmerId: 'FARMER-123',
  cropType: 'Organic Tomatoes',
  weightKg: 500,
  qualityGrade: 1, // A grade
  locationHash: 'GPS:34.0522,-118.2437',
  mediaCid: 'QmXxx...' // IPFS CID
});

// Create an auction
const auction = await createAuctionOnChain({
  auctionId: 'AUC-001',
  batchId: '0x...', // From batch registration
  farmerId: 'FARMER-123',
  durationSeconds: 3600, // 1 hour
  startingPrice: '100', // 100 USDC
  reservePrice: '150',  // 150 USDC minimum
  deliveryLocationHash: 'WAREHOUSE-A'
});

// Place a bid
const bid = await placeBidOnChain({
  auctionId: '0x...',
  bidAmount: '175' // 175 USDC
});
```

### Client Hooks (lib/hooks/useContracts.ts)

React hooks for reading contract data:

```typescript
import { useBatch, useAuction, useStablecoinBalance } from '@/lib/hooks/useContracts';

function BatchDetail({ batchId }: { batchId: `0x${string}` }) {
  const { batch, loading, error } = useBatch(batchId);
  
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  
  return (
    <div>
      <h2>{batch.cropType}</h2>
      <p>Weight: {batch.weightKg} kg</p>
      <p>Grade: {batch.qualityGrade}</p>
    </div>
  );
}

function AuctionCard({ auctionId }: { auctionId: `0x${string}` }) {
  const { auction, loading } = useAuction(auctionId);
  const { isActive } = useIsAuctionActive(auctionId);
  
  return (
    <div>
      <h3>Auction {isActive ? '🟢 Active' : '🔴 Closed'}</h3>
      <p>Current Bid: {auction?.highestBid}</p>
    </div>
  );
}
```

### Real-time Updates (Somnia Data Streams)

```typescript
import { useRealtimeUpdates } from '@/lib/hooks/useRealtimeUpdates';

function LiveAuctions() {
  const auctions = useRealtimeUpdates({
    streamKey: 'auctions',
    schema: auctionSchema
  });
  
  return (
    <div>
      {auctions.map(auction => (
        <AuctionCard key={auction.id} {...auction} />
      ))}
    </div>
  );
}
```

## 🔑 Key Features

### 1. **Batch Registration**
- Upload media to IPFS
- Register batch on-chain with immutable provenance
- Add lab test results post-registration

### 2. **Auction Management**
- Create time-bound auctions
- Real-time bid updates via Somnia Streams
- Automatic settlement with escrow

### 3. **Escrow System**
- Stablecoin-based payments (MockUSDC)
- 2% platform fee
- Secure fund release on delivery

### 4. **Reputation System**
- Track farmer reliability
- Buyer payment history
- On-chain trust scores

### 5. **Consumer Verification**
- QR code scanning
- Full provenance trail
- Lab test verification

## 🧪 Testing

### Get Test Tokens

```bash
# Visit Somnia Faucet
https://testnet.somnia.network/

# Or request from Discord
https://discord.com/invite/Somnia
```

### Mint Test Stablecoins

```typescript
import { mintTestStablecoins } from '@/app/actions/contracts';

await mintTestStablecoins({
  to: '0xYourAddress',
  amount: '10000' // 10,000 USDC
});
```

### Test Flow

1. **Farmer**: Register batch → Create auction
2. **Buyer**: Browse auctions → Place bid → Win auction
3. **Consumer**: Scan QR → View provenance → Verify quality

## 🔗 Network Details

- **Chain ID**: 50312
- **RPC**: https://dream-rpc.somnia.network/
- **Explorer**: https://shannon-explorer.somnia.network/
- **Faucet**: https://testnet.somnia.network/

## 📖 API Routes

### GET /api/batches
Fetch all registered batches

### GET /api/batches/[id]
Get specific batch details

### GET /api/auctions
List active auctions

### GET /api/auctions/[id]
Get auction details with bid history

### POST /api/bids
Submit a new bid

## 🚀 Deployment

### Vercel Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Add environment variables in Vercel dashboard
```

### Environment Variables (Production)

Remember to set these in your hosting platform:
- `NEXT_PUBLIC_*` variables (public)
- `PRIVATE_KEY` (server-only, for automated transactions)
- `IPFS_PROJECT_ID` and `IPFS_PROJECT_SECRET` (for Infura IPFS)

## 🛠 Troubleshooting

### "Contract not found"
- Check `.env.local` has correct addresses
- Verify you're on Somnia Testnet (Chain ID 50312)

### "Insufficient funds"
- Get STT from faucet for gas
- Mint MockUSDC for bid payments

### "Transaction failed"
- Check gas settings
- Ensure contract approvals (for stablecoin transfers)
- Verify transaction on explorer

## 📝 Next Steps

1. ✅ Contracts deployed
2. ✅ Frontend configured
3. ⏳ Test end-to-end flow
4. ⏳ Add wallet connect (RainbowKit/ConnectKit)
5. ⏳ Deploy to production
6. ⏳ Verify contracts on explorer

## 🔐 Security Notes

- Never commit `.env.local` with real private keys
- Use environment-specific keys (dev/staging/prod)
- Implement proper access controls for admin functions
- Consider multi-sig for critical operations

## 📞 Support

- **Somnia Discord**: https://discord.com/invite/Somnia
- **Documentation**: https://docs.somnia.network/
- **Explorer**: https://shannon-explorer.somnia.network/

---

Built with ❤️ for transparent agricultural supply chains
