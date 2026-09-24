import { put, del, get } from '@vercel/blob';
import { randomUUID } from 'crypto';
import path from 'path';
import type { StorageAdapter } from './types';

// Activates when BLOB_READ_WRITE_TOKEN is set (see index.ts). Requires a
// Vercel Blob store provisioned on the project; no further code changes needed.
//
// SEG-H7: blobs are stored private (no adivinable public URL) and served only
// through the authenticated route /api/files/[id] with
// Content-Disposition: attachment.
export const blobStorageAdapter: StorageAdapter = {
  async upload({ tenantId, fileName, contentType, buffer }) {
    const ext = path.extname(fileName);
    const key = `${tenantId}/${randomUUID()}${ext}`;

    const blob = await put(key, buffer, {
      access: 'private',
      contentType,
    });

    return { fileKey: blob.url, fileUrl: blob.url };
  },

  async remove(fileKey) {
    await del(fileKey);
  },

  async read(fileKey) {
    const res = await get(fileKey, {
      access: 'private',
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    if (!res || res.stream === null) {
      throw new Error('Archivo no encontrado');
    }
    return Buffer.from(await new Response(res.stream).arrayBuffer());
  },
};
