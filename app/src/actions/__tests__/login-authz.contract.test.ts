import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import prisma from '@/lib/prisma';

import { authenticate } from '@/actions/authActions';
import { nextAuthOptions } from '@/auth';

function uniq(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function loginForm(email: string, password = 'x') {
  const fd = new FormData();
  fd.set('email', email);
  fd.set('password', password);
  return fd;
}

describe('login/authz contract (1.11) — NO mock.module, Postgres real', () => {
  it('dev: email inexistente conserva el aviso SEED_REQUIRED (solo fuera de producción)', async () => {
    const prev = process.env.NODE_ENV;
    delete process.env.NODE_ENV;
    try {
      const res = await authenticate(undefined, loginForm(`nadie-${uniq('dev')}@ex.com`));
      assert.match(String(res), /SEED_REQUIRED/);
    } finally {
      if (prev === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = prev;
    }
  });

  it('producción: email inexistente NO fuga enumeración (sin "seed" ni "prisma")', async () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      const res = await authenticate(undefined, loginForm(`nadie-${uniq('prod')}@ex.com`));
      // En un request real esto sería 'Credenciales incorrectas.'; bajo tsx
      // signIn() no tiene request scope, pero en ningún caso puede volver
      // el mensaje de seed (eso sería la fuga SEG-M4).
      assert.ok(!/seed|prisma/i.test(String(res)), `fuga de enumeración: ${res}`);
    } catch (e: any) {
      // tsx: signIn() exige el request scope de Next (`headers()`); lo único
      // exigible aquí es que el error tampoco porte la fuga de enumeración.
      assert.ok(
        !/seed|prisma|SEED_REQUIRED/i.test(String(e?.message ?? e)),
        `fuga de enumeración en error: ${e?.message}`
      );
    } finally {
      if (prev === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = prev;
    }
  });

  it('sesión revocable: desactivar al usuario revoca el token en el refresh jwt', async () => {
    const tag = uniq('revoke');
    const user = await prisma.user.create({
      data: { email: `${tag}@ex.com`, fullName: 'Revocable', passwordHash: 'x', isActive: true },
    });
    try {
      const jwt = (nextAuthOptions.callbacks as any).jwt;
      const sessionCb = (nextAuthOptions.callbacks as any).session;

      // Login nuevo: no revocado.
      const fresh = await jwt({ token: {}, user: { id: user.id, tenantId: 't', tenantSlug: 's', roles: ['admin'], mustChangePassword: false } });
      assert.equal(fresh.revoked, false);

      // Refresh con usuario activo: no revocado.
      const activeRefresh = await jwt({ token: { id: user.id } });
      assert.notEqual(activeRefresh.revoked, true);

      // Tras desactivar: el refresh marca revoked.
      await prisma.user.update({ where: { id: user.id }, data: { isActive: false } });
      const revokedRefresh = await jwt({ token: { id: user.id } });
      assert.equal(revokedRefresh.revoked, true);

      // Sesión con token revocado: session.user queda vacío.
      const revokedSession = await sessionCb({
        session: { user: { id: user.id, name: 'Revocable' } },
        token: revokedRefresh,
      });
      assert.equal(revokedSession.user, undefined);

      // Sesión con token válido: se llena como antes.
      const okSession = await sessionCb({
        session: { user: {} },
        token: { id: user.id, tenantId: 't', tenantSlug: 's', roles: ['admin'], mustChangePassword: false },
      });
      assert.equal(okSession.user.id, user.id);
      assert.deepEqual(okSession.user.roles, ['admin']);
    } finally {
      await prisma.user.delete({ where: { id: user.id } });
    }
  });
});
