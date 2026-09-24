// Shared upload policy for attachments.ts and submissions.ts (SEG-H7).
// Kept in a plain module (no 'use server') so both server actions import it
// without duplicating the whitelist.
export const ALLOWED_UPLOAD_TYPES: ReadonlySet<string> = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);

export const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export type UploadPolicyViolation = 'type' | 'size';

/** Returns the violation kind, or null when the file passes the policy. */
export function checkUploadPolicy(file: { type: string; size: number }): UploadPolicyViolation | null {
  if (!ALLOWED_UPLOAD_TYPES.has(file.type)) return 'type';
  if (file.size > MAX_UPLOAD_SIZE_BYTES) return 'size';
  return null;
}
