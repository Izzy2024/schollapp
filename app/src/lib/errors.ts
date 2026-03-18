export const STABLE_ERROR = {
  UNAUTHORIZED_ROLE: 'UNAUTHORIZED_ROLE',
  INVALID_TARGET: 'INVALID_TARGET',
  TARGET_SCOPE_VIOLATION: 'TARGET_SCOPE_VIOLATION',
  ANNOUNCEMENT_NOT_FOUND: 'ANNOUNCEMENT_NOT_FOUND',
} as const;

export type StableErrorCode = (typeof STABLE_ERROR)[keyof typeof STABLE_ERROR];

export function stableError(code: StableErrorCode): Error {
  return new Error(code);
}
