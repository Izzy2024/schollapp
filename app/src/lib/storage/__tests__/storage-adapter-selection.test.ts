import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';

import { getStorageAdapter } from '@/lib/storage';

describe('storage adapter selection — NO mock.module', () => {
  const originalToken = process.env.BLOB_READ_WRITE_TOKEN;

  after(() => {
    if (originalToken === undefined) delete process.env.BLOB_READ_WRITE_TOKEN;
    else process.env.BLOB_READ_WRITE_TOKEN = originalToken;
  });

  it('picks the local filesystem adapter when no blob token is configured', async () => {
    delete process.env.BLOB_READ_WRITE_TOKEN;
    const adapter = await getStorageAdapter();
    assert.equal(typeof adapter.upload, 'function');
    assert.equal(typeof adapter.remove, 'function');

    const { localStorageAdapter } = await import('@/lib/storage/local-adapter');
    assert.equal(adapter, localStorageAdapter);
  });

  it('picks the Vercel Blob adapter when BLOB_READ_WRITE_TOKEN is set', async () => {
    process.env.BLOB_READ_WRITE_TOKEN = 'test-token';
    const adapter = await getStorageAdapter();

    const { blobStorageAdapter } = await import('@/lib/storage/blob-adapter');
    assert.equal(adapter, blobStorageAdapter);
  });
});
