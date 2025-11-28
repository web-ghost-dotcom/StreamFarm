import { NextRequest, NextResponse } from 'next/server';
import { getSomniaService } from '@/lib/somnia/service';
import { keccak256, toHex } from 'viem';

/**
 * POST /api/batches
 * Register a new produce batch
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Validate required fields
        const { cropType, weightKg, qualityGrade, farmerId, locationHash, mediaCid } = body;

        if (!cropType || !weightKg || !qualityGrade || !farmerId || !locationHash || !mediaCid) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Generate batch ID
        const batchId = keccak256(toHex(`batch-${Date.now()}-${farmerId}`));

        // Prepare batch data
        const batchData = {
            batchId: batchId as `0x${string}`,
            harvestTimestamp: BigInt(Math.floor(Date.now() / 1000)),
            cropType,
            weightKg: Number(weightKg),
            qualityGrade: Number(qualityGrade),
            farmerId: farmerId as `0x${string}`,
            locationHash,
            mediaCid,
            labTestCidHash: body.labTestCidHash as `0x${string}` | undefined
        };

        // Publish to Somnia Streams
        const somniaService = getSomniaService();
        const txHash = await somniaService.publishBatch(batchData);

        return NextResponse.json({
            success: true,
            batchId,
            txHash,
            data: {
                ...batchData,
                harvestTimestamp: batchData.harvestTimestamp.toString()
            }
        });

    } catch (error) {
        console.error('Batch registration error:', error);
        return NextResponse.json(
            { error: 'Failed to register batch' },
            { status: 500 }
        );
    }
}

/**
 * GET /api/batches?batchId=0x...&publisher=0x...
 * Get batch details
 */
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const batchId = searchParams.get('batchId') as `0x${string}`;
        const publisher = searchParams.get('publisher') as `0x${string}`;

        if (!batchId || !publisher) {
            return NextResponse.json(
                { error: 'batchId and publisher required' },
                { status: 400 }
            );
        }

        const somniaService = getSomniaService();
        const data = await somniaService.getBatch(batchId, publisher);

        return NextResponse.json({
            success: true,
            data
        });

    } catch (error) {
        console.error('Batch fetch error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch batch' },
            { status: 500 }
        );
    }
}
