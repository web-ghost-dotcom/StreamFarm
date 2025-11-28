import { NextRequest, NextResponse } from 'next/server';
import { getSomniaService } from '@/lib/somnia/service';
import { keccak256, toHex } from 'viem';

/**
 * POST /api/auctions
 * Create a new auction
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        const {
            batchId,
            farmerId,
            durationSeconds,
            startingPrice,
            reservePrice,
            deliveryLocationHash
        } = body;

        if (!batchId || !farmerId || !durationSeconds || !startingPrice || !reservePrice) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Generate auction ID
        const auctionId = keccak256(toHex(`auction-${Date.now()}-${batchId}`));

        const now = BigInt(Math.floor(Date.now() / 1000));
        const endTime = now + BigInt(durationSeconds);

        const auctionData = {
            auctionId: auctionId as `0x${string}`,
            batchId: batchId as `0x${string}`,
            farmerId: farmerId as `0x${string}`,
            startTimestamp: now,
            endTimestamp: endTime,
            startingPrice: BigInt(startingPrice),
            reservePrice: BigInt(reservePrice),
            highestBid: 0n,
            highestBidder: '0x0000000000000000000000000000000000000000' as `0x${string}`,
            status: 0, // Open
            deliveryLocationHash: deliveryLocationHash || ''
        };

        const somniaService = getSomniaService();
        const txHash = await somniaService.publishAuction(auctionData);

        return NextResponse.json({
            success: true,
            auctionId,
            txHash,
            data: {
                ...auctionData,
                startTimestamp: auctionData.startTimestamp.toString(),
                endTimestamp: auctionData.endTimestamp.toString(),
                startingPrice: auctionData.startingPrice.toString(),
                reservePrice: auctionData.reservePrice.toString(),
            }
        });

    } catch (error) {
        console.error('Auction creation error:', error);
        return NextResponse.json(
            { error: 'Failed to create auction' },
            { status: 500 }
        );
    }
}

/**
 * GET /api/auctions?publisher=0x...
 * Get active auctions
 */
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const publisher = searchParams.get('publisher') as `0x${string}`;

        if (!publisher) {
            return NextResponse.json(
                { error: 'publisher required' },
                { status: 400 }
            );
        }

        const somniaService = getSomniaService();
        const auctions = await somniaService.getActiveAuctions(publisher);

        return NextResponse.json({
            success: true,
            data: auctions
        });

    } catch (error) {
        console.error('Auctions fetch error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch auctions' },
            { status: 500 }
        );
    }
}
