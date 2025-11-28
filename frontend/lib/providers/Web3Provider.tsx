'use client'

import { createAppKit } from '@reown/appkit/react'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { defineChain } from 'viem'

// Define Somnia testnet
const somniaTestnet = defineChain({
    id: 50312,
    name: 'Somnia Testnet',
    network: 'somnia-testnet',
    nativeCurrency: {
        decimals: 18,
        name: 'STT',
        symbol: 'STT',
    },
    rpcUrls: {
        default: {
            http: ['https://dream-rpc.somnia.network/'],
            webSocket: ['wss://dream-rpc.somnia.network/ws'],
        },
        public: {
            http: ['https://dream-rpc.somnia.network/'],
            webSocket: ['wss://dream-rpc.somnia.network/ws'],
        },
    },
    blockExplorers: {
        default: {
            name: 'Somnia Explorer',
            url: 'https://shannon-explorer.somnia.network',
        },
    },
    testnet: true,
})

// Get projectId from environment
const projectId = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID

if (!projectId) {
    throw new Error('NEXT_PUBLIC_REOWN_PROJECT_ID is not set')
}

// Create wagmi config
const wagmiAdapter = new WagmiAdapter({
    networks: [somniaTestnet],
    projectId,
})

// Create modal
createAppKit({
    adapters: [wagmiAdapter],
    networks: [somniaTestnet],
    projectId,
    metadata: {
        name: 'StreamFarm',
        description: 'Real-time agricultural trading platform powered by Somnia Data Streams',
        url: typeof window !== 'undefined' ? window.location.origin : 'https://streamfarm.app',
        icons: ['https://avatars.githubusercontent.com/u/37784886'],
    },
    features: {
        analytics: true,
        email: false,
        socials: false,
    },
    themeMode: 'dark',
    allWallets: 'SHOW',
    featuredWalletIds: [
        'c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96', // MetaMask
        '4622a2b2d6af1c9844944291e5e7351a6aa24cd7b23099efac1b2fd875da31a0', // Trust Wallet
    ],
})

// Create query client
const queryClient = new QueryClient()

export function Web3Provider({ children }: { children: React.ReactNode }) {
    return (
        <WagmiProvider config={wagmiAdapter.wagmiConfig}>
            <QueryClientProvider client={queryClient}>
                {children}
            </QueryClientProvider>
        </WagmiProvider>
    )
}
