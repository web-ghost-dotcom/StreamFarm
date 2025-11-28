import { NextRequest, NextResponse } from 'next/server';
import { getSomniaService } from '@/lib/somnia/service';

/**
 * POST /api/bids
 * Place a bid on an auction
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        const { auctionId, bidder, amount } = body;

        if (!auctionId || !bidder || !amount) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        const bidData = {
            auctionId: auctionId as `0x${string}`,
            bidder: bidder as `0x${string}`,
            amount: BigInt(amount),
            timestamp: BigInt(Math.floor(Date.now() / 1000)),
            isWinning: true // Will be validated by smart contract
        };

        const somniaService = getSomniaService();
        const txHash = await somniaService.publishBid(bidData);

        return NextResponse.json({
            success: true,
            txHash,
            data: {
                ...bidData,
                amount: bidData.amount.toString(),
                timestamp: bidData.timestamp.toString()
            }
        });

    } catch (error) {
        console.error('Bid placement error:', error);
        return NextResponse.json(
            { error: 'Failed to place bid' },
            { status: 500 }
        );
    }
}
