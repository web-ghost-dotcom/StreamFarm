# 🏗️ Agro Data Streams - Architecture with Somnia Integration

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          FRONTEND (Next.js)                          │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────┐  ┌──────────┐ │
│  │ Farmer App   │  │ Buyer        │  │ Consumer   │  │ Admin    │ │
│  │              │  │ Dashboard    │  │ QR Scan    │  │ Panel    │ │
│  └──────┬───────┘  └──────┬───────┘  └─────┬──────┘  └────┬─────┘ │
│         │                 │                 │              │        │
│         └─────────────────┼─────────────────┼──────────────┘        │
│                           │                 │                       │
└───────────────────────────┼─────────────────┼───────────────────────┘
                            │                 │
                    ┌───────▼─────────────────▼───────┐
                    │   BACKEND API (Node.js/TS)      │
                    │                                  │
                    │  ┌────────────────────────────┐ │
                    │  │  Somnia Streams Service    │ │
                    │  │  - Publish data            │ │
                    │  │  - Subscribe to events     │ │
                    │  │  - Real-time updates       │ │
                    │  └─────┬──────────────┬───────┘ │
                    │        │              │          │
                    │  ┌─────▼──────┐  ┌───▼────────┐ │
                    │  │ IPFS       │  │ PostgreSQL │ │
                    │  │ Service    │  │ (Analytics)│ │
                    │  └────────────┘  └────────────┘ │
                    └──────────┬───────────┬──────────┘
                               │           │
        ┌──────────────────────┼───────────┼──────────────────────┐
        │                      │           │                       │
        │   SOMNIA BLOCKCHAIN  │           │                       │
        │                      │           │                       │
        │  ┌──────────────────▼───────────▼──────────────────┐   │
        │  │       SOMNIA DATA STREAMS PROTOCOL                │   │
        │  │  ┌──────────────┐  ┌──────────────────────────┐  │   │
        │  │  │ Data Streams │  │   Event Streams          │  │   │
        │  │  │              │  │                          │  │   │
        │  │  │ • Batches    │  │ • NewBatchForAuction    │  │   │
        │  │  │ • Auctions   │  │ • NewBid                │  │   │
        │  │  │ • Bids       │  │ • AuctionClosed         │  │   │
        │  │  │ • Feedback   │  │ • BatchSold             │  │   │
        │  │  │ • Reputation │  │                          │  │   │
        │  │  └──────────────┘  └──────────────────────────┘  │   │
        │  │                                                    │   │
        │  │  WebSocket Subscriptions ←──────────────────────→ │   │
        │  └────────────────────────────────────────────────────┘   │
        │                                                            │
        │  ┌────────────────────────────────────────────────────┐   │
        │  │         SMART CONTRACTS (Solidity)                 │   │
        │  │                                                     │   │
        │  │  BatchRegistry → AuctionManager → EscrowManager   │   │
        │  │       ↓               ↓                ↓           │   │
        │  │  ReputationSystem ←──────────────────────         │   │
        │  │                                                     │   │
        │  └─────────────────────────────────────────────────────┘   │
        └─────────────────────────────────────────────────────────────┘
```

---

## Data Flow Examples

### 1️⃣ **Farmer Registers Batch**

```
Farmer App (Frontend)
    ↓
Backend API
    ↓ (upload photo)
IPFS → CID
    ↓ (call smart contract)
BatchRegistry.registerBatch()
    ↓ (publish to Somnia Streams)
SomniaService.publishBatch()
    ↓ (emit event)
NewBatchForAuction event
    ↓ (WebSocket)
Buyer Dashboard (real-time update)
```

### 2️⃣ **Buyer Places Bid**

```
Buyer Dashboard
    ↓
Backend API
    ↓
AuctionManager.placeBid()
    ↓
SomniaService.publishBid()
    ↓ (emit event + update data)
NewBid event
    ↓ (WebSocket subscriptions)
├─→ Farmer App (notification: "New bid!")
├─→ Other Buyers (update highest bid)
└─→ Analytics Dashboard
```

### 3️⃣ **Consumer Scans QR Code**

```
Consumer App scans QR
    ↓ (extract batchId)
Backend API /batches/:id
    ↓ (read from Somnia Streams)
SomniaService.getBatch()
    ↓ (fetch IPFS media)
IPFS → photos
    ↓ (return provenance data)
Frontend displays:
├─ Crop type, weight, harvest date
├─ Farmer reputation
├─ Quality grade
├─ Location (geohash map)
└─ Photos from IPFS
```

---

## Integration Points

### **Smart Contracts → Somnia Streams**

Your smart contracts emit events → Backend listens → Publishes to Somnia Streams

```typescript
// Example: Listen to smart contract events
contractListener.on('BatchRegistered', async (event) => {
  await somniaService.publishBatch({
    batchId: event.args.batchId,
    farmerId: event.args.farmerId,
    cropType: event.args.cropType,
    // ... other fields
  });
});
```

### **Somnia Streams → Frontend**

Frontend subscribes via WebSocket → Instant updates

```typescript
// Example: Subscribe to new bids
await somniaService.subscribeToAuctionBids(
  auctionId,
  (bid) => {
    updateUI(bid); // Real-time bid update
  }
);
```

---

## Why Somnia Streams?

### **Without Somnia Streams (Traditional)**
```
Smart Contract Event
    ↓ (wait for block confirmation)
Backend Indexer polls every N seconds
    ↓ (query database)
Frontend polls API every N seconds
    ↓
User sees update (5-30 second delay)
```

### **With Somnia Streams**
```
Smart Contract Event
    ↓ (instant)
Somnia Streams emits WebSocket event
    ↓ (instant)
Frontend receives update
    ↓
User sees update (<1 second)
```

---

## Key Benefits

✅ **Real-time Updates** - No polling, instant WebSocket notifications
✅ **Structured Data** - Schema-based storage (like a database)
✅ **Queryable** - Filter by schema, publisher, key, or range
✅ **Composable** - Data + Events in one atomic transaction
✅ **Verifiable** - All data is on-chain and immutable
✅ **No Indexer Needed** - Built-in data retrieval

---

## What Goes Where?

| Data Type              | Smart Contract | Somnia Streams | Database      | IPFS |
| ---------------------- | -------------- | -------------- | ------------- | ---- |
| Batch immutable record | ✅              | ✅ (mirror)     | ❌             | ❌    |
| Batch photos/media     | ❌              | ❌              | ❌             | ✅    |
| Auction state          | ✅              | ✅ (real-time)  | ❌             | ❌    |
| Bid history            | ✅              | ✅ (stream)     | ✅ (analytics) | ❌    |
| Reputation scores      | ✅              | ✅ (updated)    | ✅ (cache)     | ❌    |
| Quality feedback       | ✅              | ✅ (published)  | ❌             | ❌    |
| Analytics/aggregates   | ❌              | ❌              | ✅             | ❌    |
| User sessions/auth     | ❌              | ❌              | ✅             | ❌    |

---

## Implementation Checklist

### Backend Setup
- [ ] Install `@somnia-chain/streams` and `viem`
- [ ] Create `SomniaStreamsService` class
- [ ] Register all schemas on initialization
- [ ] Listen to smart contract events
- [ ] Publish data to Somnia Streams
- [ ] Set up WebSocket subscriptions

### Frontend Setup
- [ ] Connect to WebSocket endpoint
- [ ] Subscribe to relevant events
- [ ] Handle real-time updates in UI
- [ ] Display live auction feed
- [ ] Show instant bid notifications

### Smart Contracts
- [x] Already implemented ✅
- [ ] Deploy to Somnia testnet
- [ ] Verify contract addresses

---

## Next Steps

1. **Initialize Backend** with Somnia SDK
2. **Create Event Listeners** for smart contracts
3. **Build Real-time Dashboard** in frontend
4. **Test End-to-End Flow**

Would you like me to implement any specific part next?
