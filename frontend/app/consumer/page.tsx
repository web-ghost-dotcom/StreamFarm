'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Hex } from 'viem';
import { ConnectButton } from '@/lib/components/ConnectButton';

interface BatchProvenance {
    batchId: Hex;
    harvestTimestamp: string;
    cropType: string;
    weightKg: number;
    qualityGrade: number;
    farmerId: string;
    locationHash: string;
    mediaCid: string;
    labTestCidHash?: string;
}

export default function ConsumerPage() {
    const [batchId, setBatchId] = useState('');
    const [provenance, setProvenance] = useState<BatchProvenance | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleScan = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        setProvenance(null);

        try {
            // In production, you'd scan QR code to get batchId
            // For now, manual entry

            const response = await fetch(
                `/api/batches?batchId=${batchId}&publisher=${process.env.NEXT_PUBLIC_PUBLISHER_ADDRESS}`
            );

            const data = await response.json();

            if (!data.success) {
                setError('Batch not found');
                return;
            }

            setProvenance(data.data);

        } catch (err) {
            console.error('Fetch error:', err);
            setError('Failed to fetch batch information');
        } finally {
            setIsLoading(false);
        }
    };

    const formatDate = (timestamp: string) => {
        return new Date(parseInt(timestamp) * 1000).toLocaleString();
    };

    const getIpfsUrl = (cid: string) => {
        return `https://ipfs.io/ipfs/${cid}`;
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
                            <Link href="/buyer" className="text-sm text-emerald-200 hover:text-white transition-colors">
                                Buyers
                            </Link>
                            <Link href="/consumer" className="text-sm font-medium text-white border-b-2 border-white pb-1">
                                Consumers
                            </Link>
                        </nav>
                        <ConnectButton />
                    </div>
                </div>
            </header>

            <div className="max-w-3xl mx-auto px-6 py-12 relative z-10">
                <div className="text-center mb-12 animate-fade-in">
                    <h1 className="text-4xl font-bold mb-3 text-white drop-shadow-lg">
                        Verify Provenance
                    </h1>
                    <p className="text-emerald-900/10 drop-shadow-md">Enter batch ID to view complete product history</p>
                </div>

                {/* Scanner / Manual Entry */}
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border-2 border-emerald-900/10 mb-12 animate-slide-in-left">
                    <div className="bg-gradient-to-r from-emerald-800 to-emerald-700 p-6 rounded-t-2xl">
                        <h2 className="text-2xl font-bold text-white">Scan or Enter Batch ID</h2>
                    </div>
                    <div className="p-8">
                        <form onSubmit={handleScan} className="space-y-6">
                            <div>
                                <label className="block text-sm font-bold mb-3 text-gray-700">Batch ID</label>
                                <input
                                    type="text"
                                    value={batchId}
                                    onChange={(e) => setBatchId(e.target.value)}
                                    placeholder="Enter batch ID..."
                                    className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-emerald-800 focus:border-transparent transition-all"
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full bg-gradient-to-r from-emerald-800 to-emerald-700 text-white py-4 rounded-lg font-bold hover:scale-[1.02] transition-transform shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isLoading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                                        Verifying...
                                    </span>
                                ) : (
                                    'Verify'
                                )}
                            </button>
                        </form>

                        {error && (
                            <div className="mt-6 p-4 border-2 border-red-300 bg-red-50 text-red-700 text-sm rounded-lg animate-fade-in">
                                {error}
                            </div>
                        )}
                    </div>
                </div>

                {/* Provenance Information */}
                {provenance && (
                    <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border-2 border-emerald-900/10 animate-fade-in">
                        <div className="bg-gradient-to-r from-emerald-800 to-emerald-700 p-6 rounded-t-2xl">
                            <h2 className="text-2xl font-bold text-white">Verified Authentic</h2>
                        </div>

                        <div className="p-8 space-y-8">
                            {/* Product Images */}
                            {provenance.mediaCid && (
                                <div>
                                    <h3 className="font-bold text-lg mb-4 text-gray-800">Product Photo</h3>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={getIpfsUrl(provenance.mediaCid)}
                                        alt="Product"
                                        className="w-full rounded-lg border-2 border-emerald-900/10 shadow-md"
                                    />
                                </div>
                            )}

                            {/* Product Details */}
                            <div>
                                <h3 className="font-bold text-lg mb-4 text-gray-800">Product Information</h3>
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="bg-emerald-900/5 p-4 rounded-lg border border-emerald-300">
                                        <div className="text-sm text-green-700 mb-1 font-medium">Crop Type</div>
                                        <div className="font-bold text-gray-800">{provenance.cropType}</div>
                                    </div>
                                    <div className="bg-emerald-900/5 p-4 rounded-lg border border-emerald-300">
                                        <div className="text-sm text-green-700 mb-1 font-medium">Weight</div>
                                        <div className="font-bold text-gray-800">{provenance.weightKg} kg</div>
                                    </div>
                                    <div className="bg-emerald-900/5 p-4 rounded-lg border border-emerald-300">
                                        <div className="text-sm text-green-700 mb-1 font-medium">Quality Grade</div>
                                        <div className="font-bold text-gray-800">{provenance.qualityGrade}/5</div>
                                    </div>
                                    <div className="bg-emerald-900/5 p-4 rounded-lg border border-emerald-300">
                                        <div className="text-sm text-green-700 mb-1 font-medium">Harvest Date</div>
                                        <div className="font-bold text-gray-800">{formatDate(provenance.harvestTimestamp)}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Farmer Information */}
                            <div className="border-t-2 border-emerald-900/10 pt-8">
                                <h3 className="font-bold text-lg mb-4 text-gray-800">Farm Information</h3>
                                <div className="space-y-4">
                                    <div className="bg-emerald-900/5 p-4 rounded-lg border border-emerald-300">
                                        <div className="text-sm text-green-700 mb-2 font-medium">Farmer ID</div>
                                        <div className="font-mono text-xs break-all text-gray-700">{provenance.farmerId}</div>
                                    </div>
                                    <div className="bg-emerald-900/5 p-4 rounded-lg border border-emerald-300">
                                        <div className="text-sm text-green-700 mb-2 font-medium">Location Hash</div>
                                        <div className="font-mono text-xs text-gray-700">{provenance.locationHash}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Lab Test Results */}
                            {provenance.labTestCidHash && (
                                <div className="border-t-2 border-emerald-900/10 pt-8">
                                    <h3 className="font-bold text-lg mb-4 text-gray-800">Lab Test Results</h3>
                                    <a
                                        href={getIpfsUrl(provenance.labTestCidHash)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-block border-2 border-emerald-800 text-green-700 px-6 py-3 text-sm font-bold hover:bg-emerald-800 hover:text-white transition-all rounded-lg shadow-md hover:scale-[1.02]"
                                    >
                                        View Certificate
                                    </a>
                                </div>
                            )}

                            {/* Blockchain Verification */}
                            <div className="border-t-2 border-emerald-900/10 pt-8">
                                <h3 className="font-bold text-lg mb-4 text-gray-800">Blockchain Verification</h3>
                                <div className="bg-gradient-to-br from-emerald-900/5 to-white p-6 rounded-lg border-2 border-emerald-300 space-y-4 shadow-sm">
                                    <div>
                                        <div className="text-xs text-green-700 mb-2 font-bold">Batch ID</div>
                                        <div className="font-mono text-xs break-all text-gray-700">{provenance.batchId}</div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 bg-emerald-800 rounded-full animate-pulse"></div>
                                        <div className="text-sm text-green-700 font-medium">
                                            Verified on Somnia Blockchain
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
