'use client';

import { useEffect, useState } from 'react';
import { useAccount, useWalletClient, usePublicClient } from 'wagmi';
import { contracts } from '@/lib/contracts/config';
import { keccak256, toBytes, parseUnits, createPublicClient, http, formatUnits, type Address } from 'viem';
import { defineChain } from 'viem';

const somniaTestnet = defineChain({
    id: 50312,
    name: 'Somnia Testnet',
    nativeCurrency: { name: 'STT', symbol: 'STT', decimals: 18 },
    rpcUrls: {
        default: { http: [process.env.NEXT_PUBLIC_RPC_URL || 'https://dream-rpc.somnia.network/'] }
    }
});

const publicClientStatic = createPublicClient({
    chain: somniaTestnet,
    transport: http()
});

/**
 * Custom hook for interacting with smart contracts using client-side wallet signing
 */
export function useContractWrite() {
    const { address } = useAccount();
    const { data: walletClient } = useWalletClient();
    const publicClient = usePublicClient();

    /**
     * Register a new batch on-chain
     */
    const registerBatch = async (params: {
        batchId: string;
        farmerId: string;
        cropType: string;
        weightKg: number;
        qualityGrade: number;
        locationHash: string;
        mediaCid: string;
        harvestTimestamp?: number; // Optional, defaults to current time
    }) => {
        if (!walletClient || !publicClient) {
            throw new Error('Wallet not connected');
        }

        try {
            const batchIdHash = keccak256(toBytes(params.batchId));
            const farmerIdHash = keccak256(toBytes(params.farmerId));
            const harvestTimestamp = params.harvestTimestamp || Math.floor(Date.now() / 1000);

            const { request } = await publicClient.simulateContract({
                address: contracts.batchRegistry.address,
                abi: contracts.batchRegistry.abi,
                functionName: 'registerBatch',
                args: [
                    batchIdHash,
                    BigInt(harvestTimestamp),
                    params.cropType,
                    BigInt(params.weightKg),
                    BigInt(params.qualityGrade),
                    farmerIdHash,
                    params.locationHash,
                    params.mediaCid,
                ],
                account: walletClient.account,
            });

            const hash = await walletClient.writeContract(request);
            const receipt = await publicClient.waitForTransactionReceipt({ hash });

            return {
                success: true,
                txHash: hash,
                batchId: batchIdHash,
                blockNumber: receipt.blockNumber,
            };
        } catch (error) {
            console.error('registerBatch error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    };

    /**
     * Create an auction for a batch
     */
    const createAuction = async (params: {
        auctionId: string;
        batchId: `0x${string}`;
        farmerId: string;
        durationSeconds: number;
        startingPrice: string;
        reservePrice: string;
        deliveryLocationHash: string;
    }) => {
        if (!walletClient || !publicClient) {
            throw new Error('Wallet not connected');
        }

        try {
            const auctionIdHash = keccak256(toBytes(params.auctionId));
            const farmerIdHash = keccak256(toBytes(params.farmerId));

            const { request } = await publicClient.simulateContract({
                address: contracts.auctionManager.address,
                abi: contracts.auctionManager.abi,
                functionName: 'createAuction',
                args: [
                    auctionIdHash,
                    params.batchId,
                    farmerIdHash,
                    BigInt(params.durationSeconds),
                    parseUnits(params.startingPrice, 6),
                    parseUnits(params.reservePrice, 6),
                    params.deliveryLocationHash,
                ],
                account: walletClient.account,
            });

            const hash = await walletClient.writeContract(request);
            const receipt = await publicClient.waitForTransactionReceipt({ hash });

            return {
                success: true,
                txHash: hash,
                auctionId: auctionIdHash,
                blockNumber: receipt.blockNumber,
            };
        } catch (error) {
            console.error('createAuction error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    };

    /**
     * Place a bid on an auction
     */
    const placeBid = async (params: {
        auctionId: `0x${string}`;
        bidAmount: string;
    }) => {
        if (!walletClient || !publicClient) {
            throw new Error('Wallet not connected');
        }

        try {
            // First approve stablecoin spending
            const approveRequest = await publicClient.simulateContract({
                address: contracts.stablecoin.address,
                abi: contracts.stablecoin.abi,
                functionName: 'approve',
                args: [contracts.auctionManager.address, parseUnits(params.bidAmount, 6)],
                account: walletClient.account,
            });

            const approveHash = await walletClient.writeContract(approveRequest.request);
            await publicClient.waitForTransactionReceipt({ hash: approveHash });

            // Then place the bid
            const { request } = await publicClient.simulateContract({
                address: contracts.auctionManager.address,
                abi: contracts.auctionManager.abi,
                functionName: 'placeBid',
                args: [params.auctionId, parseUnits(params.bidAmount, 6)],
                account: walletClient.account,
            });

            const hash = await walletClient.writeContract(request);
            const receipt = await publicClient.waitForTransactionReceipt({ hash });

            return {
                success: true,
                txHash: hash,
                blockNumber: receipt.blockNumber,
            };
        } catch (error) {
            console.error('placeBid error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    };

    /**
     * End an auction
     */
    const endAuction = async (auctionId: `0x${string}`) => {
        if (!walletClient || !publicClient) {
            throw new Error('Wallet not connected');
        }

        try {
            const { request } = await publicClient.simulateContract({
                address: contracts.auctionManager.address,
                abi: contracts.auctionManager.abi,
                functionName: 'endAuction',
                args: [auctionId],
                account: walletClient.account,
            });

            const hash = await walletClient.writeContract(request);
            const receipt = await publicClient.waitForTransactionReceipt({ hash });

            return {
                success: true,
                txHash: hash,
                blockNumber: receipt.blockNumber,
            };
        } catch (error) {
            console.error('endAuction error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    };

    return {
        address,
        isConnected: !!address,
        registerBatch,
        createAuction,
        placeBid,
        endAuction,
    };
}

// Keep existing read-only hooks below
export function useBatch(batchId: `0x${string}` | null) {
    const [batch, setBatch] = useState<Record<string, unknown> | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!batchId) return;

        async function fetchBatch() {
            setLoading(true);
            try {
                const data = await publicClientStatic.readContract({
                    address: contracts.batchRegistry.address,
                    abi: contracts.batchRegistry.abi,
                    functionName: 'batches',
                    args: [batchId]
                });

                setBatch(data as Record<string, unknown>);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to fetch batch');
            } finally {
                setLoading(false);
            }
        }

        fetchBatch();
    }, [batchId]);

    return { batch, loading, error };
}

/**
 * Hook to read auction data from contract
 */
export function useAuction(auctionId: `0x${string}` | null) {
    const [auction, setAuction] = useState<Record<string, unknown> | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!auctionId) return;

        async function fetchAuction() {
            setLoading(true);
            try {
                const data = await publicClientStatic.readContract({
                    address: contracts.auctionManager.address,
                    abi: contracts.auctionManager.abi,
                    functionName: 'getAuction',
                    args: [auctionId]
                });

                setAuction(data as Record<string, unknown>);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to fetch auction');
            } finally {
                setLoading(false);
            }
        }

        fetchAuction();
    }, [auctionId]);

    return { auction, loading, error };
}

/**
 * Hook to check if auction is active
 */
export function useIsAuctionActive(auctionId: `0x${string}` | null) {
    const [isActive, setIsActive] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!auctionId) return;

        async function checkActive() {
            setLoading(true);
            try {
                const active = await publicClientStatic.readContract({
                    address: contracts.auctionManager.address,
                    abi: contracts.auctionManager.abi,
                    functionName: 'isAuctionActive',
                    args: [auctionId]
                });

                setIsActive(active as boolean);
            } catch (err) {
                console.error('Failed to check auction status:', err);
            } finally {
                setLoading(false);
            }
        }

        checkActive();
    }, [auctionId]);

    return { isActive, loading };
}

/**
 * Hook to get stablecoin balance
 */
export function useStablecoinBalance(address: Address | null) {
    const [balance, setBalance] = useState<string>('0');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!address) return;

        async function fetchBalance() {
            setLoading(true);
            try {
                const bal = await publicClientStatic.readContract({
                    address: contracts.stablecoin.address,
                    abi: contracts.stablecoin.abi,
                    functionName: 'balanceOf',
                    args: [address]
                });

                setBalance(formatUnits(bal as bigint, 6));
            } catch (err) {
                console.error('Failed to fetch balance:', err);
            } finally {
                setLoading(false);
            }
        }

        fetchBalance();
        const interval = setInterval(fetchBalance, 10000); // Refresh every 10s
        return () => clearInterval(interval);
    }, [address]);

    return { balance, loading };
}

/**
 * Hook to get reputation score
 */
export function useReputationScore(userId: `0x${string}` | null) {
    const [score, setScore] = useState<Record<string, unknown> | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!userId) return;

        async function fetchScore() {
            setLoading(true);
            try {
                const data = await publicClientStatic.readContract({
                    address: contracts.reputationSystem.address,
                    abi: contracts.reputationSystem.abi,
                    functionName: 'reputationScores',
                    args: [userId]
                });

                setScore(data as Record<string, unknown>);
            } catch (err) {
                console.error('Failed to fetch reputation:', err);
            } finally {
                setLoading(false);
            }
        }

        fetchScore();
    }, [userId]);

    return { score, loading };
}

/**
 * Hook to fetch all active auctions from the blockchain
 * Uses the new getAllActiveAuctions() function instead of event logs
 */
export function useAllAuctions() {
    const [auctions, setAuctions] = useState<Record<string, unknown>[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [refetchTrigger, setRefetchTrigger] = useState(0);

    useEffect(() => {
        async function fetchAuctions() {
            setLoading(true);
            try {
                // Use the new contract function to get all active auctions directly
                const activeAuctions = await publicClientStatic.readContract({
                    address: contracts.auctionManager.address,
                    abi: contracts.auctionManager.abi,
                    functionName: 'getActiveAuctions',
                    args: []
                }) as unknown[];

                console.log('Fetched auctions from contract:', activeAuctions);

                // Transform BigInt values to strings for frontend compatibility
                const transformedAuctions = activeAuctions.map((auction: unknown) => {
                    const auctionData = auction as Record<string, unknown>;
                    return {
                        ...auctionData,
                        startTimestamp: (auctionData.startTimestamp as bigint)?.toString() || '0',
                        endTimestamp: (auctionData.endTimestamp as bigint)?.toString() || '0',
                        startingPrice: (auctionData.startingPrice as bigint)?.toString() || '0',
                        reservePrice: (auctionData.reservePrice as bigint)?.toString() || '0',
                        highestBid: (auctionData.highestBid as bigint)?.toString() || '0',
                    };
                });

                console.log('Transformed auctions:', transformedAuctions);
                setAuctions(transformedAuctions);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to fetch auctions');
                console.error('Failed to fetch auctions:', err);
            } finally {
                setLoading(false);
            }
        }

        fetchAuctions();
    }, [refetchTrigger]);

    const refetch = () => setRefetchTrigger(prev => prev + 1);

    return { auctions, loading, error, refetch };
}

/**
 * Hook to watch for new auction events
 */
export function useAuctionEvents() {
    const [events, setEvents] = useState<Record<string, unknown>[]>([]);

    useEffect(() => {
        const unwatch = publicClientStatic.watchContractEvent({
            address: contracts.auctionManager.address,
            abi: contracts.auctionManager.abi,
            eventName: 'AuctionCreated',
            onLogs: (logs) => {
                setEvents((prev) => [...logs, ...prev]);
            }
        });

        return () => {
            unwatch();
        };
    }, []);

    return events;
}

/**
 * Hook to watch for new bids
 */
export function useNewBidEvents(auctionId: `0x${string}` | null) {
    const [bids, setBids] = useState<Record<string, unknown>[]>([]);

    useEffect(() => {
        if (!auctionId) return;

        const unwatch = publicClientStatic.watchContractEvent({
            address: contracts.auctionManager.address,
            abi: contracts.auctionManager.abi,
            eventName: 'NewBid',
            args: { auctionId },
            onLogs: (logs) => {
                setBids((prev) => [...logs, ...prev]);
            }
        });

        return () => {
            unwatch();
        };
    }, [auctionId]);

    return bids;
}

/**
 * Hook to get user's STT balance
 */
export function useSTTBalance(address: `0x${string}` | undefined) {
    const [balance, setBalance] = useState<string>('0');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!address) return;

        async function fetchBalance() {
            setLoading(true);
            try {
                const bal = await publicClientStatic.getBalance({ address: address as `0x${string}` });
                setBalance(formatUnits(bal, 18));
            } catch (err) {
                console.error('Failed to fetch balance:', err);
            } finally {
                setLoading(false);
            }
        }

        fetchBalance();

        // Refresh balance every 10 seconds
        const interval = setInterval(fetchBalance, 10000);
        return () => clearInterval(interval);
    }, [address]);

    return { balance, loading };
}

/**
 * Hook to get user's transaction count
 */
export function useTransactionCount(address: `0x${string}` | undefined) {
    const [count, setCount] = useState<number>(0);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!address) return;

        async function fetchCount() {
            setLoading(true);
            try {
                const txCount = await publicClientStatic.getTransactionCount({ address: address as `0x${string}` });
                setCount(txCount);
            } catch (err) {
                console.error('Failed to fetch transaction count:', err);
            } finally {
                setLoading(false);
            }
        }

        fetchCount();

        // Refresh every 15 seconds
        const interval = setInterval(fetchCount, 15000);
        return () => clearInterval(interval);
    }, [address]);

    return { count, loading };
}
