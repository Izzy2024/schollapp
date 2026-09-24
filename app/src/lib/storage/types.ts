export type StoredFile = {
  /** Opaque identifier the adapter needs to delete the file later (local: relative path, blob: blob URL). */
  fileKey: string;
  /** Public URL clients can use to fetch/display the file. */
  fileUrl: string;
};

export interface StorageAdapter {
  upload(params: {
    tenantId: string;
    fileName: string;
    contentType: string;
    buffer: Buffer;
  }): Promise<StoredFile>;
  remove(fileKey: string): Promise<void>;
}
