import { put, del } from '@vercel/blob';
import { randomUUID } from 'crypto';
import path from 'path';
import type { StorageAdapter } from './types';

// Activates when BLOB_READ_WRITE_TOKEN is set (see index.ts). Requires a
// Vercel Blob store provisioned on the project; no further code changes needed.
export const blobStorageAdapter: StorageAdapter = {
  async upload({ tenantId, fileName, contentType, buffer }) {
    const ext = path.extname(fileName);
    const key = `${tenantId}/${randomUUID()}${ext}`;

    const blob = await put(key, buffer, {
      access: 'public',
      contentType,
    });

    return { fileKey: blob.url, fileUrl: blob.url };
  },

  async remove(fileKey) {
    await del(fileKey);
  },
};
