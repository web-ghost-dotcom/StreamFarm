import BatchRegistryABI from './abis/BatchRegistry.json';
import AuctionManagerABI from './abis/AuctionManager.json';
import EscrowManagerABI from './abis/EscrowManager.json';
import ReputationSystemABI from './abis/ReputationSystem.json';
import MockStablecoinABI from './abis/MockStablecoin.json';

export const contracts = {
    batchRegistry: {
        address: process.env.NEXT_PUBLIC_BATCH_REGISTRY_ADDRESS as `0x${string}`,
        abi: BatchRegistryABI,
    },
    auctionManager: {
        address: process.env.NEXT_PUBLIC_AUCTION_MANAGER_ADDRESS as `0x${string}`,
        abi: AuctionManagerABI,
    },
    escrowManager: {
        address: process.env.NEXT_PUBLIC_ESCROW_MANAGER_ADDRESS as `0x${string}`,
        abi: EscrowManagerABI,
    },
    reputationSystem: {
        address: process.env.NEXT_PUBLIC_REPUTATION_SYSTEM_ADDRESS as `0x${string}`,
        abi: ReputationSystemABI,
    },
    stablecoin: {
        address: process.env.NEXT_PUBLIC_STABLECOIN_ADDRESS as `0x${string}`,
        abi: MockStablecoinABI,
    },
} as const;

export const CHAIN_ID = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || '50312');

// Deployment block numbers for event queries (to avoid querying from genesis)
// NOTE: New contracts use array storage, so event queries are no longer needed
export const DEPLOYMENT_BLOCKS = {
    batchRegistry: 232916377n, // Nov 19, 2025
    auctionManager: 232916377n, // Nov 19, 2025
    escrowManager: 232916377n, // Nov 19, 2025
    reputationSystem: 232916377n, // Nov 19, 2025
} as const;
export const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || 'https://dream-rpc.somnia.network/';
export const EXPLORER_URL = process.env.NEXT_PUBLIC_EXPLORER_URL || 'https://shannon-explorer.somnia.network';
