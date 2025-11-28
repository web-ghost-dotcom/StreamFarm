'use client';

import { useEffect, useState, useCallback } from 'react';
import { createPublicClient, http, parseAbiItem, Hex } from 'viem';
import { defineChain } from 'viem';

const somniaTestnet = defineChain({
    id: 50311,
    name: 'Somnia Testnet',
    nativeCurrency: { name: 'STT', symbol: 'STT', decimals: 18 },
    rpcUrls: {
        default: { http: ['https://dream-rpc.somnia.network'] }
    }
});

interface AuctionUpdate {
    auctionId: bigint;
    bidder: string;
    amount: bigint;
    timestamp: bigint;
}

interface BatchUpdate {
    batchId: Hex;
    farmerId: string;
    cropType: string;
    timestamp: bigint;
}

/**
 * Hook to subscribe to new auction events in real-time
 */
export function useAuctionUpdates(auctionManagerAddress?: `0x${string}`) {
    const [updates, setUpdates] = useState<AuctionUpdate[]>([]);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        if (!auctionManagerAddress) return;

        const client = createPublicClient({
            chain: somniaTestnet,
            transport: http()
        });

        // Watch for BidPlaced events
        const unwatch = client.watchEvent({
            address: auctionManagerAddress,
            event: parseAbiItem('event BidPlaced(uint256 indexed auctionId, address indexed bidder, uint256 amount, uint256 timestamp)'),
            onLogs: (logs) => {
                const newUpdates = logs.map((log) => ({
                    auctionId: log.args.auctionId!,
                    bidder: log.args.bidder!,
                    amount: log.args.amount!,
                    timestamp: log.args.timestamp!
                }));

                setUpdates((prev) => [...newUpdates, ...prev]);
                setIsConnected(true);
            },
            onError: (error) => {
                console.error('Auction subscription error:', error);
                setIsConnected(false);
            }
        });

        return () => {
            unwatch();
            setIsConnected(false);
        };
    }, [auctionManagerAddress]);

    return { updates, isConnected };
}

/**
 * Hook to subscribe to new batch registrations
 */
export function useBatchUpdates(batchRegistryAddress?: `0x${string}`) {
    const [batches, setBatches] = useState<BatchUpdate[]>([]);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        if (!batchRegistryAddress) return;

        const client = createPublicClient({
            chain: somniaTestnet,
            transport: http()
        });

        const unwatch = client.watchEvent({
            address: batchRegistryAddress,
            event: parseAbiItem('event BatchRegistered(bytes32 indexed batchId, address indexed farmerId, string cropType, uint256 timestamp)'),
            onLogs: (logs) => {
                const newBatches = logs.map((log) => ({
                    batchId: log.args.batchId!,
                    farmerId: log.args.farmerId!,
                    cropType: log.args.cropType!,
                    timestamp: log.args.timestamp!
                }));

                setBatches((prev) => [...newBatches, ...prev]);
                setIsConnected(true);
            },
            onError: (error) => {
                console.error('Batch subscription error:', error);
                setIsConnected(false);
            }
        });

        return () => {
            unwatch();
            setIsConnected(false);
        };
    }, [batchRegistryAddress]);

    return { batches, isConnected };
}

/**
 * Hook to subscribe to auction status changes
 */
export function useAuctionStatus(
    auctionManagerAddress?: `0x${string}`,
    auctionId?: bigint
) {
    const [status, setStatus] = useState<{
        isActive: boolean;
        highestBid: bigint;
        highestBidder: string;
    } | null>(null);

    const fetchStatus = useCallback(async () => {
        if (!auctionManagerAddress || auctionId === undefined) return;

        const client = createPublicClient({
            chain: somniaTestnet,
            transport: http()
        });

        // Read auction status from contract
        // This is a simplified version - you'll need the full ABI
        try {
            const result = await client.readContract({
                address: auctionManagerAddress,
                abi: [{
                    name: 'getAuction',
                    type: 'function',
                    stateMutability: 'view',
                    inputs: [{ name: 'auctionId', type: 'uint256' }],
                    outputs: [
                        { name: 'highestBid', type: 'uint256' },
                        { name: 'highestBidder', type: 'address' },
                        { name: 'status', type: 'uint8' }
                    ]
                }],
                functionName: 'getAuction',
                args: [auctionId]
            });

            setStatus({
                isActive: result[2] === 0, // Status 0 = Open
                highestBid: result[0],
                highestBidder: result[1] as string
            });
        } catch (error) {
            console.error('Failed to fetch auction status:', error);
        }
    }, [auctionManagerAddress, auctionId]);

    useEffect(() => {
        // Poll every 5 seconds
        const interval = setInterval(() => void fetchStatus(), 5000);

        return () => clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return status;
}
