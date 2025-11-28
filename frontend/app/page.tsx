'use client';

import Link from 'next/link';
import { ConnectButton, useWallet } from '@/lib/components/ConnectButton';

export default function Home() {
  const { isConnected } = useWallet();

  return (
    <div className="min-h-screen relative">
      {/* Header */}
      <header className="bg-gradient-to-r from-emerald-800 to-emerald-700 shadow-lg animate-fade-in relative z-10">
        <div className="max-w-7xl mx-auto px-6 py-5 flex justify-between items-center">
          <div className="flex items-center gap-3">
            {/* Logo */}
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-lg flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">StreamFarm</h1>
              <p className="text-xs text-emerald-200">Real-time Agro Trading</p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <nav className="flex gap-8">
              <Link href="/docs" className="text-white font-medium hover:text-emerald-200 transition-all hover:scale-105">
                Documentation
              </Link>
              {isConnected && (
                <Link href="/dashboard" className="text-white font-medium hover:text-emerald-200 transition-all hover:scale-105">
                  Dashboard
                </Link>
              )}
            </nav>
            <ConnectButton />
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="py-24 text-center animate-slide-in-left">
          <div className="inline-block mb-6 px-4 py-2 bg-emerald-700/20 backdrop-blur-sm rounded-full text-emerald-300 font-medium text-sm animate-pulse-soft border border-emerald-700/30">
            Powered by Somnia Blockchain
          </div>
          <h2 className="text-6xl font-bold mb-6 text-white drop-shadow-lg">
            Blockchain-Verified<br />Agricultural Provenance
          </h2>
          <p className="text-xl text-emerald-200 max-w-2xl mx-auto leading-relaxed drop-shadow-md">
            Connecting farms to tables with immutable provenance records and micro-auctions powered by Somnia Data Streams
          </p>
          <div className="mt-10 flex gap-4 justify-center">
            {isConnected ? (
              <Link
                href="/dashboard"
                className="px-8 py-4 bg-emerald-800 text-white font-semibold rounded-lg shadow-lg hover:bg-emerald-900 hover:shadow-xl hover:scale-105 transition-all backdrop-blur-sm"
              >
                Go to Dashboard
              </Link>
            ) : (
              <div className="px-8 py-4 bg-white/10 backdrop-blur-md text-white font-semibold rounded-lg border-2 border-white/30">
                Connect wallet to access dashboard
              </div>
            )}
            <Link
              href="/docs"
              className="px-8 py-4 bg-white/10 backdrop-blur-md text-white font-semibold rounded-lg border-2 border-white/30 hover:bg-white/20 hover:scale-105 transition-all"
            >
              Learn More
            </Link>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="py-16 grid md:grid-cols-2 gap-8">
          {isConnected ? (
            <Link href="/dashboard" className="group bg-white/90 backdrop-blur-sm p-8 rounded-2xl shadow-md hover:shadow-2xl border-2 border-emerald-900/10 hover:border-emerald-700 transition-all hover:scale-105">
              <div className="w-16 h-16 bg-emerald-900/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-emerald-800 transition-colors">
                <svg className="w-8 h-8 text-emerald-900 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-800">Your Dashboard</h3>
              <p className="text-gray-600 mb-4 leading-relaxed">
                Manage your listings, track bids, browse marketplace, and view your transaction history
              </p>
              <span className="text-emerald-900 font-semibold group-hover:underline">Go to Dashboard →</span>
            </Link>
          ) : (
            <div className="bg-white/90 backdrop-blur-sm p-8 rounded-2xl shadow-md border-2 border-emerald-900/10">
              <div className="w-16 h-16 bg-emerald-900/10 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-8 h-8 text-emerald-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-800">User Dashboard</h3>
              <p className="text-gray-600 mb-4 leading-relaxed">
                Connect your wallet to access your personalized dashboard with marketplace, listings, and more
              </p>
              <span className="text-gray-400 font-semibold">Connect Wallet First</span>
            </div>
          )}

          <Link href="/docs" className="group bg-white/90 backdrop-blur-sm p-8 rounded-2xl shadow-md hover:shadow-2xl border-2 border-emerald-900/10 hover:border-emerald-700 transition-all hover:scale-105">
            <div className="w-16 h-16 bg-emerald-900/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-emerald-800 transition-colors">
              <svg className="w-8 h-8 text-emerald-900 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-3 text-gray-800">Documentation</h3>
            <p className="text-gray-600 mb-4 leading-relaxed">
              Learn how to use the platform, smart contracts, and blockchain features
            </p>
            <span className="text-emerald-900 font-semibold group-hover:underline">Read Docs →</span>
          </Link>
        </div>

        {/* How It Works */}
        <div className="py-16 bg-white/90 backdrop-blur-sm rounded-3xl px-12 mb-16">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-800">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 bg-emerald-900/10 rounded-full flex items-center justify-center">
                <span className="text-2xl font-bold text-emerald-900">1</span>
              </div>
              <h3 className="font-bold text-gray-800 mb-2">Connect Wallet</h3>
              <p className="text-gray-600 text-sm">Connect your Web3 wallet to access the platform</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 bg-emerald-900/10 rounded-full flex items-center justify-center">
                <span className="text-2xl font-bold text-emerald-900">2</span>
              </div>
              <h3 className="font-bold text-gray-800 mb-2">List or Browse</h3>
              <p className="text-gray-600 text-sm">List your produce or browse the marketplace</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 bg-emerald-900/10 rounded-full flex items-center justify-center">
                <span className="text-2xl font-bold text-emerald-900">3</span>
              </div>
              <h3 className="font-bold text-gray-800 mb-2">Trade Securely</h3>
              <p className="text-gray-600 text-sm">Transparent blockchain-verified transactions</p>
            </div>
          </div>
        </div>

        {/* Technology Stack */}
        <div className="py-16 bg-gradient-to-br from-emerald-900/5 to-white rounded-3xl px-12 mb-16">
          <h3 className="text-3xl font-bold mb-12 text-center text-gray-800">Built on Cutting-Edge Technology</h3>
          <div className="grid md:grid-cols-4 gap-8">
            <div className="text-center p-6 bg-white rounded-xl shadow-sm hover:shadow-md transition-all hover:scale-105">
              <div className="w-12 h-12 mx-auto mb-4 bg-emerald-900/10 rounded-full"></div>
              <div className="font-bold text-lg mb-2 text-gray-800">Somnia Blockchain</div>
              <p className="text-sm text-gray-600">400k+ TPS, sub-second finality</p>
            </div>
            <div className="text-center p-6 bg-white rounded-xl shadow-sm hover:shadow-md transition-all hover:scale-105">
              <div className="w-12 h-12 mx-auto mb-4 bg-emerald-900/10 rounded-full"></div>
              <div className="font-bold text-lg mb-2 text-gray-800">Data Streams</div>
              <p className="text-sm text-gray-600">Real-time queryable on-chain data</p>
            </div>
            <div className="text-center p-6 bg-white rounded-xl shadow-sm hover:shadow-md transition-all hover:scale-105">
              <div className="w-12 h-12 mx-auto mb-4 bg-emerald-900/10 rounded-full"></div>
              <div className="font-bold text-lg mb-2 text-gray-800">IPFS Storage</div>
              <p className="text-sm text-gray-600">Decentralized media hosting</p>
            </div>
            <div className="text-center p-6 bg-white rounded-xl shadow-sm hover:shadow-md transition-all hover:scale-105">
              <div className="w-12 h-12 mx-auto mb-4 bg-emerald-900/10 rounded-full"></div>
              <div className="font-bold text-lg mb-2 text-gray-800">Smart Contracts</div>
              <p className="text-sm text-gray-600">Automated escrow & reputation</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="py-16 grid md:grid-cols-3 gap-12 text-center mb-16">
          <div>
            <div className="text-5xl font-bold mb-3 text-white drop-shadow-lg">100%</div>
            <div className="text-emerald-200 font-medium">Immutable Provenance</div>
          </div>
          <div>
            <div className="text-5xl font-bold mb-3 text-white drop-shadow-lg">&lt;1s</div>
            <div className="text-emerald-200 font-medium">Transaction Finality</div>
          </div>
          <div>
            <div className="text-5xl font-bold mb-3 text-white drop-shadow-lg">0%</div>
            <div className="text-emerald-200 font-medium">Data Tampering Risk</div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gradient-to-r from-emerald-800 to-emerald-700 mt-16 relative z-10">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-lg flex items-center justify-center shadow-lg">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <h4 className="text-white font-bold">StreamFarm</h4>
              </div>
              <p className="text-emerald-200 text-sm">
                Real-time agricultural trading powered by blockchain technology and Somnia Data Streams
              </p>
            </div>
            <div>
              <h4 className="text-white font-bold mb-3">Quick Links</h4>
              <div className="space-y-2">
                <Link href="/dashboard" className="block text-emerald-200 text-sm hover:text-white transition-colors">
                  Dashboard
                </Link>
                <Link href="/docs" className="block text-emerald-200 text-sm hover:text-white transition-colors">
                  Documentation
                </Link>
              </div>
            </div>
            <div>
              <h4 className="text-white font-bold mb-3">Technology</h4>
              <div className="text-emerald-200 text-sm space-y-1">
                <p>Somnia Blockchain</p>
                <p>IPFS Storage</p>
                <p>Smart Contracts</p>
              </div>
            </div>
          </div>
          <div className="pt-6 border-t border-emerald-600 text-center">
            <p className="text-emerald-200 text-sm">
              Built on Somnia • Secured by Blockchain • Powered by Data Streams
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

