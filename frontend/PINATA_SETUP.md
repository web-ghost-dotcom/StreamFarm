# Pinata Setup Guide

## Why Pinata?

Pinata is a reliable IPFS pinning service that ensures your files remain accessible on IPFS. It's easier to set up than running your own IPFS node and more reliable than Infura's deprecated IPFS service.

## Setup Steps

### 1. Create a Pinata Account

Visit [https://www.pinata.cloud/](https://www.pinata.cloud/) and sign up for a free account.

**Free Tier Includes:**
- 1 GB storage
- Unlimited gateways
- 100 requests/month

### 2. Get Your API Keys

#### Option A: JWT Token (Recommended)

1. Go to [https://app.pinata.cloud/developers/api-keys](https://app.pinata.cloud/developers/api-keys)
2. Click **"New Key"**
3. Give it a name (e.g., "Agro-Data-Streams")
4. Enable permissions:
   - ✅ `pinFileToIPFS`
   - ✅ `pinJSONToIPFS`
   - ✅ `testAuthentication`
5. Click **"Create Key"**
6. **Copy the JWT token** (you won't see it again!)

#### Option B: API Key + Secret (Legacy)

1. Go to API Keys section
2. Create a new key
3. Copy both the **API Key** and **API Secret**

### 3. Configure Environment Variables

Add to your `.env.local`:

```bash
# Recommended: Use JWT
PINATA_JWT=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Or use API Key/Secret
PINATA_API_KEY=your_api_key_here
PINATA_SECRET_KEY=your_secret_key_here

# Gateway URL (public, can be in NEXT_PUBLIC_)
NEXT_PUBLIC_IPFS_GATEWAY=https://gateway.pinata.cloud/ipfs/
```

### 4. Test Your Setup

Run the test function:

```typescript
import { testPinataAuth } from '@/app/actions/ipfs';

const result = await testPinataAuth();
if (result.success) {
  console.log('✅ Pinata connected successfully!');
} else {
  console.error('❌ Pinata error:', result.error);
}
```

## Usage Examples

### Upload a File

```typescript
import { uploadToIPFS } from '@/app/actions/ipfs';

const file = new File(['Hello World'], 'hello.txt');
const { cid, error } = await uploadToIPFS(file);

if (error) {
  console.error('Upload failed:', error);
} else {
  console.log('File uploaded! CID:', cid);
  console.log('Access at:', `https://gateway.pinata.cloud/ipfs/${cid}`);
}
```

### Upload JSON Metadata

```typescript
import { uploadJSONToIPFS } from '@/app/actions/ipfs';

const metadata = {
  name: 'Organic Tomatoes',
  weight: 500,
  grade: 'A',
  harvest_date: '2025-11-15'
};

const { cid, error } = await uploadJSONToIPFS(metadata);
```

### Upload Multiple Files

```typescript
import { uploadMultipleToIPFS } from '@/app/actions/ipfs';

const files = [photo1, photo2, photo3];
const { cids, error } = await uploadMultipleToIPFS(files);

if (!error) {
  console.log('Uploaded files:', cids);
}
```

## Features in Our Implementation

### Automatic Metadata

Every upload includes:
- Filename
- Upload timestamp
- Type classification (agricultural-batch-media, agricultural-metadata)

### CIDv1 Support

Uses CIDv1 for better compatibility with modern IPFS tools and gateways.

### Error Handling

All functions return `{ cid, error }` format for easy error checking.

## Viewing Your Files

### Via Pinata Dashboard

1. Go to [https://app.pinata.cloud/pinmanager](https://app.pinata.cloud/pinmanager)
2. See all your pinned files
3. View metadata, stats, and access links

### Via IPFS Gateway

Access any file:
```
https://gateway.pinata.cloud/ipfs/{CID}
```

Or use other public gateways:
```
https://ipfs.io/ipfs/{CID}
https://cloudflare-ipfs.com/ipfs/{CID}
https://dweb.link/ipfs/{CID}
```

## Dedicated Gateway (Optional)

For production, you can set up a dedicated gateway:

1. Go to [Gateways](https://app.pinata.cloud/gateway) in Pinata
2. Create a dedicated gateway (paid feature)
3. Get custom domain like `yourapp.mypinata.cloud`
4. Update `NEXT_PUBLIC_IPFS_GATEWAY` to your custom gateway

**Benefits:**
- Faster loading
- Custom branding
- Better analytics
- No rate limits

## Security Best Practices

### ✅ DO:
- Keep JWT/API keys in `.env.local` (server-side only)
- Add `.env.local` to `.gitignore`
- Use environment-specific keys (dev/staging/prod)
- Rotate keys periodically

### ❌ DON'T:
- Commit keys to Git
- Use production keys in development
- Share keys in public channels
- Hardcode keys in source code

## Troubleshooting

### "Authentication failed"

- Check your JWT/API keys are correct
- Ensure no extra spaces in `.env.local`
- Try regenerating the keys

### "Upload failed: 413 Payload Too Large"

- Free tier has file size limits
- Compress images before upload
- Consider upgrading plan

### "Gateway timeout"

- Try a different IPFS gateway
- Wait a moment and retry (IPFS propagation)
- Check Pinata status page

## Migration from Infura IPFS

Old code:
```typescript
import { create } from 'ipfs-http-client';
const client = create({ host: 'ipfs.infura.io' });
```

New code (Pinata):
```typescript
import { uploadToIPFS } from '@/app/actions/ipfs';
const { cid } = await uploadToIPFS(file);
```

All existing file references (CIDs) remain valid and accessible via any IPFS gateway!

## Cost Comparison

| Tier      | Storage | Bandwidth | Price   |
| --------- | ------- | --------- | ------- |
| Free      | 1 GB    | Limited   | $0      |
| Picnic    | 100 GB  | 100 GB    | $20/mo  |
| Submarine | 1 TB    | 1 TB      | $200/mo |

For most agricultural applications, the free tier is sufficient during development.

## Support

- Documentation: [https://docs.pinata.cloud/](https://docs.pinata.cloud/)
- Support: support@pinata.cloud
- Status: [https://status.pinata.cloud/](https://status.pinata.cloud/)

---

**Next Steps:**
1. ✅ Get Pinata account
2. ✅ Generate JWT token
3. ✅ Add to `.env.local`
4. ✅ Test connection
5. ✅ Start uploading!
