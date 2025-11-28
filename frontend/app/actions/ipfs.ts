'use server';

const PINATA_API_KEY = process.env.PINATA_API_KEY;
const PINATA_SECRET_KEY = process.env.PINATA_SECRET_KEY;
const PINATA_JWT = process.env.PINATA_JWT;

if (!PINATA_JWT && (!PINATA_API_KEY || !PINATA_SECRET_KEY)) {
    console.warn('Pinata credentials not configured. Set PINATA_JWT or PINATA_API_KEY/PINATA_SECRET_KEY');
}

/**
 * Upload a file to IPFS via Pinata and return the CID
 */
export async function uploadToIPFS(file: File): Promise<{ cid: string; error?: string }> {
    try {
        const formData = new FormData();
        formData.append('file', file);

        // Optional: Add metadata
        const metadata = JSON.stringify({
            name: file.name,
            keyvalues: {
                uploadedAt: new Date().toISOString(),
                type: 'agricultural-batch-media'
            }
        });
        formData.append('pinataMetadata', metadata);

        // Optional: Add pinning options
        const options = JSON.stringify({
            cidVersion: 1
        });
        formData.append('pinataOptions', options);

        const headers: HeadersInit = PINATA_JWT
            ? { 'Authorization': `Bearer ${PINATA_JWT}` }
            : {
                'pinata_api_key': PINATA_API_KEY!,
                'pinata_secret_api_key': PINATA_SECRET_KEY!
            };

        const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
            method: 'POST',
            headers,
            body: formData
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Pinata upload failed');
        }

        const data = await response.json();

        return {
            cid: data.IpfsHash
        };
    } catch (error) {
        console.error('Pinata upload error:', error);
        return {
            cid: '',
            error: error instanceof Error ? error.message : 'Upload failed'
        };
    }
}

/**
 * Upload JSON metadata to IPFS via Pinata
 */
export async function uploadJSONToIPFS(data: object): Promise<{ cid: string; error?: string }> {
    try {
        const headers: HeadersInit = PINATA_JWT
            ? {
                'Authorization': `Bearer ${PINATA_JWT}`,
                'Content-Type': 'application/json'
            }
            : {
                'pinata_api_key': PINATA_API_KEY!,
                'pinata_secret_api_key': PINATA_SECRET_KEY!,
                'Content-Type': 'application/json'
            };

        const body = JSON.stringify({
            pinataContent: data,
            pinataMetadata: {
                name: 'metadata.json',
                keyvalues: {
                    uploadedAt: new Date().toISOString(),
                    type: 'agricultural-metadata'
                }
            },
            pinataOptions: {
                cidVersion: 1
            }
        });

        const response = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
            method: 'POST',
            headers,
            body
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Pinata JSON upload failed');
        }

        const responseData = await response.json();

        return {
            cid: responseData.IpfsHash
        };
    } catch (error) {
        console.error('Pinata JSON upload error:', error);
        return {
            cid: '',
            error: error instanceof Error ? error.message : 'Upload failed'
        };
    }
}

/**
 * Upload multiple files to IPFS via Pinata and return array of CIDs
 */
export async function uploadMultipleToIPFS(files: File[]): Promise<{ cids: string[]; error?: string }> {
    try {
        const cids: string[] = [];

        for (const file of files) {
            const result = await uploadToIPFS(file);
            if (result.error) {
                throw new Error(result.error);
            }
            cids.push(result.cid);
        }

        return { cids };
    } catch (error) {
        console.error('Pinata multiple upload error:', error);
        return {
            cids: [],
            error: error instanceof Error ? error.message : 'Upload failed'
        };
    }
}

/**
 * Check Pinata authentication
 */
export async function testPinataAuth(): Promise<{ success: boolean; error?: string }> {
    try {
        const headers: HeadersInit = PINATA_JWT
            ? { 'Authorization': `Bearer ${PINATA_JWT}` }
            : {
                'pinata_api_key': PINATA_API_KEY!,
                'pinata_secret_api_key': PINATA_SECRET_KEY!
            };

        const response = await fetch('https://api.pinata.cloud/data/testAuthentication', {
            method: 'GET',
            headers
        });

        if (!response.ok) {
            throw new Error('Authentication failed');
        }

        await response.json();
        return {
            success: true,
            error: undefined
        };
    } catch (error) {
        console.error('Pinata auth test error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Auth test failed'
        };
    }
}
