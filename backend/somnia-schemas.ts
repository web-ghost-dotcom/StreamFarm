/**
 * Somnia Data Streams Schema Definitions
 * These schemas map to our smart contract data structures
 */

// ============ Batch/Provenance Schemas ============

/**
 * Main batch provenance record
 * Published when farmer registers a new batch
 */
export const BATCH_SCHEMA = `
  bytes32 batchId,
  uint64 harvestTimestamp,
  string cropType,
  uint32 weightKg,
  uint8 qualityGrade,
  bytes32 farmerId,
  string locationHash,
  string mediaCid,
  bytes32 labTestCidHash
`;

/**
 * Batch media update
 * Published when photos/documents are added
 */
export const BATCH_MEDIA_SCHEMA = `
  bytes32 batchId,
  string mediaCid,
  uint64 timestamp
`;

// ============ Auction Schemas ============

/**
 * Auction record
 * Published when auction is created or updated
 */
export const AUCTION_SCHEMA = `
  bytes32 auctionId,
  bytes32 batchId,
  bytes32 farmerId,
  uint64 startTimestamp,
  uint64 endTimestamp,
  uint256 startingPrice,
  uint256 reservePrice,
  uint256 highestBid,
  address highestBidder,
  uint8 status,
  string deliveryLocationHash
`;

/**
 * Bid record
 * Published each time a new bid is placed
 */
export const BID_SCHEMA = `
  bytes32 auctionId,
  address bidder,
  uint256 amount,
  uint64 timestamp,
  bool isWinning
`;

// ============ Settlement Schemas ============

/**
 * Sale settlement record
 * Published when auction is settled
 */
export const SETTLEMENT_SCHEMA = `
  bytes32 saleId,
  bytes32 auctionId,
  bytes32 batchId,
  address buyer,
  address farmer,
  uint256 finalPrice,
  uint256 platformFee,
  uint64 settlementTimestamp
`;

/**
 * Escrow status
 * Published when funds are locked/released
 */
export const ESCROW_SCHEMA = `
  bytes32 auctionId,
  address buyer,
  uint256 amount,
  uint8 status,
  uint64 timestamp
`;

// ============ Reputation Schemas ============

/**
 * Quality feedback
 * Published when buyer submits feedback
 */
export const FEEDBACK_SCHEMA = `
  bytes32 batchId,
  bytes32 auctionId,
  bytes32 farmerId,
  address buyer,
  uint8 qualityScore,
  string comment,
  uint64 timestamp
`;

/**
 * Farmer reputation snapshot
 * Published periodically or on updates
 */
export const FARMER_REPUTATION_SCHEMA = `
  bytes32 farmerId,
  uint256 totalSales,
  uint256 successfulDeliveries,
  uint256 averageQualityScore,
  uint256 totalRevenue,
  uint256 reputationScore,
  bool verified,
  uint64 lastUpdated
`;

/**
 * Buyer reputation snapshot
 */
export const BUYER_REPUTATION_SCHEMA = `
  address buyer,
  uint256 totalPurchases,
  uint256 timelyPayments,
  uint256 totalSpent,
  uint256 reputationScore,
  bool verified,
  uint64 lastUpdated
`;

// ============ Real-time Feed Schemas ============

/**
 * Live auction feed for dashboards
 * Aggregated view of active auctions
 */
export const LIVE_AUCTION_FEED_SCHEMA = `
  bytes32 auctionId,
  bytes32 batchId,
  string cropType,
  uint32 weightKg,
  uint256 currentBid,
  uint256 bidCount,
  uint64 timeRemaining,
  string locationHash
`;

/**
 * Market statistics
 * Published periodically for analytics
 */
export const MARKET_STATS_SCHEMA = `
  string region,
  string cropType,
  uint256 averagePrice,
  uint256 volumeKg,
  uint256 activeAuctions,
  uint64 timestamp
`;

// ============ Event Schemas ============

/**
 * Event: New batch registered
 */
export const NEW_BATCH_EVENT = {
    id: 'NewBatchForAuction',
    params: [
        { name: 'batchId', paramType: 'bytes32', isIndexed: true },
        { name: 'farmerId', paramType: 'bytes32', isIndexed: true }
    ],
    eventTopic: 'NewBatchForAuction(bytes32 indexed batchId, bytes32 indexed farmerId)'
};

/**
 * Event: New bid placed
 */
export const NEW_BID_EVENT = {
    id: 'NewBid',
    params: [
        { name: 'auctionId', paramType: 'bytes32', isIndexed: true },
        { name: 'bidder', paramType: 'address', isIndexed: true },
        { name: 'amount', paramType: 'uint256', isIndexed: false }
    ],
    eventTopic: 'NewBid(bytes32 indexed auctionId, address indexed bidder, uint256 amount)'
};

/**
 * Event: Auction closed
 */
export const AUCTION_CLOSED_EVENT = {
    id: 'AuctionClosed',
    params: [
        { name: 'auctionId', paramType: 'bytes32', isIndexed: true },
        { name: 'winner', paramType: 'address', isIndexed: true },
        { name: 'finalPrice', paramType: 'uint256', isIndexed: false }
    ],
    eventTopic: 'AuctionClosed(bytes32 indexed auctionId, address indexed winner, uint256 finalPrice)'
};

/**
 * Event: Batch sold
 */
export const BATCH_SOLD_EVENT = {
    id: 'BatchSold',
    params: [
        { name: 'batchId', paramType: 'bytes32', isIndexed: true },
        { name: 'buyer', paramType: 'address', isIndexed: true },
        { name: 'price', paramType: 'uint256', isIndexed: false }
    ],
    eventTopic: 'BatchSold(bytes32 indexed batchId, address indexed buyer, uint256 price)'
};

// ============ Schema IDs (computed at runtime) ============
export const SCHEMA_IDS = {
    BATCH: 'batch_provenance',
    BATCH_MEDIA: 'batch_media',
    AUCTION: 'auction',
    BID: 'bid',
    SETTLEMENT: 'settlement',
    ESCROW: 'escrow',
    FEEDBACK: 'quality_feedback',
    FARMER_REP: 'farmer_reputation',
    BUYER_REP: 'buyer_reputation',
    LIVE_FEED: 'live_auction_feed',
    MARKET_STATS: 'market_statistics'
} as const;

export const EVENT_IDS = {
    NEW_BATCH: 'NewBatchForAuction',
    NEW_BID: 'NewBid',
    AUCTION_CLOSED: 'AuctionClosed',
    BATCH_SOLD: 'BatchSold'
} as const;
