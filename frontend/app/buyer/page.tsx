'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuctionUpdates } from '@/lib/hooks/useRealtimeUpdates';
import { useContractWrite } from '@/lib/hooks/useContracts';
import { ConnectButton, useWallet } from '@/lib/components/ConnectButton';

interface Auction {
    auctionId: string;
    batchId: string;
    farmerId: string;
    startTimestamp: string;
    endTimestamp: string;
    startingPrice: string;
    reservePrice: string;
    highestBid: string;
    highestBidder: string;
    status: number;
    deliveryLocationHash: string;
}

export default function BuyerDashboard() {
    const [auctions, setAuctions] = useState<Auction[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedAuction, setSelectedAuction] = useState<Auction | null>(null);
    const { isConnected: walletConnected } = useWallet();
    const { placeBid } = useContractWrite();

    const auctionManagerAddress = process.env.NEXT_PUBLIC_AUCTION_MANAGER_ADDRESS as `0x${string}`;
    const { updates, isConnected } = useAuctionUpdates(auctionManagerAddress);

    // Fetch active auctions on mount
    useEffect(() => {
        fetchAuctions();
    }, []);

    // Update auctions when new bids come in
    useEffect(() => {
        if (updates.length > 0) {
            // Refresh auctions list when new bids detected
            fetchAuctions();
        }
    }, [updates]);

    const fetchAuctions = async () => {
        try {
            const response = await fetch(
                `/api/auctions?publisher=${process.env.NEXT_PUBLIC_PUBLISHER_ADDRESS}`
            );
            const data = await response.json();

            if (data.success) {
                setAuctions(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch auctions:', error);
        }
    };

    const handlePlaceBid = async (auctionId: string, bidAmount: string) => {
        setIsLoading(true);

        try {
            const result = await placeBid({
                auctionId: auctionId as `0x${string}`,
                bidAmount
            });

            if (!result.success) {
                alert('Bid placement failed: ' + result.error);
                return;
            }

            // Publish bid to Somnia Streams
            const response = await fetch('/api/bids', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    auctionId,
                    bidder: process.env.NEXT_PUBLIC_BUYER_ADDRESS,
                    amount: bidAmount
                })
            });

            const data = await response.json();

            if (data.success) {
                alert('Bid placed successfully! TX: ' + result.txHash);
                fetchAuctions(); // Refresh list
            }

        } catch (error) {
            console.error('Bid placement error:', error);
            alert('Failed to place bid');
        } finally {
            setIsLoading(false);
        }
    };

    const formatTimeRemaining = (endTimestamp: string) => {
        const end = parseInt(endTimestamp) * 1000;
        const now = Date.now();
        const diff = end - now;

        if (diff <= 0) return 'Ended';

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

        return `${hours}h ${minutes}m`;
    };

    return (
        <div className="min-h-screen relative">
            {/* Header */}
            <header className="bg-emerald-800/90 backdrop-blur-md border-b border-white/20 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
                    <Link href="/" className="text-xl font-semibold text-white drop-shadow-lg">
                        Agro-Data Streams
                    </Link>
                    <div className="flex items-center gap-6">
                        <nav className="flex gap-8">
                            <Link href="/farmer" className="text-sm text-emerald-200 hover:text-white transition-colors">
                                Farmers
                            </Link>
                            <Link href="/buyer" className="text-sm font-medium text-white border-b-2 border-white pb-1">
                                Buyers
                            </Link>
                            <Link href="/consumer" className="text-sm text-emerald-200 hover:text-white transition-colors">
                                Consumers
                            </Link>
                        </nav>
                        <ConnectButton />
                    </div>
                </div>
            </header>

            {!walletConnected ? (
                <div className="max-w-4xl mx-auto px-6 py-24 text-center relative z-10">
                    <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-12 shadow-xl border-2 border-emerald-800/20">
                        <div className="w-20 h-20 bg-emerald-800 rounded-full mx-auto mb-6 flex items-center justify-center">
                            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                        </div>
                        <h2 className="text-3xl font-bold text-gray-800 mb-4">Connect Your Wallet</h2>
                        <p className="text-gray-600 mb-8 max-w-md mx-auto">
                            Please connect your wallet to browse auctions and place bids.
                        </p>
                        <ConnectButton />
                    </div>
                </div>
            ) : (
                <div className="max-w-7xl mx-auto px-6 py-12 relative z-10">
                    <div className="flex justify-between items-center mb-12 animate-fade-in">
                        <h1 className="text-4xl font-bold text-white drop-shadow-lg">
                            Active Auctions
                        </h1>
                        <div className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full shadow-sm border border-white/20">
                            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-700 animate-pulse' : 'bg-gray-400'}`} />
                            <span className="text-sm text-white font-medium">
                                {isConnected ? 'Live' : 'Disconnected'}
                            </span>
                        </div>
                    </div>

                    {/* Active Auctions Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                        {auctions.map((auction) => {
                            const timeRemaining = formatTimeRemaining(auction.endTimestamp);
                            const isActive = auction.status === 0;

                            return (
                                <div
                                    key={auction.auctionId}
                                    className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] p-6 border-2 border-emerald-900/10 cursor-pointer animate-fade-in"
                                    onClick={() => setSelectedAuction(auction)}
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <h3 className="text-sm font-mono text-gray-700">#{auction.auctionId.slice(0, 8)}...</h3>
                                        <span className={`text-xs px-3 py-1 rounded-full font-medium ${isActive ? 'bg-emerald-900/10 text-green-700 border border-emerald-300' : 'bg-gray-100 text-gray-500 border border-gray-200'
                                            }`}>
                                            {isActive ? 'Active' : 'Closed'}
                                        </span>
                                    </div>

                                    <div className="space-y-3 text-sm mb-6">
                                        <div>
                                            <div className="text-gray-500 mb-1">Batch</div>
                                            <div className="font-mono text-xs text-gray-700">{auction.batchId.slice(0, 16)}...</div>
                                        </div>

                                        <div>
                                            <div className="text-gray-500 mb-1">Current Bid</div>
                                            <div className="font-bold text-lg text-emerald-900">
                                                {auction.highestBid !== '0'
                                                    ? `${(parseInt(auction.highestBid) / 1e6).toFixed(2)} USDC`
                                                    : `${(parseInt(auction.startingPrice) / 1e6).toFixed(2)} USDC`
                                                }
                                            </div>
                                        </div>

                                        <div>
                                            <div className="text-gray-500 mb-1">Time Remaining</div>
                                            <div className="font-medium text-gray-800">{timeRemaining}</div>
                                        </div>
                                    </div>

                                    {isActive && (
                                        <button
                                            className="w-full bg-gradient-to-r from-emerald-800 to-emerald-700 text-white py-3 rounded-lg font-medium hover:scale-[1.02] transition-transform shadow-md disabled:opacity-50"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const bidAmount = prompt('Enter bid amount (USDC):');
                                                if (bidAmount) {
                                                    handlePlaceBid(auction.auctionId, bidAmount);
                                                }
                                            }}
                                            disabled={isLoading}
                                        >
                                            Place Bid
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {auctions.length === 0 && (
                        <div className="text-center py-24 bg-white/90 backdrop-blur-sm rounded-2xl border-2 border-emerald-900/10 animate-fade-in">
                            <p className="text-gray-500">No active auctions</p>
                        </div>
                    )}

                    {/* Recent Updates Feed */}
                    {updates.length > 0 && (
                        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border-2 border-emerald-900/10 animate-fade-in">
                            <div className="bg-gradient-to-r from-emerald-800 to-emerald-700 p-6 rounded-t-2xl">
                                <h2 className="text-2xl font-bold text-white">Recent Bid Activity</h2>
                            </div>
                            <div className="divide-y divide-emerald-900/10">
                                {updates.slice(0, 10).map((update, idx) => (
                                    <div key={idx} className="flex justify-between items-center p-6 hover:bg-emerald-900/5 transition-colors">
                                        <div>
                                            <div className="font-medium text-sm text-gray-800">#{update.auctionId.toString().slice(0, 8)}...</div>
                                            <div className="text-xs text-gray-600 font-mono mt-1">
                                                {update.bidder.slice(0, 10)}...
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-bold text-emerald-900">{(Number(update.amount) / 1e6).toFixed(2)} USDC</div>
                                            <div className="text-xs text-gray-500 mt-1">
                                                {new Date(Number(update.timestamp) * 1000).toLocaleTimeString()}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Auction Detail Modal */}
                    {selectedAuction && (
                        <div
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in"
                            onClick={() => setSelectedAuction(null)}
                        >
                            <div
                                className="bg-white max-w-2xl w-full rounded-2xl shadow-2xl max-h-screen overflow-y-auto animate-slide-in-right"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="bg-gradient-to-r from-emerald-800 to-emerald-700 p-8 rounded-t-2xl">
                                    <h2 className="text-3xl font-bold text-white">Auction Details</h2>
                                </div>
                                <div className="p-8">
                                    <div className="space-y-6 text-sm">
                                        <div className="bg-emerald-900/5 p-4 rounded-lg border border-emerald-300">
                                            <div className="font-bold mb-2 text-green-900">Auction ID</div>
                                            <div className="font-mono text-xs text-green-700">{selectedAuction.auctionId}</div>
                                        </div>
                                        <div className="bg-emerald-900/5 p-4 rounded-lg border border-emerald-300">
                                            <div className="font-bold mb-2 text-green-900">Batch ID</div>
                                            <div className="font-mono text-xs text-green-700">{selectedAuction.batchId}</div>
                                        </div>
                                        <div className="bg-emerald-900/5 p-4 rounded-lg border border-emerald-300">
                                            <div className="font-bold mb-2 text-green-900">Farmer</div>
                                            <div className="font-mono text-xs text-green-700">{selectedAuction.farmerId}</div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-white p-4 rounded-lg border-2 border-emerald-300">
                                                <div className="font-bold mb-2 text-gray-800">Starting Price</div>
                                                <div className="text-emerald-900 font-bold text-lg">{(parseInt(selectedAuction.startingPrice) / 1e6).toFixed(2)} USDC</div>
                                            </div>
                                            <div className="bg-white p-4 rounded-lg border-2 border-emerald-300">
                                                <div className="font-bold mb-2 text-gray-800">Reserve Price</div>
                                                <div className="text-emerald-900 font-bold text-lg">{(parseInt(selectedAuction.reservePrice) / 1e6).toFixed(2)} USDC</div>
                                            </div>
                                        </div>
                                        {selectedAuction.deliveryLocationHash && (
                                            <div className="bg-emerald-900/5 p-4 rounded-lg border border-emerald-300">
                                                <div className="font-bold mb-2 text-green-900">Delivery Location</div>
                                                <div className="font-mono text-xs text-green-700">{selectedAuction.deliveryLocationHash}</div>
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        className="mt-8 w-full bg-gradient-to-r from-emerald-800 to-emerald-700 text-white py-4 rounded-lg font-bold hover:scale-[1.02] transition-transform shadow-lg"
                                        onClick={() => setSelectedAuction(null)}
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
