'use client';

import { useState } from 'react';
import Link from 'next/link';
import { uploadToIPFS } from '@/app/actions/ipfs';
import { useContractWrite } from '@/lib/hooks/useContracts';
import { ConnectButton, useWallet } from '@/lib/components/ConnectButton';

export default function FarmerDashboard() {
    const [isLoading, setIsLoading] = useState(false);
    const [batchId, setBatchId] = useState<string>('');
    const { isConnected } = useWallet();
    const { registerBatch, createAuction } = useContractWrite();

    const handleBatchRegistration = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const formData = new FormData(e.currentTarget);

            // Upload photos to IPFS
            const photoFile = formData.get('photos') as File;
            const { cid: mediaCid, error: uploadError } = await uploadToIPFS(photoFile);

            if (uploadError) {
                alert('Photo upload failed: ' + uploadError);
                return;
            }

            // Generate unique IDs
            const batchIdStr = `BATCH-${Date.now()}`;
            const farmerIdStr = formData.get('farmerId') as string;

            // Register batch on-chain
            const result = await registerBatch({
                batchId: batchIdStr,
                farmerId: farmerIdStr,
                cropType: formData.get('cropType') as string,
                weightKg: parseInt(formData.get('weightKg') as string),
                qualityGrade: parseInt(formData.get('qualityGrade') as string),
                locationHash: formData.get('locationHash') as string,
                mediaCid
            });

            if (!result.success) {
                alert('Batch registration failed: ' + result.error);
                return;
            }

            // Publish to Somnia Streams
            const response = await fetch('/api/batches', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    cropType: formData.get('cropType'),
                    weightKg: formData.get('weightKg'),
                    qualityGrade: formData.get('qualityGrade'),
                    farmerId: formData.get('farmerId'),
                    locationHash: formData.get('locationHash'),
                    mediaCid
                })
            });

            const data = await response.json();

            if (data.success) {
                setBatchId(data.batchId);
                alert('Batch registered successfully! TX: ' + result.txHash);
            }

        } catch (error) {
            console.error('Batch registration error:', error);
            alert('Failed to register batch');
        } finally {
            setIsLoading(false);
        }
    };

    const handleAuctionCreation = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const formData = new FormData(e.currentTarget);
            const auctionIdStr = `AUC-${Date.now()}`;
            const farmerIdStr = formData.get('farmerId') as string;

            // Create auction on-chain
            const result = await createAuction({
                auctionId: auctionIdStr,
                batchId: batchId as `0x${string}`,
                farmerId: farmerIdStr,
                durationSeconds: parseInt(formData.get('durationSeconds') as string),
                startingPrice: formData.get('startingPrice') as string,
                reservePrice: formData.get('reservePrice') as string,
                deliveryLocationHash: formData.get('deliveryLocationHash') as string
            });

            if (!result.success) {
                alert('Auction creation failed: ' + result.error);
                return;
            }

            // Publish to Somnia Streams
            const response = await fetch('/api/auctions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    batchId,
                    farmerId: formData.get('farmerId'),
                    durationSeconds: formData.get('durationSeconds'),
                    startingPrice: formData.get('startingPrice'),
                    reservePrice: formData.get('reservePrice'),
                    deliveryLocationHash: formData.get('deliveryLocationHash')
                })
            });

            const data = await response.json();

            if (data.success) {
                alert('Auction created successfully! TX: ' + result.txHash);
            }

        } catch (error) {
            console.error('Auction creation error:', error);
            alert('Failed to create auction');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen relative">
            {/* Header */}
            <header className="bg-gradient-to-r from-emerald-800 to-emerald-700 shadow-lg relative z-10">
                <div className="max-w-7xl mx-auto px-6 py-5 flex justify-between items-center">
                    <Link href="/" className="text-2xl font-bold text-white tracking-tight">🌿 Agro-Data Streams</Link>
                    <div className="flex items-center gap-6">
                        <nav className="flex gap-8">
                            <Link href="/farmer" className="text-white font-bold border-b-2 border-white pb-1">
                                Farmers
                            </Link>
                            <Link href="/buyer" className="text-emerald-200 hover:text-white transition-colors">
                                Buyers
                            </Link>
                            <Link href="/consumer" className="text-emerald-200 hover:text-white transition-colors">
                                Consumers
                            </Link>
                        </nav>
                        <ConnectButton />
                    </div>
                </div>
            </header>

            {!isConnected ? (
                <div className="max-w-4xl mx-auto px-6 py-24 text-center relative z-10">
                    <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-12 shadow-xl border-2 border-emerald-800/20">
                        <div className="w-20 h-20 bg-emerald-800 rounded-full mx-auto mb-6 flex items-center justify-center">
                            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                        </div>
                        <h2 className="text-3xl font-bold text-gray-800 mb-4">Connect Your Wallet</h2>
                        <p className="text-gray-600 mb-8 max-w-md mx-auto">
                            Please connect your wallet to access the Farmer Dashboard and manage your batches and auctions.
                        </p>
                        <ConnectButton />
                    </div>
                </div>
            ) : (
                <div>

                    <div className="max-w-6xl mx-auto px-6 py-12 relative z-10">
                        <div className="mb-12 animate-fade-in">
                            <h1 className="text-4xl font-bold mb-3 text-white drop-shadow-lg">Farmer Dashboard</h1>
                            <p className="text-emerald-900/10 drop-shadow-md">Register your produce and create auctions on the blockchain</p>
                        </div>

                        {/* Batch Registration Form */}
                        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl mb-12 overflow-hidden border-2 border-emerald-900/10 animate-slide-in-left">
                            <div className="bg-gradient-to-r from-emerald-800 to-emerald-700 p-6">
                                <h2 className="text-2xl font-bold text-white">Register New Batch</h2>
                                <p className="text-emerald-900/5 mt-1">Create an immutable provenance record</p>
                            </div>
                            <div className="p-8">
                                <form onSubmit={handleBatchRegistration} className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-bold mb-2 text-gray-700">Crop Type</label>
                                        <input
                                            type="text"
                                            name="cropType"
                                            required
                                            className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-800 focus:border-transparent transition-all"
                                            placeholder="e.g., Organic Tomatoes"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-sm font-bold mb-2 text-gray-700">Weight (kg)</label>
                                            <input
                                                type="number"
                                                name="weightKg"
                                                required
                                                className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-800 focus:border-transparent transition-all"
                                                placeholder="100"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-bold mb-2 text-gray-700">Quality Grade (1-5)</label>
                                            <input
                                                type="number"
                                                name="qualityGrade"
                                                min="1"
                                                max="5"
                                                required
                                                className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-800 focus:border-transparent transition-all"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold mb-2 text-gray-700">Location Hash</label>
                                        <input
                                            type="text"
                                            name="locationHash"
                                            required
                                            className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-800 focus:border-transparent transition-all"
                                            placeholder="Farm coordinates hash"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold mb-2 text-gray-700">Farmer ID (Wallet Address)</label>
                                        <input
                                            type="text"
                                            name="farmerId"
                                            required
                                            className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-800 focus:border-transparent transition-all"
                                            placeholder="0x..."
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold mb-2 text-gray-700">Photos</label>
                                        <input
                                            type="file"
                                            name="photos"
                                            accept="image/*"
                                            required
                                            className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-800 focus:border-transparent transition-all file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-emerald-900/10 file:text-green-700 file:font-semibold hover:file:bg-emerald-300"
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className="w-full bg-gradient-to-r from-emerald-800 to-emerald-700 text-white py-4 font-bold rounded-lg hover:from-emerald-900 hover:to-emerald-800 disabled:from-gray-300 disabled:to-gray-300 transition-all shadow-lg hover:shadow-xl hover:scale-[1.02] disabled:hover:scale-100"
                                    >
                                        {isLoading ? (
                                            <span className="flex items-center justify-center gap-2">
                                                <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                                                Processing...
                                            </span>
                                        ) : (
                                            'Register Batch'
                                        )}
                                    </button>
                                </form>

                                {batchId && (
                                    <div className="mt-6 p-6 border-2 border-emerald-300 bg-emerald-900/5 rounded-xl animate-fade-in">
                                        <p className="text-sm font-bold text-green-800 mb-2">✅ Batch Registered Successfully!</p>
                                        <p className="text-sm font-mono text-emerald-900 break-all">Batch ID: {batchId}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Auction Creation Form */}
                        {batchId && (
                            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl overflow-hidden border-2 border-emerald-900/10 animate-slide-in-right">
                                <div className="bg-gradient-to-r from-emerald-800 to-emerald-700 p-6">
                                    <h2 className="text-2xl font-bold text-white">Create Auction</h2>
                                    <p className="text-emerald-900/5 mt-1">List your batch for buyers to bid</p>
                                </div>
                                <div className="p-8">
                                    <form onSubmit={handleAuctionCreation} className="space-y-6">
                                        <div>
                                            <label className="block text-sm font-bold mb-2 text-gray-700">Farmer ID</label>
                                            <input
                                                type="text"
                                                name="farmerId"
                                                required
                                                className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-800 focus:border-transparent transition-all"
                                                placeholder="0x..."
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-bold mb-2 text-gray-700">Auction Duration</label>
                                            <select
                                                name="durationSeconds"
                                                className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-800 focus:border-transparent transition-all bg-white"
                                            >
                                                <option value="900">15 minutes</option>
                                                <option value="3600">1 hour</option>
                                                <option value="86400">24 hours</option>
                                                <option value="604800">7 days</option>
                                            </select>
                                        </div>

                                        <div className="grid grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-sm font-bold mb-2 text-gray-700">Starting Price (USDC)</label>
                                                <input
                                                    type="text"
                                                    name="startingPrice"
                                                    required
                                                    className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-800 focus:border-transparent transition-all"
                                                    placeholder="100"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-bold mb-2 text-gray-700">Reserve Price (USDC)</label>
                                                <input
                                                    type="text"
                                                    name="reservePrice"
                                                    required
                                                    className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-800 focus:border-transparent transition-all"
                                                    placeholder="150"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-bold mb-2 text-gray-700">Delivery Location (Optional)</label>
                                            <input
                                                type="text"
                                                name="deliveryLocationHash"
                                                className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-800 focus:border-transparent transition-all"
                                                placeholder="Warehouse A, City Name"
                                            />
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={isLoading}
                                            className="w-full bg-gradient-to-r from-emerald-800 to-emerald-700 text-white py-4 font-bold rounded-lg hover:from-emerald-900 hover:to-emerald-800 disabled:from-gray-300 disabled:to-gray-300 transition-all shadow-lg hover:shadow-xl hover:scale-[1.02] disabled:hover:scale-100"
                                        >
                                            {isLoading ? (
                                                <span className="flex items-center justify-center gap-2">
                                                    <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                                                    Processing...
                                                </span>
                                            ) : (
                                                'Create Auction'
                                            )}
                                        </button>
                                    </form>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
