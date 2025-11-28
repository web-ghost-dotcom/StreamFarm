# Deployment Guide

## Prerequisites

- [Foundry](https://book.getfoundry.sh/getting-started/installation) installed
- Node.js 18+ and npm/yarn
- Somnia testnet STT tokens (from faucet)
- IPFS account (Infura/Pinata recommended)

## 1. Smart Contract Deployment

### Deploy to Somnia Testnet

```bash
cd contracts

# Set your private key
export PRIVATE_KEY=0x...

# Deploy contracts
forge script script/Deploy.s.sol:DeployScript \
  --rpc-url https://dream-rpc.somnia.network \
  --broadcast \
  --verify

# Save the deployed contract addresses
```

The deployment script will output addresses for:
- BatchRegistry
- AuctionManager
- EscrowManager
- ReputationSystem
- MockStablecoin

## 2. Frontend Configuration

### Environment Setup

```bash
cd frontend

# Copy example env file
cp .env.example .env.local

# Edit .env.local with your values
```

Update `.env.local`:

```env
# Contract addresses from deployment
NEXT_PUBLIC_BATCH_REGISTRY_ADDRESS=0x...
NEXT_PUBLIC_AUCTION_MANAGER_ADDRESS=0x...
NEXT_PUBLIC_ESCROW_MANAGER_ADDRESS=0x...
NEXT_PUBLIC_REPUTATION_SYSTEM_ADDRESS=0x...
NEXT_PUBLIC_STABLECOIN_ADDRESS=0x...

# Server-side transaction signing
PRIVATE_KEY=0x...

# Somnia Data Streams
SOMNIA_STREAMS_RPC_URL=https://dream-rpc.somnia.network
SOMNIA_PUBLISHER_PRIVATE_KEY=0x...

# IPFS (example using Infura)
IPFS_HOST=ipfs.infura.io
IPFS_PORT=5001
IPFS_PROTOCOL=https
IPFS_AUTH=Basic <base64 of projectId:secret>
```

### Install Dependencies

```bash
npm install
```

## 3. Initialize Somnia Data Streams

The schemas need to be published once to Somnia:

```bash
# Run initialization script
npm run init-schemas
```

This will:
- Publish BATCH_SCHEMA
- Publish AUCTION_SCHEMA
- Publish BID_SCHEMA
- Publish FEEDBACK_SCHEMA

## 4. Run Development Server

```bash
npm run dev
```

Visit:
- Farmer Dashboard: http://localhost:3000/farmer
- Buyer Dashboard: http://localhost:3000/buyer
- Consumer Scanner: http://localhost:3000/consumer

## 5. Production Deployment

### Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

Add environment variables in Vercel dashboard:
- Settings → Environment Variables
- Add all variables from .env.local

### Deploy to Custom Server

```bash
# Build production bundle
npm run build

# Start production server
npm start
```

## 6. Testing the Flow

### Farmer Workflow
1. Go to /farmer
2. Register a batch with photos
3. Create an auction for the batch

### Buyer Workflow
1. Go to /buyer
2. See live auction feed
3. Place bids on active auctions

### Consumer Workflow
1. Go to /consumer
2. Enter batch ID from product
3. View complete provenance

## 7. Smart Contract Verification

Verify contracts on Somnia block explorer:

```bash
forge verify-contract \
  <CONTRACT_ADDRESS> \
  src/BatchRegistry.sol:BatchRegistry \
  --chain-id 50311 \
  --watch
```

## Troubleshooting

### "Insufficient funds" error
- Get testnet STT from Somnia faucet
- Check wallet has enough balance

### IPFS upload fails
- Verify IPFS credentials
- Consider migrating from ipfs-http-client to Helia

### Somnia Streams not working
- Check publisher private key has STT for gas
- Verify schemas were initialized
- Check RPC URL is correct

### TypeScript errors
- Run `npm run build` to check for type issues
- Ensure tsconfig.json target is ES2020+

## Monitoring

### Check Contract Events
```bash
# Watch BatchRegistry events
cast logs --address <BATCH_REGISTRY_ADDRESS> \
  --rpc-url https://dream-rpc.somnia.network

# Watch AuctionManager events  
cast logs --address <AUCTION_MANAGER_ADDRESS> \
  --rpc-url https://dream-rpc.somnia.network
```

### Query Somnia Streams
```bash
# Get all batches from a publisher
curl -X POST https://dream-rpc.somnia.network \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "streams_read",
    "params": ["<SCHEMA_ID>", "<PUBLISHER_ADDRESS>"],
    "id": 1
  }'
```

## Production Checklist

- [ ] All contracts deployed and verified
- [ ] Environment variables set in production
- [ ] IPFS configured with production credentials
- [ ] Somnia schemas initialized
- [ ] Frontend deployed and accessible
- [ ] Test complete user flow (farmer → buyer → consumer)
- [ ] Monitor contract events for 24h
- [ ] Set up error logging (Sentry recommended)
- [ ] Configure rate limiting on API routes
- [ ] Add proper CORS configuration
- [ ] Set up backup IPFS gateway

## Security Notes

⚠️ **NEVER commit private keys or API secrets to git**
⚠️ Use environment variables for all sensitive data
⚠️ Rotate keys regularly in production
⚠️ Monitor contract balance to prevent DOS
⚠️ Implement rate limiting on public API routes
