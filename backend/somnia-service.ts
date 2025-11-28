import { SDK, SchemaEncoder, zeroBytes32 } from '@somnia-chain/streams';
import { createPublicClient, createWalletClient, http, webSocket, type Hex, toHex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { somniaTestnet } from 'viem/chains';
import * as schemas from './somnia-schemas';

/**
 * Somnia Data Streams Service
 * Handles all interactions with Somnia's real-time data streaming protocol
 */
export class SomniaStreamsService {
    private sdk: SDK;
    private schemaEncoders: Map<string, SchemaEncoder> = new Map();
    private registeredSchemas: Set<string> = new Set();

    constructor(
        private rpcUrl: string,
        private wsUrl: string,
        private privateKey: `0x${string}`
    ) {
        const account = privateKeyToAccount(privateKey);

        this.sdk = new SDK({
            public: createPublicClient({
                chain: somniaTestnet,
                transport: http(rpcUrl)
            }),
            wallet: createWalletClient({
                chain: somniaTestnet,
                account,
                transport: http(rpcUrl)
            })
        });
    }

    /**
     * Initialize all schemas on startup
     */
    async initialize() {
        console.log('🔄 Initializing Somnia Data Streams...');

        // Register data schemas
        await this.registerAllSchemas();

        // Register event schemas
        await this.registerAllEvents();

        console.log('✅ Somnia Data Streams initialized');
    }

    /**
     * Register all data schemas
     */
    private async registerAllSchemas() {
        const schemaRegistrations = [
            { id: schemas.SCHEMA_IDS.BATCH, schema: schemas.BATCH_SCHEMA },
            { id: schemas.SCHEMA_IDS.BATCH_MEDIA, schema: schemas.BATCH_MEDIA_SCHEMA },
            { id: schemas.SCHEMA_IDS.AUCTION, schema: schemas.AUCTION_SCHEMA },
            { id: schemas.SCHEMA_IDS.BID, schema: schemas.BID_SCHEMA },
            { id: schemas.SCHEMA_IDS.SETTLEMENT, schema: schemas.SETTLEMENT_SCHEMA },
            { id: schemas.SCHEMA_IDS.ESCROW, schema: schemas.ESCROW_SCHEMA },
            { id: schemas.SCHEMA_IDS.FEEDBACK, schema: schemas.FEEDBACK_SCHEMA },
            { id: schemas.SCHEMA_IDS.FARMER_REP, schema: schemas.FARMER_REPUTATION_SCHEMA },
            { id: schemas.SCHEMA_IDS.BUYER_REP, schema: schemas.BUYER_REPUTATION_SCHEMA },
            { id: schemas.SCHEMA_IDS.LIVE_FEED, schema: schemas.LIVE_AUCTION_FEED_SCHEMA },
            { id: schemas.SCHEMA_IDS.MARKET_STATS, schema: schemas.MARKET_STATS_SCHEMA },
        ];

        try {
            const txHash = await this.sdk.streams.registerDataSchemas(
                schemaRegistrations.map(s => ({
                    ...s,
                    parentSchemaId: zeroBytes32
                })),
                true // Ignore if already registered
            );

            if (txHash) {
                console.log(`✅ Schemas registered: ${txHash}`);
            } else {
                console.log('ℹ️  Schemas already registered');
            }

            // Create encoders for each schema
            for (const { id, schema } of schemaRegistrations) {
                this.schemaEncoders.set(id, new SchemaEncoder(schema));
                this.registeredSchemas.add(id);
            }
        } catch (error) {
            console.error('❌ Schema registration failed:', error);
            throw error;
        }
    }

    /**
     * Register all event schemas
     */
    private async registerAllEvents() {
        const events = [
            schemas.NEW_BATCH_EVENT,
            schemas.NEW_BID_EVENT,
            schemas.AUCTION_CLOSED_EVENT,
            schemas.BATCH_SOLD_EVENT
        ];

        try {
            const txHash = await this.sdk.streams.registerEventSchemas(
                events.map(e => e.id),
                events
            );

            if (txHash) {
                console.log(`✅ Events registered: ${txHash}`);
            }
        } catch (error) {
            if (!String(error).includes('AlreadyRegistered')) {
                console.error('❌ Event registration failed:', error);
            }
        }
    }

    // ============ PUBLISH METHODS ============

    /**
     * Publish batch registration to Somnia Streams
     */
    async publishBatch(batchData: {
        batchId: Hex;
        harvestTimestamp: bigint;
        cropType: string;
        weightKg: number;
        qualityGrade: number;
        farmerId: Hex;
        locationHash: string;
        mediaCid: string;
        labTestCidHash?: Hex;
    }) {
        const encoder = this.schemaEncoders.get(schemas.SCHEMA_IDS.BATCH)!;
        const schemaId = await this.sdk.streams.computeSchemaId(schemas.BATCH_SCHEMA);

        const data = encoder.encodeData([
            { name: 'batchId', value: batchData.batchId, type: 'bytes32' },
            { name: 'harvestTimestamp', value: batchData.harvestTimestamp.toString(), type: 'uint64' },
            { name: 'cropType', value: batchData.cropType, type: 'string' },
            { name: 'weightKg', value: batchData.weightKg.toString(), type: 'uint32' },
            { name: 'qualityGrade', value: batchData.qualityGrade.toString(), type: 'uint8' },
            { name: 'farmerId', value: batchData.farmerId, type: 'bytes32' },
            { name: 'locationHash', value: batchData.locationHash, type: 'string' },
            { name: 'mediaCid', value: batchData.mediaCid, type: 'string' },
            { name: 'labTestCidHash', value: batchData.labTestCidHash || zeroBytes32, type: 'bytes32' }
        ]);

        // Publish data AND emit event atomically
        const txHash = await this.sdk.streams.setAndEmitEvents(
            [{ id: batchData.batchId, schemaId: schemaId!, data }],
            [{
                id: schemas.EVENT_IDS.NEW_BATCH,
                argumentTopics: [batchData.batchId, batchData.farmerId],
                data: '0x'
            }]
        );

        console.log(`📦 Batch published: ${batchData.batchId} (Tx: ${txHash})`);
        return txHash;
    }

    /**
     * Publish auction creation/update
     */
    async publishAuction(auctionData: {
        auctionId: Hex;
        batchId: Hex;
        farmerId: Hex;
        startTimestamp: bigint;
        endTimestamp: bigint;
        startingPrice: bigint;
        reservePrice: bigint;
        highestBid: bigint;
        highestBidder: `0x${string}`;
        status: number;
        deliveryLocationHash: string;
    }) {
        const encoder = this.schemaEncoders.get(schemas.SCHEMA_IDS.AUCTION)!;
        const schemaId = await this.sdk.streams.computeSchemaId(schemas.AUCTION_SCHEMA);

        const data = encoder.encodeData([
            { name: 'auctionId', value: auctionData.auctionId, type: 'bytes32' },
            { name: 'batchId', value: auctionData.batchId, type: 'bytes32' },
            { name: 'farmerId', value: auctionData.farmerId, type: 'bytes32' },
            { name: 'startTimestamp', value: auctionData.startTimestamp.toString(), type: 'uint64' },
            { name: 'endTimestamp', value: auctionData.endTimestamp.toString(), type: 'uint64' },
            { name: 'startingPrice', value: auctionData.startingPrice.toString(), type: 'uint256' },
            { name: 'reservePrice', value: auctionData.reservePrice.toString(), type: 'uint256' },
            { name: 'highestBid', value: auctionData.highestBid.toString(), type: 'uint256' },
            { name: 'highestBidder', value: auctionData.highestBidder, type: 'address' },
            { name: 'status', value: auctionData.status.toString(), type: 'uint8' },
            { name: 'deliveryLocationHash', value: auctionData.deliveryLocationHash, type: 'string' }
        ]);

        const txHash = await this.sdk.streams.set([
            { id: auctionData.auctionId, schemaId: schemaId!, data }
        ]);

        console.log(`🎯 Auction published: ${auctionData.auctionId}`);
        return txHash;
    }

    /**
     * Publish new bid
     */
    async publishBid(bidData: {
        auctionId: Hex;
        bidder: `0x${string}`;
        amount: bigint;
        timestamp: bigint;
        isWinning: boolean;
    }) {
        const encoder = this.schemaEncoders.get(schemas.SCHEMA_IDS.BID)!;
        const schemaId = await this.sdk.streams.computeSchemaId(schemas.BID_SCHEMA);

        const bidId = toHex(`${bidData.auctionId}-${bidData.timestamp}`, { size: 32 });

        const data = encoder.encodeData([
            { name: 'auctionId', value: bidData.auctionId, type: 'bytes32' },
            { name: 'bidder', value: bidData.bidder, type: 'address' },
            { name: 'amount', value: bidData.amount.toString(), type: 'uint256' },
            { name: 'timestamp', value: bidData.timestamp.toString(), type: 'uint64' },
            { name: 'isWinning', value: bidData.isWinning, type: 'bool' }
        ]);

        // Emit bid event for real-time notifications
        const txHash = await this.sdk.streams.setAndEmitEvents(
            [{ id: bidId, schemaId: schemaId!, data }],
            [{
                id: schemas.EVENT_IDS.NEW_BID,
                argumentTopics: [bidData.auctionId, toHex(bidData.bidder)],
                data: toHex(bidData.amount)
            }]
        );

        console.log(`💰 Bid published: ${bidData.amount} on ${bidData.auctionId}`);
        return txHash;
    }

    /**
     * Publish quality feedback
     */
    async publishFeedback(feedbackData: {
        batchId: Hex;
        auctionId: Hex;
        farmerId: Hex;
        buyer: `0x${string}`;
        qualityScore: number;
        comment: string;
        timestamp: bigint;
    }) {
        const encoder = this.schemaEncoders.get(schemas.SCHEMA_IDS.FEEDBACK)!;
        const schemaId = await this.sdk.streams.computeSchemaId(schemas.FEEDBACK_SCHEMA);

        const feedbackId = toHex(`${feedbackData.batchId}-${feedbackData.buyer}`, { size: 32 });

        const data = encoder.encodeData([
            { name: 'batchId', value: feedbackData.batchId, type: 'bytes32' },
            { name: 'auctionId', value: feedbackData.auctionId, type: 'bytes32' },
            { name: 'farmerId', value: feedbackData.farmerId, type: 'bytes32' },
            { name: 'buyer', value: feedbackData.buyer, type: 'address' },
            { name: 'qualityScore', value: feedbackData.qualityScore.toString(), type: 'uint8' },
            { name: 'comment', value: feedbackData.comment, type: 'string' },
            { name: 'timestamp', value: feedbackData.timestamp.toString(), type: 'uint64' }
        ]);

        const txHash = await this.sdk.streams.set([
            { id: feedbackId, schemaId: schemaId!, data }
        ]);

        console.log(`⭐ Feedback published for batch: ${feedbackData.batchId}`);
        return txHash;
    }

    // ============ SUBSCRIBE METHODS ============

    /**
     * Subscribe to new batches
     */
    async subscribeToNewBatches(
        onBatch: (batch: any) => void,
        filters?: { region?: string; cropType?: string }
    ) {
        const subscription = await this.sdk.streams.subscribe({
            somniaStreamsEventId: schemas.EVENT_IDS.NEW_BATCH,
            ethCalls: [],
            onData: (data) => {
                // TODO: Apply filters
                onBatch(data);
            },
            onError: (error) => console.error('Batch subscription error:', error),
            onlyPushChanges: true
        });

        console.log(`👂 Subscribed to new batches: ${subscription?.subscriptionId}`);
        return subscription;
    }

    /**
     * Subscribe to auction bids
     */
    async subscribeToAuctionBids(
        auctionId: Hex,
        onBid: (bid: any) => void
    ) {
        const subscription = await this.sdk.streams.subscribe({
            somniaStreamsEventId: schemas.EVENT_IDS.NEW_BID,
            ethCalls: [],
            context: 'topic1', // Filter by auctionId
            onData: (data) => {
                // Filter for specific auction
                if (data.topics?.[1] === auctionId) {
                    onBid(data);
                }
            },
            onError: (error) => console.error('Bid subscription error:', error),
            onlyPushChanges: true
        });

        console.log(`👂 Subscribed to auction bids: ${auctionId}`);
        return subscription;
    }

    // ============ READ METHODS ============

    /**
     * Get batch by ID
     */
    async getBatch(batchId: Hex, publisher: `0x${string}`) {
        const schemaId = await this.sdk.streams.computeSchemaId(schemas.BATCH_SCHEMA);
        const data = await this.sdk.streams.getByKey(schemaId!, publisher, batchId);
        return data;
    }

    /**
     * Get all active auctions
     */
    async getActiveAuctions(publisher: `0x${string}`) {
        const schemaId = await this.sdk.streams.computeSchemaId(schemas.AUCTION_SCHEMA);
        const allAuctions = await this.sdk.streams.getAllPublisherDataForSchema(schemaId!, publisher);

        // Filter for active (status === 0)
        return allAuctions; // TODO: Filter by status
    }

    /**
     * Get farmer reputation
     */
    async getFarmerReputation(farmerId: Hex, publisher: `0x${string}`) {
        const schemaId = await this.sdk.streams.computeSchemaId(schemas.FARMER_REPUTATION_SCHEMA);
        const data = await this.sdk.streams.getByKey(schemaId!, publisher, farmerId);
        return data;
    }
}
