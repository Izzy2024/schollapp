import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import type { StorageAdapter } from './types';

// ponytail: filesystem storage — fine for a single-instance dev/demo deploy,
// breaks on serverless/multi-instance hosting (Vercel). Upgrade: set
// BLOB_READ_WRITE_TOKEN to switch to the Vercel Blob adapter (see index.ts).
export const localStorageAdapter: StorageAdapter = {
  async upload({ tenantId, fileName, contentType, buffer }) {
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', tenantId);
    await fs.mkdir(uploadDir, { recursive: true });

    const ext = path.extname(fileName);
    const uniqueFilename = `${randomUUID()}${ext}`;
    const filePath = path.join(uploadDir, uniqueFilename);
    const fileUrl = `/uploads/${tenantId}/${uniqueFilename}`;

    await fs.writeFile(filePath, buffer);
    void contentType; // local adapter serves static files as-is, content-type comes from the DB record

    return { fileKey: fileUrl, fileUrl };
  },

  async remove(fileKey) {
    try {
      const relativePath = fileKey.startsWith('/') ? fileKey.slice(1) : fileKey;
      const physicalPath = path.join(process.cwd(), 'public', relativePath);
      await fs.unlink(physicalPath);
    } catch (err) {
      console.error('Error deleting local file (it might have been deleted already):', err);
    }
  },
};
