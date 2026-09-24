import { STABLE_ERROR } from '@/lib/errors';

/**
 * Detects a login rate-limit rejection buried inside a NextAuth `AuthError`.
 *
 * When `authorize()` throws `Error(STABLE_ERROR.TOO_MANY_ATTEMPTS)`, @auth/core
 * wraps it in a `CallbackRouteError` whose `cause` is
 * `{ err: <original Error>, provider: 'credentials' }` (verified at runtime
 * against the installed @auth/core version). The marker therefore never
 * appears in `error.message` — it must be found by walking the cause chain.
 * Anything else keeps its generic message so we never reveal whether an
 * email exists.
 *
 * Lives outside authActions.ts: that file is `'use server'`, and Next.js
 * requires every export from a server-action file to be an async function —
 * a plain sync helper there fails the production build.
 */
export function isTooManyAttemptsError(error: unknown): boolean {
  const seen = new Set<unknown>();
  const stack: unknown[] = [error];
  while (stack.length > 0) {
    const current = stack.pop();
    if (current == null || seen.has(current)) continue;
    seen.add(current);
    if (typeof current === 'string') {
      if (current.includes(STABLE_ERROR.TOO_MANY_ATTEMPTS)) return true;
      continue;
    }
    if (current instanceof Error) {
      if (current.message.includes(STABLE_ERROR.TOO_MANY_ATTEMPTS)) return true;
      stack.push((current as { cause?: unknown }).cause);
      continue;
    }
    if (typeof current === 'object') {
      for (const value of Object.values(current as Record<string, unknown>)) {
        stack.push(value);
      }
    }
  }
  return false;
}
