import type { StorageAdapter } from './types';

export type { StorageAdapter, StoredFile } from './types';

/** Picks the object-storage backend: Vercel Blob if configured, local filesystem otherwise (dev default). */
export async function getStorageAdapter(): Promise<StorageAdapter> {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { blobStorageAdapter } = await import('./blob-adapter');
    return blobStorageAdapter;
  }
  const { localStorageAdapter } = await import('./local-adapter');
  return localStorageAdapter;
}
