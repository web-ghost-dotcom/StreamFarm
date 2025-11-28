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
    cropType: string;
    weight: string;
    startTimestamp: string;
    endTimestamp: string;
    startingPrice: string;
    reservePrice: string;
    highestBid: string;
    highestBidder: string;
    status: number;
}

export default function Marketplace() {
    const [auctions, setAuctions] = useState<Auction[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedAuction, setSelectedAuction] = useState<Auction | null>(null);
    const [filter, setFilter] = useState('all'); // all, active, ending-soon
    const { isConnected } = useWallet();
    const { placeBid } = useContractWrite();

    const auctionManagerAddress = process.env.NEXT_PUBLIC_AUCTION_MANAGER_ADDRESS as `0x${string}`;
    const { isConnected: streamConnected } = useAuctionUpdates(auctionManagerAddress);

    useEffect(() => {
        fetchAuctions();
    }, []);

    const fetchAuctions = async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/auctions');
            const data = await response.json();
            if (data.success) {
                setAuctions(data.auctions || []);
            }
        } catch (error) {
            console.error('Failed to fetch auctions:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handlePlaceBid = async (auctionId: string, bidAmount: string) => {
        if (!isConnected) {
            alert('Please connect your wallet first');
            return;
        }

        setIsLoading(true);
        try {
            const result = await placeBid({
                auctionId: auctionId as `0x${string}`,
                bidAmount
            });
            if (!result.success) {
                alert('Bid failed: ' + result.error);
                return;
            }

            alert('Bid placed successfully! TX: ' + result.txHash);
            fetchAuctions();
            setSelectedAuction(null);
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
        const remaining = end - now;

        if (remaining <= 0) return 'Ended';

        const hours = Math.floor(remaining / (1000 * 60 * 60));
        const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
        return `${hours}h ${minutes}m`;
    };

    const filteredAuctions = auctions.filter(auction => {
        if (filter === 'active') return auction.status === 1;
        if (filter === 'ending-soon') {
            const remaining = parseInt(auction.endTimestamp) * 1000 - Date.now();
            return auction.status === 1 && remaining < 3600000; // 1 hour
        }
        return true;
    });

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
                            <Link href="/marketplace" className="text-sm font-medium text-white border-b-2 border-white pb-1">
                                Marketplace
                            </Link>
                            <Link href="/farmer" className="text-sm text-emerald-200 hover:text-white transition-colors">
                                Farmer Dashboard
                            </Link>
                            <Link href="/buyer" className="text-sm text-emerald-200 hover:text-white transition-colors">
                                Buyer Dashboard
                            </Link>
                        </nav>
                        <ConnectButton />
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-6 py-12 relative z-10">
                {/* Page Header */}
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-4xl font-bold text-white drop-shadow-lg mb-2">
                            Auction Marketplace
                        </h1>
                        <p className="text-emerald-200">Browse and bid on fresh agricultural produce</p>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full border border-white/20">
                        <div className={`w-2 h-2 rounded-full ${streamConnected ? 'bg-emerald-400 animate-pulse' : 'bg-gray-400'}`} />
                        <span className="text-sm text-white font-medium">
                            {streamConnected ? 'Live Updates' : 'Offline'}
                        </span>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex gap-4 mb-8">
                    <button
                        onClick={() => setFilter('all')}
                        className={`px-6 py-2 rounded-lg font-medium transition-all ${filter === 'all'
                            ? 'bg-emerald-800 text-white'
                            : 'bg-white/10 text-emerald-200 hover:bg-white/20'
                            }`}
                    >
                        All Auctions ({auctions.length})
                    </button>
                    <button
                        onClick={() => setFilter('active')}
                        className={`px-6 py-2 rounded-lg font-medium transition-all ${filter === 'active'
                            ? 'bg-emerald-800 text-white'
                            : 'bg-white/10 text-emerald-200 hover:bg-white/20'
                            }`}
                    >
                        Active
                    </button>
                    <button
                        onClick={() => setFilter('ending-soon')}
                        className={`px-6 py-2 rounded-lg font-medium transition-all ${filter === 'ending-soon'
                            ? 'bg-emerald-800 text-white'
                            : 'bg-white/10 text-emerald-200 hover:bg-white/20'
                            }`}
                    >
                        Ending Soon
                    </button>
                </div>

                {/* Auctions Grid */}
                {isLoading ? (
                    <div className="text-center py-24">
                        <div className="inline-block w-12 h-12 border-4 border-emerald-800 border-t-transparent rounded-full animate-spin"></div>
                        <p className="mt-4 text-emerald-200">Loading auctions...</p>
                    </div>
                ) : filteredAuctions.length === 0 ? (
                    <div className="text-center py-24 bg-white/90 backdrop-blur-sm rounded-2xl border-2 border-emerald-800/20">
                        <svg className="w-24 h-24 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                        </svg>
                        <h3 className="text-xl font-semibold text-gray-700 mb-2">No auctions available</h3>
                        <p className="text-gray-500 mb-6">Check back soon for new listings</p>
                        <Link href="/farmer" className="inline-block px-6 py-3 bg-emerald-800 text-white rounded-lg hover:bg-emerald-700 transition-colors">
                            List Your Produce
                        </Link>
                    </div>
                ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredAuctions.map((auction) => (
                            <div
                                key={auction.auctionId}
                                className="bg-white/90 backdrop-blur-sm rounded-2xl overflow-hidden border-2 border-emerald-800/20 hover:border-emerald-800 hover:shadow-xl transition-all cursor-pointer"
                                onClick={() => setSelectedAuction(auction)}
                            >
                                <div className="bg-gradient-to-r from-emerald-800 to-emerald-700 p-4">
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="text-lg font-bold text-white">{auction.cropType || 'Fresh Produce'}</h3>
                                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${auction.status === 1 ? 'bg-green-400 text-green-900' : 'bg-gray-400 text-gray-900'
                                            }`}>
                                            {auction.status === 1 ? 'Active' : 'Ended'}
                                        </span>
                                    </div>
                                    <p className="text-emerald-200 text-sm">Batch: {auction.batchId.slice(0, 16)}...</p>
                                </div>

                                <div className="p-6">
                                    <div className="space-y-3 mb-4">
                                        <div className="flex justify-between">
                                            <span className="text-gray-600 text-sm">Weight:</span>
                                            <span className="font-semibold text-gray-800">{auction.weight || '0'} kg</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600 text-sm">Starting Price:</span>
                                            <span className="font-semibold text-gray-800">{auction.startingPrice} STT</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600 text-sm">Current Bid:</span>
                                            <span className="font-bold text-emerald-800 text-lg">
                                                {auction.highestBid || auction.startingPrice} STT
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600 text-sm">Time Remaining:</span>
                                            <span className="font-semibold text-gray-800">{formatTimeRemaining(auction.endTimestamp)}</span>
                                        </div>
                                    </div>

                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedAuction(auction);
                                        }}
                                        className="w-full py-3 bg-emerald-800 text-white font-semibold rounded-lg hover:bg-emerald-700 transition-colors"
                                    >
                                        Place Bid
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Bid Modal */}
                {selectedAuction && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl max-w-2xl w-full p-8">
                            <h2 className="text-2xl font-bold text-gray-800 mb-6">Place Your Bid</h2>

                            <div className="space-y-4 mb-6">
                                <div>
                                    <label className="text-sm text-gray-600">Crop Type</label>
                                    <p className="font-semibold text-gray-800">{selectedAuction.cropType || 'Fresh Produce'}</p>
                                </div>
                                <div>
                                    <label className="text-sm text-gray-600">Current Highest Bid</label>
                                    <p className="text-2xl font-bold text-emerald-800">{selectedAuction.highestBid || selectedAuction.startingPrice} STT</p>
                                </div>
                            </div>

                            <form onSubmit={(e) => {
                                e.preventDefault();
                                const formData = new FormData(e.currentTarget);
                                handlePlaceBid(selectedAuction.auctionId, formData.get('bidAmount') as string);
                            }}>
                                <label className="block mb-2 text-sm font-medium text-gray-700">Your Bid Amount (STT)</label>
                                <input
                                    type="number"
                                    name="bidAmount"
                                    step="0.01"
                                    min={parseFloat(selectedAuction.highestBid || selectedAuction.startingPrice) + 0.01}
                                    required
                                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-emerald-800 focus:outline-none mb-6"
                                    placeholder="Enter bid amount"
                                />

                                <div className="flex gap-4">
                                    <button
                                        type="button"
                                        onClick={() => setSelectedAuction(null)}
                                        className="flex-1 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isLoading || !isConnected}
                                        className="flex-1 py-3 bg-emerald-800 text-white font-semibold rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
                                    >
                                        {isLoading ? 'Processing...' : isConnected ? 'Confirm Bid' : 'Connect Wallet'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
