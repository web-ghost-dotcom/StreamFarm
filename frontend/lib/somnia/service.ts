import { SDK, SchemaEncoder, zeroBytes32 } from '@somnia-chain/streams';
import { createPublicClient, createWalletClient, http, type Hex, toHex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { defineChain } from 'viem';
import * as schemas from './schemas';

// Define Somnia Testnet chain
export const somniaTestnet = defineChain({
    id: 50311,
    name: 'Somnia Testnet',
    network: 'somnia-testnet',
    nativeCurrency: { name: 'STT', symbol: 'STT', decimals: 18 },
    rpcUrls: {
        default: { http: ['https://dream-rpc.somnia.network'] },
        public: { http: ['https://dream-rpc.somnia.network'] },
    },
    blockExplorers: {
        default: { name: 'Explorer', url: 'https://explorer-testnet.somnia.network' },
    },
});

/**
 * Somnia Streams Service (Server-side only)
 * Use in API routes and Server Actions
 */
export class SomniaStreamsService {
    private sdk: SDK;
    private schemaEncoders: Map<string, SchemaEncoder> = new Map();

    constructor(privateKey: `0x${string}`) {
        const account = privateKeyToAccount(privateKey);
        const rpcUrl = process.env.SOMNIA_RPC_HTTP || 'https://dream-rpc.somnia.network';

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
     * Initialize schemas (call once on app startup)
     */
    async initialize() {
        console.log('🔄 Initializing Somnia Data Streams...');

        // Register data schemas
        await this.registerSchemas();

        // Register event schemas
        await this.registerEvents();

        // Create encoders
        this.createEncoders();

        console.log('✅ Somnia Data Streams ready');
    }

    private async registerSchemas() {
        const schemaRegistrations = [
            { id: schemas.SCHEMA_IDS.BATCH, schema: schemas.BATCH_SCHEMA },
            { id: schemas.SCHEMA_IDS.AUCTION, schema: schemas.AUCTION_SCHEMA },
            { id: schemas.SCHEMA_IDS.BID, schema: schemas.BID_SCHEMA },
            { id: schemas.SCHEMA_IDS.FEEDBACK, schema: schemas.FEEDBACK_SCHEMA },
            { id: schemas.SCHEMA_IDS.FARMER_REP, schema: schemas.FARMER_REPUTATION_SCHEMA },
            { id: schemas.SCHEMA_IDS.BUYER_REP, schema: schemas.BUYER_REPUTATION_SCHEMA },
        ];

        try {
            await this.sdk.streams.registerDataSchemas(
                schemaRegistrations.map(s => ({
                    id: s.id,
                    schema: s.schema,
                    parentSchemaId: zeroBytes32 as `0x${string}`,
                    schemaName: s.id
                })),
                true // Ignore if already registered
            );
        } catch (error) {
            console.error('Schema registration error:', error);
        }
    }

    private async registerEvents() {
        const events = [
            schemas.NEW_BATCH_EVENT,
            schemas.NEW_BID_EVENT,
            schemas.AUCTION_CLOSED_EVENT,
            schemas.BATCH_SOLD_EVENT
        ];

        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await this.sdk.streams.registerEventSchemas(events as any);
        } catch {
            // Ignore if already registered
        }
    }

    private createEncoders() {
        this.schemaEncoders.set(schemas.SCHEMA_IDS.BATCH, new SchemaEncoder(schemas.BATCH_SCHEMA));
        this.schemaEncoders.set(schemas.SCHEMA_IDS.AUCTION, new SchemaEncoder(schemas.AUCTION_SCHEMA));
        this.schemaEncoders.set(schemas.SCHEMA_IDS.BID, new SchemaEncoder(schemas.BID_SCHEMA));
        this.schemaEncoders.set(schemas.SCHEMA_IDS.FEEDBACK, new SchemaEncoder(schemas.FEEDBACK_SCHEMA));
    }

    // ============ PUBLISH METHODS ============

    async publishBatch(batch: schemas.BatchData) {
        const encoder = this.schemaEncoders.get(schemas.SCHEMA_IDS.BATCH)!;
        const schemaIdResult = await this.sdk.streams.computeSchemaId(schemas.BATCH_SCHEMA);
        const schemaId = (typeof schemaIdResult === 'string' ? schemaIdResult : '') as `0x${string}`;

        const data = encoder.encodeData([
            { name: 'batchId', value: batch.batchId, type: 'bytes32' },
            { name: 'harvestTimestamp', value: batch.harvestTimestamp.toString(), type: 'uint64' },
            { name: 'cropType', value: batch.cropType, type: 'string' },
            { name: 'weightKg', value: batch.weightKg.toString(), type: 'uint32' },
            { name: 'qualityGrade', value: batch.qualityGrade.toString(), type: 'uint8' },
            { name: 'farmerId', value: batch.farmerId, type: 'bytes32' },
            { name: 'locationHash', value: batch.locationHash, type: 'string' },
            { name: 'mediaCid', value: batch.mediaCid, type: 'string' },
            { name: 'labTestCidHash', value: batch.labTestCidHash || zeroBytes32, type: 'bytes32' }
        ]);

        return await this.sdk.streams.setAndEmitEvents(
            [{ id: batch.batchId, schemaId, data }],
            [{
                id: schemas.EVENT_IDS.NEW_BATCH,
                argumentTopics: [batch.batchId, batch.farmerId],
                data: '0x'
            }]
        );
    }

    async publishAuction(auction: schemas.AuctionData) {
        const encoder = this.schemaEncoders.get(schemas.SCHEMA_IDS.AUCTION)!;
        const schemaIdResult = await this.sdk.streams.computeSchemaId(schemas.AUCTION_SCHEMA);
        const schemaId = (typeof schemaIdResult === 'string' ? schemaIdResult : '') as `0x${string}`;

        const data = encoder.encodeData([
            { name: 'auctionId', value: auction.auctionId, type: 'bytes32' },
            { name: 'batchId', value: auction.batchId, type: 'bytes32' },
            { name: 'farmerId', value: auction.farmerId, type: 'bytes32' },
            { name: 'startTimestamp', value: auction.startTimestamp.toString(), type: 'uint64' },
            { name: 'endTimestamp', value: auction.endTimestamp.toString(), type: 'uint64' },
            { name: 'startingPrice', value: auction.startingPrice.toString(), type: 'uint256' },
            { name: 'reservePrice', value: auction.reservePrice.toString(), type: 'uint256' },
            { name: 'highestBid', value: auction.highestBid.toString(), type: 'uint256' },
            { name: 'highestBidder', value: auction.highestBidder, type: 'address' },
            { name: 'status', value: auction.status.toString(), type: 'uint8' },
            { name: 'deliveryLocationHash', value: auction.deliveryLocationHash, type: 'string' }
        ]);

        return await this.sdk.streams.set([
            { id: auction.auctionId, schemaId, data }
        ]);
    }

    async publishBid(bid: schemas.BidData) {
        const encoder = this.schemaEncoders.get(schemas.SCHEMA_IDS.BID)!;
        const schemaIdResult = await this.sdk.streams.computeSchemaId(schemas.BID_SCHEMA);
        const schemaId = (typeof schemaIdResult === 'string' ? schemaIdResult : '') as `0x${string}`;

        const bidId = toHex(`${bid.auctionId}-${bid.timestamp}`, { size: 32 });

        const data = encoder.encodeData([
            { name: 'auctionId', value: bid.auctionId, type: 'bytes32' },
            { name: 'bidder', value: bid.bidder, type: 'address' },
            { name: 'amount', value: bid.amount.toString(), type: 'uint256' },
            { name: 'timestamp', value: bid.timestamp.toString(), type: 'uint64' },
            { name: 'isWinning', value: bid.isWinning, type: 'bool' }
        ]);

        return await this.sdk.streams.setAndEmitEvents(
            [{ id: bidId, schemaId, data }],
            [{
                id: schemas.EVENT_IDS.NEW_BID,
                argumentTopics: [bid.auctionId, toHex(bid.bidder)],
                data: toHex(bid.amount)
            }]
        );
    }

    // ============ READ METHODS ============

    async getBatch(batchId: Hex, publisher: `0x${string}`) {
        const schemaIdResult = await this.sdk.streams.computeSchemaId(schemas.BATCH_SCHEMA);
        const schemaId = (typeof schemaIdResult === 'string' ? schemaIdResult : '') as `0x${string}`;
        return await this.sdk.streams.getByKey(schemaId, publisher, batchId);
    }

    async getActiveAuctions(publisher: `0x${string}`) {
        const schemaIdResult = await this.sdk.streams.computeSchemaId(schemas.AUCTION_SCHEMA);
        const schemaId = (typeof schemaIdResult === 'string' ? schemaIdResult : '') as `0x${string}`;
        return await this.sdk.streams.getAllPublisherDataForSchema(schemaId, publisher);
    }
}

// Singleton instance (server-side only)
let somniaService: SomniaStreamsService | null = null;

export function getSomniaService() {
    if (!somniaService) {
        const privateKey = process.env.BACKEND_PRIVATE_KEY as `0x${string}`;
        if (!privateKey) {
            throw new Error('BACKEND_PRIVATE_KEY not set');
        }
        somniaService = new SomniaStreamsService(privateKey);
    }
    return somniaService;
}
