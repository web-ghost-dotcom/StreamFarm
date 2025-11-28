import Link from 'next/link';

export default function Documentation() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-gray-900 to-emerald-800">
            {/* Header */}
            <header className="bg-emerald-800/50 backdrop-blur-md shadow-lg sticky top-0 z-10 border-b border-emerald-700/30">
                <div className="max-w-7xl mx-auto px-6 py-5 flex justify-between items-center">
                    <Link href="/" className="flex items-center gap-3 group">
                        <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-lg flex items-center justify-center shadow-lg">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                            </svg>
                        </div>
                        <span className="text-xl font-bold text-white group-hover:text-emerald-200 transition-colors">StreamFarm</span>
                    </Link>
                    <nav className="flex items-center gap-6">
                        <Link href="/marketplace" className="text-emerald-200 hover:text-white font-medium transition-colors">
                            Marketplace
                        </Link>
                        <Link href="/dashboard" className="text-emerald-200 hover:text-white font-medium transition-colors">
                            Dashboard
                        </Link>
                    </nav>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-12">
                <div className="bg-white/90 backdrop-blur-sm p-12 rounded-2xl shadow-lg border-2 border-emerald-900/10">
                    <h1 className="text-4xl font-bold text-gray-800 mb-8">Documentation</h1>

                    {/* Getting Started */}
                    <section className="mb-12">
                        <h2 className="text-3xl font-bold text-emerald-900 mb-6">Getting Started</h2>
                        <div className="space-y-4 text-gray-700">
                            <p className="text-lg">Welcome to StreamFarm - a real-time agricultural marketplace powered by Somnia Data Streams.</p>
                            <div className="bg-emerald-900/5 p-6 rounded-lg border-2 border-emerald-900/10">
                                <h3 className="font-bold text-xl mb-3 text-gray-800">Quick Start</h3>
                                <ol className="list-decimal list-inside space-y-2">
                                    <li>Connect your Web3 wallet (MetaMask, WalletConnect, etc.)</li>
                                    <li>Access your dashboard to manage products and auctions</li>
                                    <li>Browse the marketplace to discover fresh produce</li>
                                    <li>Create auctions to sell or place bids to buy</li>
                                </ol>
                            </div>
                        </div>
                    </section>

                    {/* Features */}
                    <section className="mb-12">
                        <h2 className="text-3xl font-bold text-emerald-900 mb-6">Features</h2>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="p-6 bg-emerald-900/5 rounded-lg border-2 border-emerald-900/10">
                                <h3 className="font-bold text-xl mb-3 text-gray-800">Marketplace</h3>
                                <p className="text-gray-700">Browse live auctions, filter by status, and place bids on fresh agricultural products from verified sellers.</p>
                            </div>
                            <div className="p-6 bg-emerald-900/5 rounded-lg border-2 border-emerald-900/10">
                                <h3 className="font-bold text-xl mb-3 text-gray-800">Dashboard</h3>
                                <p className="text-gray-700">Manage your products, track active listings, view transaction history, and access your wallet balance.</p>
                            </div>
                            <div className="p-6 bg-emerald-900/5 rounded-lg border-2 border-emerald-900/10">
                                <h3 className="font-bold text-xl mb-3 text-gray-800">Create Auctions</h3>
                                <p className="text-gray-700">List your produce with photos, pricing, and delivery details. All data is stored on IPFS and verified on-chain.</p>
                            </div>
                            <div className="p-6 bg-emerald-900/5 rounded-lg border-2 border-emerald-900/10">
                                <h3 className="font-bold text-xl mb-3 text-gray-800">Blockchain Security</h3>
                                <p className="text-gray-700">All transactions are secured by Somnia blockchain with sub-second finality and 400k+ TPS capacity.</p>
                            </div>
                        </div>
                    </section>

                    {/* Technology Stack */}
                    <section className="mb-12">
                        <h2 className="text-3xl font-bold text-emerald-900 mb-6">Technology Stack</h2>
                        <div className="space-y-4">
                            <div className="p-6 border-l-4 border-emerald-800 bg-gray-50 rounded-r-lg">
                                <h3 className="font-bold text-lg text-gray-800 mb-2">Somnia Blockchain</h3>
                                <p className="text-gray-700">High-performance EVM-compatible blockchain with 400,000+ transactions per second and sub-second finality.</p>
                            </div>
                            <div className="p-6 border-l-4 border-emerald-800 bg-gray-50 rounded-r-lg">
                                <h3 className="font-bold text-lg text-gray-800 mb-2">IPFS Storage</h3>
                                <p className="text-gray-700">Decentralized file storage via Pinata for product images and provenance data.</p>
                            </div>
                            <div className="p-6 border-l-4 border-emerald-800 bg-gray-50 rounded-r-lg">
                                <h3 className="font-bold text-lg text-gray-800 mb-2">Smart Contracts</h3>
                                <p className="text-gray-700">Solidity smart contracts for batch registry, auction management, escrow, and reputation systems.</p>
                            </div>
                            <div className="p-6 border-l-4 border-emerald-800 bg-gray-50 rounded-r-lg">
                                <h3 className="font-bold text-lg text-gray-800 mb-2">Data Streams</h3>
                                <p className="text-gray-700">Real-time queryable on-chain data for auction updates, bid notifications, and provenance tracking.</p>
                            </div>
                        </div>
                    </section>

                    {/* Smart Contracts */}
                    <section className="mb-12">
                        <h2 className="text-3xl font-bold text-emerald-900 mb-6">Smart Contracts</h2>
                        <div className="bg-gray-50 p-6 rounded-lg border-2 border-gray-200">
                            <p className="text-gray-700 mb-4">Our platform uses the following smart contracts deployed on Somnia Testnet:</p>
                            <div className="space-y-3 font-mono text-sm">
                                <div className="flex items-center gap-3">
                                    <span className="text-emerald-900 font-bold">BatchRegistry:</span>
                                    <code className="bg-white px-3 py-1 rounded border border-gray-300">See deployed addresses</code>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-emerald-900 font-bold">AuctionManager:</span>
                                    <code className="bg-white px-3 py-1 rounded border border-gray-300">See deployed addresses</code>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-emerald-900 font-bold">EscrowManager:</span>
                                    <code className="bg-white px-3 py-1 rounded border border-gray-300">See deployed addresses</code>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-emerald-900 font-bold">ReputationSystem:</span>
                                    <code className="bg-white px-3 py-1 rounded border border-gray-300">See deployed addresses</code>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* FAQ */}
                    <section>
                        <h2 className="text-3xl font-bold text-emerald-900 mb-6">Frequently Asked Questions</h2>
                        <div className="space-y-4">
                            <div className="bg-gray-50 p-6 rounded-lg border-2 border-gray-200">
                                <h3 className="font-bold text-lg text-gray-800 mb-2">How do I connect my wallet?</h3>
                                <p className="text-gray-700">Click the &quot;Connect Wallet&quot; button in the header. You can use MetaMask, WalletConnect, or any compatible Web3 wallet. Make sure you&apos;re connected to Somnia Testnet.</p>
                            </div>
                            <div className="bg-gray-50 p-6 rounded-lg border-2 border-gray-200">
                                <h3 className="font-bold text-lg text-gray-800 mb-2">How do I create an auction?</h3>
                                <p className="text-gray-700">Go to your Dashboard and click &quot;Create Auction&quot;. Fill in the product details, upload photos, set your starting price and duration, then submit. Your auction will be live immediately.</p>
                            </div>
                            <div className="bg-gray-50 p-6 rounded-lg border-2 border-gray-200">
                                <h3 className="font-bold text-lg text-gray-800 mb-2">Are transactions secure?</h3>
                                <p className="text-gray-700">Yes! All transactions are secured by Somnia blockchain. Funds are held in escrow smart contracts until delivery is confirmed. The blockchain ensures immutable, transparent records.</p>
                            </div>
                            <div className="bg-gray-50 p-6 rounded-lg border-2 border-gray-200">
                                <h3 className="font-bold text-lg text-gray-800 mb-2">What fees are involved?</h3>
                                <p className="text-gray-700">Gas fees on Somnia are minimal due to its high-performance architecture. Platform fees (if any) are displayed before transaction confirmation.</p>
                            </div>
                        </div>
                    </section>
                </div>
            </main>
        </div>
    );
}
