'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@/lib/components/ConnectButton';
import Link from 'next/link';
import { useAuctionUpdates } from '@/lib/hooks/useRealtimeUpdates';
import { useContractWrite, useAllAuctions, useSTTBalance, useTransactionCount } from '@/lib/hooks/useContracts';
import { uploadToIPFS } from '@/app/actions/ipfs';

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

export default function Dashboard() {
    const { isConnected, address } = useWallet();
    const { registerBatch, createAuction, placeBid } = useContractWrite();
    const { auctions: blockchainAuctions, loading: auctionsLoading, refetch: refetchAuctions } = useAllAuctions();
    const { balance: sttBalance } = useSTTBalance(address as `0x${string}` | undefined);
    const { count: transactionCount } = useTransactionCount(address as `0x${string}` | undefined);
    const [activeTab, setActiveTab] = useState<'overview' | 'marketplace' | 'products' | 'settings'>('overview');
    const [productView, setProductView] = useState<'bought' | 'sold' | 'listed'>('listed');
    const [auctions, setAuctions] = useState<Auction[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [filter, setFilter] = useState('all');
    const [selectedAuction, setSelectedAuction] = useState<Auction | null>(null);
    const [bidAmount, setBidAmount] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [createAuctionData, setCreateAuctionData] = useState({
        cropType: '',
        weight: '',
        startingPrice: '',
        reservePrice: '',
        duration: '24',
        deliveryLocation: '',
        description: '',
        imageFile: null as File | null,
    });

    const auctionManagerAddress = process.env.NEXT_PUBLIC_AUCTION_MANAGER_ADDRESS as `0x${string}`;
    const { updates } = useAuctionUpdates(auctionManagerAddress);

    // Update auctions when blockchain data loads
    useEffect(() => {
        if (blockchainAuctions) {
            console.log('Setting auctions in dashboard:', blockchainAuctions);
            setAuctions(blockchainAuctions as unknown as Auction[]);
        }
    }, [blockchainAuctions]);

    // Listen to real-time Data Stream updates and trigger notifications
    useEffect(() => {
        if (updates && updates.length > 0) {
            const latestUpdate = updates[updates.length - 1];
            console.log('🔔 Real-time update received:', latestUpdate);

            // Show notification for new bid (only event currently watched)
            const notification = document.createElement('div');
            notification.className = 'fixed top-20 right-4 bg-blue-600 text-white px-6 py-4 rounded-lg shadow-lg z-50 animate-slide-in';
            notification.innerHTML = `
        <div class="flex items-center gap-3">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>
          </svg>
          <div>
            <p class="font-semibold">New Bid Placed!</p>
            <p class="text-sm opacity-90">Amount: ${(Number(latestUpdate.amount) / 1e6).toFixed(2)} USDC</p>
            <p class="text-xs opacity-75">Bidder: ${latestUpdate.bidder.slice(0, 6)}...${latestUpdate.bidder.slice(-4)}</p>
          </div>
        </div>
      `;
            document.body.appendChild(notification);
            setTimeout(() => notification.remove(), 5000);

            // Refresh auctions to show new bid
            setTimeout(() => refetchAuctions(), 1000);
        }
    }, [updates, refetchAuctions]);
    const handlePlaceBid = async () => {
        if (!selectedAuction || !bidAmount) return;

        setIsLoading(true);
        try {
            const result = await placeBid({
                auctionId: selectedAuction.auctionId as `0x${string}`,
                bidAmount
            });
            if (!result.success) {
                alert('Bid failed: ' + result.error);
                return;
            }

            alert('Bid placed successfully! TX: ' + result.txHash);

            // Refetch auctions to show updated bid
            setTimeout(() => refetchAuctions(), 2000); // Wait 2s for block confirmation

            setSelectedAuction(null);
            setBidAmount('');
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
        if (filter === 'active') return auction.status === 0; // Open = 0
        if (filter === 'ending-soon') {
            const remaining = parseInt(auction.endTimestamp) * 1000 - Date.now();
            return auction.status === 0 && remaining < 3600000; // Open = 0
        }
        return true;
    });

    // Filter products by view type for My Products tab
    const getMyProducts = () => {
        if (!address) return [];

        if (productView === 'listed') {
            // Products the user has listed (they are the farmer/seller)
            return auctions.filter(auction => {
                // Simple check: if auction was created from this wallet
                return auction.status === 0; // For now, show all open auctions
                // TODO: Need to track creator address in contract
            });
        }

        if (productView === 'sold') {
            // Products the user has sold (closed auctions they created)
            return auctions.filter(auction => auction.status !== 0);
        }

        if (productView === 'bought') {
            // Products the user has won (they are the highest bidder)
            return auctions.filter(auction =>
                auction.highestBidder.toLowerCase() === address.toLowerCase()
            );
        }

        return [];
    };

    const myProducts = getMyProducts();

    const handleCreateAuction = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!createAuctionData.imageFile) {
            alert('Please select an image');
            return;
        }

        setIsLoading(true);
        try {
            // Upload image to IPFS
            const { cid: mediaCid, error: uploadError } = await uploadToIPFS(createAuctionData.imageFile);

            if (uploadError) {
                alert('Photo upload failed: ' + uploadError);
                setIsLoading(false);
                return;
            }

            // Generate unique IDs
            const batchIdStr = `BATCH-${Date.now()}`;
            const auctionIdStr = `AUCTION-${Date.now()}`;
            const farmerIdStr = address || 'UNKNOWN';

            // Register batch first
            const batchResult = await registerBatch({
                batchId: batchIdStr,
                farmerId: farmerIdStr,
                cropType: createAuctionData.cropType,
                weightKg: parseInt(createAuctionData.weight),
                qualityGrade: 5, // Default quality grade
                locationHash: createAuctionData.deliveryLocation,
                mediaCid
            });

            if (!batchResult.success) {
                alert('Batch registration failed: ' + batchResult.error);
                setIsLoading(false);
                return;
            }

            // Create auction
            const auctionResult = await createAuction({
                auctionId: auctionIdStr,
                batchId: batchResult.batchId as `0x${string}`,
                farmerId: farmerIdStr,
                durationSeconds: parseInt(createAuctionData.duration) * 3600, // Convert hours to seconds
                startingPrice: createAuctionData.startingPrice,
                reservePrice: createAuctionData.reservePrice,
                deliveryLocationHash: createAuctionData.deliveryLocation
            });

            if (!auctionResult.success) {
                alert('Auction creation failed: ' + auctionResult.error);
                setIsLoading(false);
                return;
            }

            alert('Auction created successfully! TX: ' + auctionResult.txHash);

            // Refetch auctions from blockchain
            setTimeout(() => refetchAuctions(), 2000); // Wait 2s for block confirmation

            setShowCreateModal(false);
            setCreateAuctionData({
                cropType: '',
                weight: '',
                startingPrice: '',
                reservePrice: '',
                duration: '24',
                deliveryLocation: '',
                description: '',
                imageFile: null,
            });

            // Auctions will auto-refresh from the blockchain hook
        } catch (error) {
            console.error('Create auction error:', error);
            alert('Failed to create auction');
        } finally {
            setIsLoading(false);
        }
    };

    // Redirect to home if not connected
    if (!isConnected) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-900 to-gray-900">
                <div className="text-center bg-white/90 backdrop-blur-sm p-12 rounded-2xl shadow-2xl max-w-md">
                    <svg className="w-20 h-20 mx-auto mb-6 text-emerald-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">Connect Your Wallet</h2>
                    <p className="text-gray-600 mb-8">Please connect your wallet to access your dashboard</p>
                    <Link
                        href="/"
                        className="inline-block px-8 py-3 bg-emerald-800 text-white font-semibold rounded-lg hover:bg-emerald-900 transition-all"
                    >
                        Go to Home
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-gray-900 to-emerald-800">
            <div className="flex">
                {/* Sidebar */}
                <aside className="w-64 bg-emerald-800/50 backdrop-blur-md min-h-screen border-r border-emerald-700/30 sticky top-0">
                    <div className="p-6">
                        <Link href="/" className="flex items-center gap-3 mb-8 group">
                            {/* Logo */}
                            <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-lg flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                </svg>
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-white group-hover:text-emerald-200 transition-colors">
                                    StreamFarm
                                </h1>
                                <p className="text-xs text-emerald-300">Real-time Agro Trading</p>
                            </div>
                        </Link>

                        <nav className="space-y-2">
                            <button
                                onClick={() => setActiveTab('overview')}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all ${activeTab === 'overview'
                                    ? 'bg-emerald-700 text-white shadow-lg'
                                    : 'text-emerald-200 hover:bg-emerald-700/50 hover:text-white'
                                    }`}
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                                Overview
                            </button>

                            <button
                                onClick={() => setActiveTab('marketplace')}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all ${activeTab === 'marketplace'
                                    ? 'bg-emerald-700 text-white shadow-lg'
                                    : 'text-emerald-200 hover:bg-emerald-700/50 hover:text-white'
                                    }`}
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                                Marketplace
                            </button>

                            <button
                                onClick={() => setActiveTab('products')}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all ${activeTab === 'products'
                                    ? 'bg-emerald-700 text-white shadow-lg'
                                    : 'text-emerald-200 hover:bg-emerald-700/50 hover:text-white'
                                    }`}
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                </svg>
                                My Products
                            </button>

                            <button
                                onClick={() => setActiveTab('settings')}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all ${activeTab === 'settings'
                                    ? 'bg-emerald-700 text-white shadow-lg'
                                    : 'text-emerald-200 hover:bg-emerald-700/50 hover:text-white'
                                    }`}
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                Settings
                            </button>
                        </nav>

                        <div className="mt-8 pt-8 border-t border-emerald-700/30">
                            <div className="text-emerald-200 text-sm mb-2">Connected Wallet</div>
                            <div className="text-white text-xs font-mono bg-emerald-900/50 px-3 py-2 rounded-lg break-all">
                                {address?.slice(0, 6)}...{address?.slice(-4)}
                            </div>
                        </div>
                    </div>
                </aside>

                {/* Main Content */}
                <main className="flex-1 p-8">
                    <div className="max-w-7xl mx-auto">
                        {/* Header */}
                        <div className="mb-8 flex justify-between items-center">
                            <div>
                                <h1 className="text-4xl font-bold text-white mb-2">
                                    {activeTab === 'overview' && 'Dashboard Overview'}
                                    {activeTab === 'marketplace' && 'Marketplace'}
                                    {activeTab === 'products' && 'My Products'}
                                    {activeTab === 'settings' && 'Settings'}
                                </h1>
                                <p className="text-emerald-200">
                                    {activeTab === 'overview' && 'View your activity and stats'}
                                    {activeTab === 'marketplace' && 'Browse and bid on auctions'}
                                    {activeTab === 'products' && 'Manage your listings and purchases'}
                                    {activeTab === 'settings' && 'Configure your account preferences'}
                                </p>
                            </div>

                            {(activeTab === 'overview' || activeTab === 'products') && (
                                <button
                                    onClick={() => setShowCreateModal(true)}
                                    className="px-6 py-3 bg-emerald-700 text-white font-semibold rounded-lg shadow-lg hover:bg-emerald-600 hover:scale-105 transition-all flex items-center gap-2"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    Create Auction
                                </button>
                            )}
                        </div>

                        {/* Overview Tab */}
                        {activeTab === 'overview' && (
                            <div className="space-y-8">
                                {/* Stats Cards */}
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                    <div className="bg-white/90 backdrop-blur-sm p-6 rounded-2xl shadow-lg border-2 border-emerald-900/10">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="text-gray-600 font-medium">Total Products</div>
                                            <div className="w-10 h-10 bg-emerald-900/10 rounded-lg flex items-center justify-center">
                                                <svg className="w-5 h-5 text-emerald-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                                </svg>
                                            </div>
                                        </div>
                                        <div className="text-3xl font-bold text-gray-800">{auctions.length}</div>
                                        <div className="text-sm text-gray-500 mt-1">{auctions.length === 0 ? 'No products yet' : `${auctions.length} product${auctions.length !== 1 ? 's' : ''}`}</div>
                                    </div>

                                    <div className="bg-white/90 backdrop-blur-sm p-6 rounded-2xl shadow-lg border-2 border-emerald-900/10">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="text-gray-600 font-medium">Active Listings</div>
                                            <div className="w-10 h-10 bg-emerald-900/10 rounded-lg flex items-center justify-center">
                                                <svg className="w-5 h-5 text-emerald-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                                                </svg>
                                            </div>
                                        </div>
                                        <div className="text-3xl font-bold text-gray-800">{auctions.filter(a => a.status === 0).length}</div>
                                        <div className="text-sm text-gray-500 mt-1">{auctions.length === 0 ? 'Create your first listing' : `${auctions.filter(a => a.status === 0).length} active`}</div>
                                    </div>

                                    <div className="bg-white/90 backdrop-blur-sm p-6 rounded-2xl shadow-lg border-2 border-emerald-900/10">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="text-gray-600 font-medium">Transactions</div>
                                            <div className="w-10 h-10 bg-emerald-900/10 rounded-lg flex items-center justify-center">
                                                <svg className="w-5 h-5 text-emerald-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                                </svg>
                                            </div>
                                        </div>
                                        <div className="text-3xl font-bold text-gray-800">{transactionCount}</div>
                                        <div className="text-sm text-gray-500 mt-1">{transactionCount === 0 ? 'No transactions' : `${transactionCount} transaction${transactionCount !== 1 ? 's' : ''}`}</div>
                                    </div>

                                    <div className="bg-white/90 backdrop-blur-sm p-6 rounded-2xl shadow-lg border-2 border-emerald-900/10">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="text-gray-600 font-medium">Wallet Balance</div>
                                            <div className="w-10 h-10 bg-emerald-900/10 rounded-lg flex items-center justify-center">
                                                <svg className="w-5 h-5 text-emerald-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                                                </svg>
                                            </div>
                                        </div>
                                        <div className="text-3xl font-bold text-gray-800">{parseFloat(sttBalance).toFixed(2)} STT</div>
                                        <div className="text-sm text-gray-500 mt-1">Somnia Testnet</div>
                                    </div>
                                </div>

                                {/* Recent Activity */}
                                <div className="bg-white/90 backdrop-blur-sm p-8 rounded-2xl shadow-lg border-2 border-emerald-900/10">
                                    <h2 className="text-2xl font-bold text-gray-800 mb-6">Recent Activity</h2>

                                    {/* Show recent auctions and bids */}
                                    {auctions.length === 0 && updates.length === 0 ? (
                                        <div className="text-center py-12 text-gray-500">
                                            <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                            </svg>
                                            <p className="font-medium">No recent activity</p>
                                            <p className="text-sm mt-2">Create your first auction or place a bid to get started</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {/* Recent Bids from Data Streams */}
                                            {updates.slice(0, 3).map((update, idx) => (
                                                <div key={idx} className="flex items-start gap-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
                                                    <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                                                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                                        </svg>
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="font-semibold text-gray-800">New Bid Placed</p>
                                                        <p className="text-sm text-gray-600">
                                                            {update.bidder.slice(0, 6)}...{update.bidder.slice(-4)} bid {(Number(update.amount) / 1e6).toFixed(2)} USDC
                                                        </p>
                                                        <p className="text-xs text-gray-500 mt-1">
                                                            {new Date(Number(update.timestamp) * 1000).toLocaleString()}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}

                                            {/* Recent Auctions */}
                                            {auctions.slice(0, 3).map((auction) => (
                                                <div key={auction.auctionId} className="flex items-start gap-4 p-4 bg-emerald-50 rounded-lg border border-emerald-100">
                                                    <div className="w-10 h-10 bg-emerald-600 rounded-full flex items-center justify-center flex-shrink-0">
                                                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                                        </svg>
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="font-semibold text-gray-800">
                                                            {auction.status === 0 ? 'Active Auction' : 'Closed Auction'}
                                                        </p>
                                                        <p className="text-sm text-gray-600">
                                                            Starting at {(parseInt(auction.startingPrice) / 1e6).toFixed(2)} USDC
                                                            {parseInt(auction.highestBid) > 0 && (
                                                                <span className="text-emerald-600 font-semibold ml-2">
                                                                    Current: {(parseInt(auction.highestBid) / 1e6).toFixed(2)} USDC
                                                                </span>
                                                            )}
                                                        </p>
                                                        <p className="text-xs text-gray-500 mt-1">
                                                            ID: {auction.auctionId.slice(0, 8)}...
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Marketplace Tab */}
                        {activeTab === 'marketplace' && (
                            <div className="space-y-6">
                                {/* Filters */}
                                <div className="flex gap-4">
                                    <button
                                        onClick={() => setFilter('all')}
                                        className={`px-6 py-2 rounded-lg font-medium transition-all ${filter === 'all'
                                            ? 'bg-emerald-700 text-white shadow-lg'
                                            : 'bg-white/90 text-gray-700 hover:bg-white'
                                            }`}
                                    >
                                        All Auctions ({auctions.length})
                                    </button>
                                    <button
                                        onClick={() => setFilter('active')}
                                        className={`px-6 py-2 rounded-lg font-medium transition-all ${filter === 'active'
                                            ? 'bg-emerald-700 text-white shadow-lg'
                                            : 'bg-white/90 text-gray-700 hover:bg-white'
                                            }`}
                                    >
                                        Active
                                    </button>
                                    <button
                                        onClick={() => setFilter('ending-soon')}
                                        className={`px-6 py-2 rounded-lg font-medium transition-all ${filter === 'ending-soon'
                                            ? 'bg-emerald-700 text-white shadow-lg'
                                            : 'bg-white/90 text-gray-700 hover:bg-white'
                                            }`}
                                    >
                                        Ending Soon
                                    </button>
                                </div>

                                {/* Auctions Grid */}
                                {auctionsLoading ? (
                                    <div className="text-center py-24 bg-white/90 backdrop-blur-sm rounded-2xl">
                                        <div className="inline-block w-12 h-12 border-4 border-emerald-700 border-t-transparent rounded-full animate-spin"></div>
                                        <p className="mt-4 text-gray-600">Loading auctions from blockchain...</p>
                                    </div>
                                ) : filteredAuctions.length === 0 ? (
                                    <div className="text-center py-24 bg-white/90 backdrop-blur-sm rounded-2xl border-2 border-emerald-900/10">
                                        <svg className="w-24 h-24 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                                        </svg>
                                        <h3 className="text-xl font-semibold text-gray-700 mb-2">No auctions available</h3>
                                        <p className="text-gray-500">Check back soon for new listings</p>
                                    </div>
                                ) : (
                                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {filteredAuctions.map((auction) => (
                                            <div
                                                key={auction.auctionId}
                                                className="bg-white/90 backdrop-blur-sm rounded-2xl overflow-hidden border-2 border-emerald-900/10 hover:border-emerald-700 hover:shadow-xl transition-all cursor-pointer"
                                                onClick={() => setSelectedAuction(auction)}
                                            >
                                                <div className="bg-gradient-to-r from-emerald-800 to-emerald-700 p-4">
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <span className="text-xs font-mono text-emerald-200">
                                                                #{auction.auctionId.slice(0, 8)}
                                                            </span>
                                                            <h3 className="text-xl font-bold text-white mt-1">
                                                                {auction.cropType || 'Fresh Produce'}
                                                            </h3>
                                                        </div>
                                                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${auction.status === 1 ? 'bg-emerald-400 text-emerald-900' : 'bg-gray-300 text-gray-700'
                                                            }`}>
                                                            {auction.status === 1 ? 'Active' : 'Ended'}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="p-6 space-y-3">
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-sm text-gray-600">Weight</span>
                                                        <span className="font-semibold text-gray-800">{auction.weight || 'N/A'} kg</span>
                                                    </div>
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-sm text-gray-600">Starting Price</span>
                                                        <span className="font-semibold text-gray-800">{auction.startingPrice} STT</span>
                                                    </div>
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-sm text-gray-600">Current Bid</span>
                                                        <span className="font-bold text-emerald-800 text-lg">
                                                            {auction.highestBid || auction.startingPrice} STT
                                                        </span>
                                                    </div>
                                                    <div className="pt-3 border-t border-gray-200">
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-sm text-gray-600">Time Remaining</span>
                                                            <span className="font-semibold text-gray-800">
                                                                {formatTimeRemaining(auction.endTimestamp)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Bid Modal */}
                                {selectedAuction && (
                                    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-6">
                                        <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full">
                                            <div className="border-b-2 border-gray-200 p-6 flex justify-between items-center">
                                                <h3 className="text-2xl font-bold text-gray-800">Place Bid</h3>
                                                <button
                                                    onClick={() => setSelectedAuction(null)}
                                                    className="text-gray-600 hover:text-gray-800 transition-colors"
                                                >
                                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            </div>
                                            <div className="p-6 space-y-6">
                                                <div className="bg-emerald-900/5 p-4 rounded-lg">
                                                    <h4 className="font-bold text-lg text-gray-800 mb-2">{selectedAuction.cropType}</h4>
                                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                                        <div>
                                                            <span className="text-gray-600">Weight:</span>
                                                            <span className="font-semibold text-gray-800 ml-2">{selectedAuction.weight} kg</span>
                                                        </div>
                                                        <div>
                                                            <span className="text-gray-600">Current Bid:</span>
                                                            <span className="font-semibold text-emerald-800 ml-2">
                                                                {selectedAuction.highestBid || selectedAuction.startingPrice} STT
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div>
                                                    <label className="block text-gray-700 font-semibold mb-2">Your Bid Amount (STT)</label>
                                                    <input
                                                        type="number"
                                                        value={bidAmount}
                                                        onChange={(e) => setBidAmount(e.target.value)}
                                                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-emerald-700 focus:outline-none"
                                                        placeholder={`Min: ${selectedAuction.highestBid || selectedAuction.startingPrice} STT`}
                                                    />
                                                </div>

                                                <div className="flex gap-4">
                                                    <button
                                                        onClick={handlePlaceBid}
                                                        disabled={isLoading || !bidAmount}
                                                        className="flex-1 px-6 py-3 bg-emerald-800 text-white font-semibold rounded-lg hover:bg-emerald-900 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        {isLoading ? 'Processing...' : 'Place Bid'}
                                                    </button>
                                                    <button
                                                        onClick={() => setSelectedAuction(null)}
                                                        className="px-6 py-3 bg-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-400 transition-all"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* My Products Tab */}
                        {activeTab === 'products' && (
                            <div className="space-y-6">
                                {/* Product View Tabs */}
                                <div className="flex gap-4 border-b-2 border-emerald-900/10">
                                    <button
                                        onClick={() => setProductView('listed')}
                                        className={`px-6 py-3 font-semibold transition-all ${productView === 'listed'
                                            ? 'text-emerald-800 border-b-4 border-emerald-800'
                                            : 'text-gray-600 hover:text-emerald-800'
                                            }`}
                                    >
                                        Listed
                                    </button>
                                    <button
                                        onClick={() => setProductView('sold')}
                                        className={`px-6 py-3 font-semibold transition-all ${productView === 'sold'
                                            ? 'text-emerald-800 border-b-4 border-emerald-800'
                                            : 'text-gray-600 hover:text-emerald-800'
                                            }`}
                                    >
                                        Sold
                                    </button>
                                    <button
                                        onClick={() => setProductView('bought')}
                                        className={`px-6 py-3 font-semibold transition-all ${productView === 'bought'
                                            ? 'text-emerald-800 border-b-4 border-emerald-800'
                                            : 'text-gray-600 hover:text-emerald-800'
                                            }`}
                                    >
                                        Bought
                                    </button>
                                </div>

                                {/* Products Grid */}
                                {myProducts.length === 0 ? (
                                    <div className="bg-white/90 backdrop-blur-sm p-8 rounded-2xl shadow-lg border-2 border-emerald-900/10">
                                        <div className="text-center py-12 text-gray-500">
                                            <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                            </svg>
                                            <p className="font-medium">
                                                {productView === 'listed' && 'No active listings'}
                                                {productView === 'sold' && 'No sold products'}
                                                {productView === 'bought' && 'No purchased products'}
                                            </p>
                                            <p className="text-sm mt-2">
                                                {productView === 'listed' && 'Create your first auction to start selling'}
                                                {productView === 'sold' && 'Products you sell will appear here'}
                                                {productView === 'bought' && 'Browse the marketplace to find products'}
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {myProducts.map((product) => (
                                            <div key={product.auctionId} className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border-2 border-emerald-900/10 overflow-hidden hover:shadow-xl transition-all">
                                                <div className="h-48 bg-gradient-to-br from-emerald-100 to-emerald-50 flex items-center justify-center">
                                                    <svg className="w-20 h-20 text-emerald-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                                    </svg>
                                                </div>
                                                <div className="p-6">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">
                                                            {product.status === 0 ? 'Active' : 'Closed'}
                                                        </span>
                                                        <span className="text-sm text-gray-500">
                                                            ID: {product.auctionId.slice(0, 8)}...
                                                        </span>
                                                    </div>
                                                    <h3 className="font-bold text-lg text-gray-800 mb-2">Auction #{product.auctionId.slice(0, 6)}</h3>
                                                    <div className="space-y-2 text-sm">
                                                        <div className="flex justify-between">
                                                            <span className="text-gray-600">Starting Price:</span>
                                                            <span className="font-semibold">{(parseInt(product.startingPrice) / 1e6).toFixed(2)} USDC</span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span className="text-gray-600">Current Bid:</span>
                                                            <span className="font-semibold text-emerald-700">{(parseInt(product.highestBid) / 1e6).toFixed(2)} USDC</span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span className="text-gray-600">Status:</span>
                                                            <span className={`font-semibold ${product.status === 0 ? 'text-green-600' : 'text-gray-600'}`}>
                                                                {product.status === 0 ? 'Open' : 'Closed'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Settings Tab */}
                        {activeTab === 'settings' && (
                            <div className="space-y-6">
                                <div className="bg-white/90 backdrop-blur-sm p-8 rounded-2xl shadow-lg border-2 border-emerald-900/10">
                                    <h2 className="text-2xl font-bold text-gray-800 mb-6">Account Settings</h2>
                                    <div className="space-y-6">
                                        <div>
                                            <label className="block text-gray-700 font-medium mb-2">Profile Name</label>
                                            <input
                                                type="text"
                                                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-emerald-800 focus:outline-none"
                                                placeholder="Enter your name"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-gray-700 font-medium mb-2">Email (optional)</label>
                                            <input
                                                type="email"
                                                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-emerald-800 focus:outline-none"
                                                placeholder="your@email.com"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-gray-700 font-medium mb-2">Location</label>
                                            <input
                                                type="text"
                                                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-emerald-800 focus:outline-none"
                                                placeholder="City, Country"
                                            />
                                        </div>
                                        <button className="px-8 py-3 bg-emerald-800 text-white font-semibold rounded-lg hover:bg-emerald-900 transition-all">
                                            Save Changes
                                        </button>
                                    </div>
                                </div>

                                <div className="bg-white/90 backdrop-blur-sm p-8 rounded-2xl shadow-lg border-2 border-emerald-900/10">
                                    <h2 className="text-2xl font-bold text-gray-800 mb-6">Notifications</h2>
                                    <div className="space-y-4">
                                        <label className="flex items-center gap-3 cursor-pointer">
                                            <input type="checkbox" className="w-5 h-5 rounded text-emerald-800" defaultChecked />
                                            <span className="text-gray-700">New bids on my auctions</span>
                                        </label>
                                        <label className="flex items-center gap-3 cursor-pointer">
                                            <input type="checkbox" className="w-5 h-5 rounded text-emerald-800" defaultChecked />
                                            <span className="text-gray-700">Auction ending reminders</span>
                                        </label>
                                        <label className="flex items-center gap-3 cursor-pointer">
                                            <input type="checkbox" className="w-5 h-5 rounded text-emerald-800" />
                                            <span className="text-gray-700">Price alerts</span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </main>
            </div>

            {/* Create Auction Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-6">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-white border-b-2 border-gray-200 p-6 flex justify-between items-center">
                            <h3 className="text-2xl font-bold text-gray-800">Create New Auction</h3>
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="text-gray-600 hover:text-gray-800 transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <form onSubmit={handleCreateAuction} className="p-6 space-y-6">
                            <div className="grid md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-gray-700 font-semibold mb-2">Crop Type *</label>
                                    <input
                                        type="text"
                                        value={createAuctionData.cropType}
                                        onChange={(e) => setCreateAuctionData({ ...createAuctionData, cropType: e.target.value })}
                                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-emerald-700 focus:outline-none"
                                        placeholder="e.g., Organic Tomatoes"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-gray-700 font-semibold mb-2">Weight (kg) *</label>
                                    <input
                                        type="number"
                                        value={createAuctionData.weight}
                                        onChange={(e) => setCreateAuctionData({ ...createAuctionData, weight: e.target.value })}
                                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-emerald-700 focus:outline-none"
                                        placeholder="e.g., 100"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-gray-700 font-semibold mb-2">Starting Price (STT) *</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={createAuctionData.startingPrice}
                                        onChange={(e) => setCreateAuctionData({ ...createAuctionData, startingPrice: e.target.value })}
                                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-emerald-700 focus:outline-none"
                                        placeholder="e.g., 50"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-gray-700 font-semibold mb-2">Reserve Price (STT) *</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={createAuctionData.reservePrice}
                                        onChange={(e) => setCreateAuctionData({ ...createAuctionData, reservePrice: e.target.value })}
                                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-emerald-700 focus:outline-none"
                                        placeholder="e.g., 100"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-gray-700 font-semibold mb-2">Duration (hours) *</label>
                                    <select
                                        value={createAuctionData.duration}
                                        onChange={(e) => setCreateAuctionData({ ...createAuctionData, duration: e.target.value })}
                                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-emerald-700 focus:outline-none"
                                        required
                                    >
                                        <option value="6">6 hours</option>
                                        <option value="12">12 hours</option>
                                        <option value="24">24 hours</option>
                                        <option value="48">48 hours</option>
                                        <option value="72">72 hours</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-gray-700 font-semibold mb-2">Delivery Location *</label>
                                    <input
                                        type="text"
                                        value={createAuctionData.deliveryLocation}
                                        onChange={(e) => setCreateAuctionData({ ...createAuctionData, deliveryLocation: e.target.value })}
                                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-emerald-700 focus:outline-none"
                                        placeholder="e.g., California, USA"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-gray-700 font-semibold mb-2">Description (optional)</label>
                                <textarea
                                    value={createAuctionData.description}
                                    onChange={(e) => setCreateAuctionData({ ...createAuctionData, description: e.target.value })}
                                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-emerald-700 focus:outline-none"
                                    placeholder="Describe your produce, certifications, quality, etc."
                                    rows={3}
                                />
                            </div>

                            <div>
                                <label className="block text-gray-700 font-semibold mb-2">Upload Product Image *</label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => setCreateAuctionData({ ...createAuctionData, imageFile: e.target.files?.[0] || null })}
                                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-emerald-700 focus:outline-none"
                                    required
                                />
                                <p className="text-sm text-gray-500 mt-2">Image will be stored on IPFS</p>
                            </div>

                            <div className="bg-emerald-900/5 p-4 rounded-lg border-2 border-emerald-900/10">
                                <p className="text-sm text-gray-700">
                                    <strong>Note:</strong> Your auction will be created on the Somnia blockchain and the product image will be stored on IPFS.
                                    Both operations require wallet confirmation and minimal gas fees.
                                </p>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="flex-1 px-6 py-3 bg-emerald-800 text-white font-semibold rounded-lg hover:bg-emerald-900 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isLoading ? 'Creating Auction...' : 'Create Auction'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    disabled={isLoading}
                                    className="px-6 py-3 bg-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-400 transition-all disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
