import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import type { StorageAdapter } from './types';

// ponytail: filesystem storage — fine for a single-instance dev/demo deploy,
// breaks on serverless/multi-instance hosting (Vercel). Upgrade: set
// BLOB_READ_WRITE_TOKEN to switch to the Vercel Blob adapter (see index.ts).
//
// SEG-H7: files are stored OUTSIDE public/ (under .uploads/) so Next never
// serves them as static files, and downloads go through the authenticated
// route /api/files/[id] with Content-Disposition: attachment (an uploaded
// .html/.svg can no longer execute inline as stored XSS).
const LOCAL_UPLOAD_ROOT = '.uploads';

/** Resolves a fileKey to an absolute path, contained in .uploads/ (new keys)
 *  or public/ (legacy keys from before the move, so old remove() calls still work). */
function resolveLocalPath(fileKey: string): string {
  const relative = fileKey.startsWith('/') ? path.join('public', fileKey.slice(1)) : fileKey;
  const abs = path.resolve(process.cwd(), relative);
  const allowedRoots = [
    path.resolve(process.cwd(), LOCAL_UPLOAD_ROOT) + path.sep,
    path.resolve(process.cwd(), 'public') + path.sep,
  ];
  if (!allowedRoots.some((root) => abs.startsWith(root))) {
    throw new Error('Ruta de archivo inválida');
  }
  return abs;
}

/** Extension sanitized to alnum + dot so a hostile fileName can't escape the upload dir. */
function safeExtension(fileName: string): string {
  return path.extname(fileName).replace(/[^a-zA-Z0-9.]/g, '').slice(0, 10);
}

export const localStorageAdapter: StorageAdapter = {
  async upload({ tenantId, fileName, contentType, buffer }) {
    const uploadDir = path.join(process.cwd(), LOCAL_UPLOAD_ROOT, tenantId);
    await fs.mkdir(uploadDir, { recursive: true });

    const uniqueFilename = `${randomUUID()}${safeExtension(fileName)}`;
    const filePath = path.join(uploadDir, uniqueFilename);

    await fs.writeFile(filePath, buffer);
    void contentType; // content-type comes from the DB record at download time

    const fileKey = path.join(LOCAL_UPLOAD_ROOT, tenantId, uniqueFilename);
    // fileUrl is a placeholder: callers (attachments.ts uploadAttachment)
    // rewrite it to the authenticated route /api/files/<attachmentId>.
    return { fileKey, fileUrl: fileKey };
  },

  async remove(fileKey) {
    try {
      await fs.unlink(resolveLocalPath(fileKey));
    } catch (err) {
      console.error('Error deleting local file (it might have been deleted already):', err);
    }
  },

  async read(fileKey) {
    return fs.readFile(resolveLocalPath(fileKey));
  },
};
