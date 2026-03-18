import { STABLE_ERROR } from '@/lib/errors';

export type StableErrorLike = { message?: string } | Error | unknown;

export function getStableErrorCode(err: StableErrorLike): string | null {
  const msg = (err as any)?.message;
  if (!msg || typeof msg !== 'string') return null;

  const codes = Object.values(STABLE_ERROR);
  return codes.includes(msg as any) ? msg : null;
}

export function formatErrorForMessage(err: StableErrorLike): string {
  const stableCode = getStableErrorCode(err);
  if (stableCode) return `${stableCode}`;
  return (err as any)?.message || 'Error inesperado';
}
