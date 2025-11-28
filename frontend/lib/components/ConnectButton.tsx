'use client'

import { useAppKit, useAppKitAccount, useAppKitProvider } from '@reown/appkit/react'

export function ConnectButton() {
    const { open } = useAppKit()
    const { address, isConnected } = useAppKitAccount()

    return (
        <div className="flex items-center gap-4">
            {isConnected && address ? (
                <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">
                        {address.slice(0, 6)}...{address.slice(-4)}
                    </span>
                    <button
                        onClick={() => open()}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        Account
                    </button>
                </div>
            ) : (
                <button
                    onClick={() => open()}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                    Connect Wallet
                </button>
            )}
        </div>
    )
}

// Hook to get wallet info
export function useWallet() {
    const { address, isConnected } = useAppKitAccount()
    const { walletProvider } = useAppKitProvider('eip155')

    return {
        address,
        isConnected,
        walletProvider,
    }
}
