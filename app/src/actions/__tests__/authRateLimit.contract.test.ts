import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

import { CredentialsSignin } from 'next-auth';

import { isTooManyAttemptsError } from '@/lib/authErrors';
import { STABLE_ERROR } from '@/lib/errors';

// Resolves the REAL @auth/core errors module installed under next-auth
// (pnpm nests it in .pnpm, so a bare `@auth/core/errors` import does not
// resolve from here; next-auth re-exports only AuthError/CredentialsSignin).
// Anchoring createRequire at the next-auth entry keeps this working across
// @auth/core version bumps — no hardcoded .pnpm path.
type AuthCoreErrorsShape = {
  CallbackRouteError: new (
    error: Error,
    options?: { provider?: string }
  ) => Error & { type?: string };
};

let cachedErrors: AuthCoreErrorsShape | null = null;

async function loadAuthCoreErrors(): Promise<AuthCoreErrorsShape> {
  if (cachedErrors) return cachedErrors;
  const fromTestFile = createRequire(import.meta.url);
  const nextAuthEntry = fromTestFile.resolve('next-auth');
  const fromNextAuth = createRequire(nextAuthEntry);
  const errorsEntry = fromNextAuth.resolve('@auth/core/errors');
  const mod = (await import(errorsEntry)) as AuthCoreErrorsShape;
  cachedErrors = mod;
  return mod;
}

describe('isTooManyAttemptsError contract — NO mock.module', () => {
  it('true for a real CallbackRouteError wrapping TOO_MANY_ATTEMPTS', async () => {
    const { CallbackRouteError } = await loadAuthCoreErrors();
    const wrapped = new CallbackRouteError(new Error(STABLE_ERROR.TOO_MANY_ATTEMPTS), {
      provider: 'credentials',
    });
    assert.equal(wrapped.type, 'CallbackRouteError');
    assert.equal(isTooManyAttemptsError(wrapped), true);
  });

  it('true for a plain TOO_MANY_ATTEMPTS error', () => {
    assert.equal(isTooManyAttemptsError(new Error(STABLE_ERROR.TOO_MANY_ATTEMPTS)), true);
  });

  it('true for a nested cause chain carrying the marker', () => {
    const nested = new Error('outer', {
      cause: { err: new Error(STABLE_ERROR.TOO_MANY_ATTEMPTS) },
    });
    assert.equal(isTooManyAttemptsError(nested), true);
    assert.equal(isTooManyAttemptsError({ cause: { cause: STABLE_ERROR.TOO_MANY_ATTEMPTS } }), true);
  });

  it('false for empty CredentialsSignin, generic errors, other wrappers, null/undefined', async () => {
    const { CallbackRouteError } = await loadAuthCoreErrors();
    assert.equal(isTooManyAttemptsError(new CredentialsSignin()), false);
    assert.equal(isTooManyAttemptsError(new Error('Contraseña incorrecta')), false);
    assert.equal(
      isTooManyAttemptsError(
        new CallbackRouteError(new Error('Contraseña incorrecta'), { provider: 'credentials' })
      ),
      false
    );
    assert.equal(isTooManyAttemptsError(null), false);
    assert.equal(isTooManyAttemptsError(undefined), false);
  });
});
