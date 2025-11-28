# Agro-Data Streams 🌾

**Blockchain-Verified Agricultural Provenance & Micro-Auction Platform**

A full-stack decentralized application built on Somnia blockchain that connects farmers directly to buyers through immutable provenance tracking and real-time micro-auctions.

## 🌟 Features

### For Farmers
- **Batch Registration**: Register produce batches with photos and metadata
- **IPFS Storage**: Decentralized storage for product photos and lab certificates
- **Micro-Auctions**: Create auctions (15min - 7 days) with custom pricing
- **Reputation System**: Build trust through quality feedback

### For Buyers
- **Live Auction Feed**: Real-time WebSocket updates for bids
- **Verified Quality**: View immutable quality grades and lab tests
- **Escrow Protection**: Automated 2% platform fee with stablecoin payments
- **Delivery Tracking**: Location-based filtering

### For Consumers
- **QR Code Scanner**: Verify complete farm-to-table provenance
- **Blockchain Verification**: Immutable harvest dates and quality records
- **Lab Certificates**: Access to third-party quality testing results
- **Farmer Transparency**: View farmer reputation scores

## 🏗️ Architecture

### Smart Contracts (Solidity 0.8.30)
- **BatchRegistry**: Immutable provenance records
- **AuctionManager**: Micro-auction lifecycle
- **EscrowManager**: Stablecoin escrow with fees
- **ReputationSystem**: Dynamic trust scoring (0-100)

### Frontend (Next.js Full-Stack)
- **API Routes**: Server-side blockchain interactions
- **Server Actions**: Contract read/write operations
- **Real-time Updates**: WebSocket subscriptions via viem
- **IPFS Integration**: Photo/document uploads

### Somnia Data Streams
- **Real-time Queryability**: Sub-second data retrieval
- **No Indexer Needed**: Native blockchain data layer
- **Schema-Based**: Structured on-chain data storage
- **WebSocket Subscriptions**: Live event notifications

## 📁 Project Structure

```
Agro-Data-Streams/
├── contracts/                 # Foundry smart contracts
│   ├── src/                  # Solidity contracts
│   │   ├── BatchRegistry.sol
│   │   ├── AuctionManager.sol
│   │   ├── EscrowManager.sol
│   │   └── ReputationSystem.sol
│   ├── test/                 # 53 comprehensive tests
│   └── script/               # Deployment scripts
│
├── frontend/                  # Next.js app
│   ├── app/
│   │   ├── farmer/           # Farmer dashboard
│   │   ├── buyer/            # Buyer auction feed
│   │   ├── consumer/         # QR scanner
│   │   ├── api/              # Backend API routes
│   │   │   ├── batches/
│   │   │   ├── auctions/
│   │   │   └── bids/
│   │   └── actions/          # Server Actions
│   │       ├── contracts.ts
│   │       └── ipfs.ts
│   ├── lib/
│   │   ├── somnia/           # Somnia Streams integration
│   │   │   ├── schemas.ts
│   │   │   └── service.ts
│   │   └── hooks/            # React hooks
│   │       └── useRealtimeUpdates.ts
│   └── .env.example
│
└── docs/
    ├── DEPLOYMENT.md
    ├── SOMNIA_ARCHITECTURE.md
    └── IMPLEMENTATION_SUMMARY.md
```

## 🚀 Quick Start

### 1. Deploy Smart Contracts

```bash
cd contracts

# Install dependencies
forge install

# Run tests (53/53 passing)
forge test -vvv

# Deploy to Somnia Testnet
export PRIVATE_KEY=0x...
forge script script/Deploy.s.sol:DeployScript \
  --rpc-url https://dream-rpc.somnia.network \
  --broadcast
```

### 2. Configure Frontend

```bash
cd frontend

# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local

# Edit .env.local with deployed contract addresses
```

### 3. Run Development Server

```bash
npm run dev
```

Visit:
- **Home**: http://localhost:3000
- **Farmer Dashboard**: http://localhost:3000/farmer
- **Buyer Dashboard**: http://localhost:3000/buyer
- **Consumer Scanner**: http://localhost:3000/consumer

## 🔧 Environment Variables

```env
# Somnia Blockchain
NEXT_PUBLIC_SOMNIA_RPC_URL=https://dream-rpc.somnia.network
NEXT_PUBLIC_CHAIN_ID=50311

# Contract Addresses (from deployment)
NEXT_PUBLIC_BATCH_REGISTRY_ADDRESS=0x...
NEXT_PUBLIC_AUCTION_MANAGER_ADDRESS=0x...
NEXT_PUBLIC_ESCROW_MANAGER_ADDRESS=0x...
NEXT_PUBLIC_REPUTATION_SYSTEM_ADDRESS=0x...

# Server-side signing
PRIVATE_KEY=0x...

# IPFS Configuration
IPFS_HOST=ipfs.infura.io
IPFS_PORT=5001
IPFS_PROTOCOL=https
IPFS_AUTH=Basic <credentials>
```

## 📊 Test Coverage

```bash
cd contracts
forge test -vvv

# Results:
✅ BatchRegistry: 10/10 tests passing
✅ AuctionManager: 16/16 tests passing
✅ EscrowManager: 11/11 tests passing
✅ ReputationSystem: 14/14 tests passing
✅ Integration: 3/3 scenarios passing
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total: 53/53 tests passing (100%)
```

## 🔐 Security Features

- **Immutable Provenance**: On-chain batch records cannot be altered
- **Escrow Protection**: Funds locked until auction settlement
- **Reputation System**: Weighted average of quality feedback
- **Access Control**: Only batch owners can update metadata
- **Reentrancy Guards**: Protection on all state-changing functions
- **Event Logging**: Complete audit trail via events

## 🌐 Technology Stack

| Layer                 | Technology          | Purpose                           |
| --------------------- | ------------------- | --------------------------------- |
| **Blockchain**        | Somnia Testnet      | 400k+ TPS, sub-second finality    |
| **Smart Contracts**   | Solidity 0.8.30     | Business logic & state management |
| **Data Layer**        | Somnia Data Streams | Real-time queryable on-chain data |
| **Frontend**          | Next.js 15          | Full-stack React framework        |
| **Blockchain Client** | viem 2.0            | TypeScript Ethereum interactions  |
| **Storage**           | IPFS                | Decentralized media hosting       |
| **Testing**           | Foundry             | Solidity testing framework        |

## 📱 User Workflows

### Farmer Journey
1. Connect wallet
2. Register batch with photos → IPFS upload → Blockchain record
3. Create auction with pricing
4. Receive bids in real-time
5. Automatic escrow settlement
6. Receive quality feedback

### Buyer Journey
1. Browse live auction feed
2. View batch provenance
3. Place bid → Escrow locks funds
4. Win auction → Funds released to farmer
5. Submit quality feedback

### Consumer Journey
1. Scan QR code on product
2. View complete provenance chain
3. Verify harvest date & quality
4. Check lab certificates
5. See farmer reputation

## 🧪 Development Commands

```bash
# Smart Contracts
cd contracts
forge build                    # Compile contracts
forge test                     # Run tests
forge test -vvv               # Verbose test output
forge coverage                # Coverage report
forge script script/Deploy.s.sol --fork-url <RPC>

# Frontend
cd frontend
npm run dev                    # Start dev server
npm run build                 # Production build
npm run lint                  # Lint check
npm run type-check            # TypeScript check
```

## 📖 Documentation

- **[Deployment Guide](./DEPLOYMENT.md)**: Step-by-step deployment instructions
- **[Somnia Architecture](./SOMNIA_ARCHITECTURE.md)**: Data Streams integration details
- **[Implementation Summary](./IMPLEMENTATION_SUMMARY.md)**: Technical overview

## 🐛 Known Issues & Limitations

1. **IPFS Library**: `ipfs-http-client` is deprecated, migration to Helia recommended
2. **Contract ABIs**: Need full ABIs from `forge build` for frontend integration
3. **WebSocket Polling**: Current implementation uses 5s polling, can be optimized
4. **Mobile Responsiveness**: Consumer QR scanner needs native camera integration

## 🚧 Roadmap

- [ ] QR code generation for batches
- [ ] Mobile app (React Native)
- [ ] Multi-language support
- [ ] Analytics dashboard
- [ ] Delivery tracking integration
- [ ] Weather data integration
- [ ] Automated lab test verification
- [ ] NFT certificates for premium batches

## 📄 License

MIT

## 🤝 Contributing

Contributions welcome! Please open an issue or submit a PR.

## 📞 Support

- **Somnia Docs**: https://docs.somnia.network
- **Foundry Book**: https://book.getfoundry.sh
- **Next.js Docs**: https://nextjs.org/docs

---

**Built with ❤️ on Somnia Blockchain**

**Chain ID**: 50311 (Testnet)  
**RPC**: https://dream-rpc.somnia.network  
**Explorer**: TBD
