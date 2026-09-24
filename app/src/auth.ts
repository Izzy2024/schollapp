import NextAuth from 'next-auth';
import type { NextAuthConfig } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { authConfig } from './auth.config';
import { STABLE_ERROR } from '@/lib/errors';
import {
  UNKNOWN_IP,
  LOGIN_EMAIL_LIMIT,
  LOGIN_EMAIL_WINDOW_MS,
  LOGIN_IP_LIMIT,
  LOGIN_IP_WINDOW_MS,
  clearRateLimit,
  getClientIp,
  isRateLimited,
  loginEmailKey,
  loginIpKey,
  registerAttempt,
} from '@/lib/rate-limit';

function resolveAuthSecret(): string {
  if (process.env.AUTH_SECRET) return process.env.AUTH_SECRET;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('AUTH_SECRET must be set in production');
  }
  return 'secret-for-dev-only-change-in-prod';
}

// NextAuth options, exported so contract tests can invoke the jwt()/session()
// callbacks directly (the __TEST_SESSION__ seam bypasses them, so revocation
// can only be tested at this level).
export const nextAuthOptions = {
  ...authConfig,
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email', placeholder: 'usuario@ejemplo.com' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Faltan credenciales');
        }

        // Fixed-window brute-force protection (Prisma-backed, serverless-safe).
        // Checked BEFORE the user lookup so unknown emails consume quota too.
        const normalizedEmail = (credentials.email as string).trim().toLowerCase();
        const clientIp = await getClientIp();
        const emailKey = loginEmailKey(normalizedEmail);
        const ipKey = clientIp !== UNKNOWN_IP ? loginIpKey(clientIp) : null;

        if (
          (await isRateLimited(emailKey, LOGIN_EMAIL_LIMIT, LOGIN_EMAIL_WINDOW_MS)) ||
          (ipKey !== null && (await isRateLimited(ipKey, LOGIN_IP_LIMIT, LOGIN_IP_WINDOW_MS)))
        ) {
          throw new Error(STABLE_ERROR.TOO_MANY_ATTEMPTS);
        }

        const recordLoginFailure = async () => {
          await registerAttempt(emailKey, LOGIN_EMAIL_WINDOW_MS);
          if (ipKey !== null) await registerAttempt(ipKey, LOGIN_IP_WINDOW_MS);
        };

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
          include: {
            memberships: {
              include: {
                tenant: true,
              },
            },
            roles: {
              include: {
                role: true,
              },
            },
          },
        });

        if (!user || !user.isActive) {
          await recordLoginFailure();
          throw new Error('Usuario no encontrado o inactivo');
        }

        let isPasswordValid = false;
        if (
          process.env.ALLOW_DEMO_LOGIN === '1' &&
          process.env.NODE_ENV !== 'production' &&
          user.passwordHash === 'demo-hash-123' &&
          credentials.password === 'demo-hash-123'
        ) {
          isPasswordValid = true;
        } else {
          isPasswordValid = await bcrypt.compare(
            credentials.password as string,
            user.passwordHash
          );
        }

        if (!isPasswordValid) {
          await recordLoginFailure();
          throw new Error('Contraseña incorrecta');
        }

        const mainMembership = user.memberships[0];
        if (!mainMembership) {
          throw new Error('El usuario no pertenece a ninguna escuela');
        }

        // Gather roles for this specific tenant
        const userRolesForTenant = user.roles
          .filter(ur => ur.tenantId === mainMembership.tenantId)
          .map(ur => ur.role.name);

        if (userRolesForTenant.length === 0) {
          throw new Error('Usuario sin rol asignado');
        }

        // Successful login resets the per-email failure counter.
        await clearRateLimit(emailKey);

        return {
          id: user.id,
          name: user.fullName,
          email: user.email,
          tenantId: mainMembership.tenantId,
          tenantSlug: mainMembership.tenant.slug,
          roles: userRolesForTenant,
          mustChangePassword: user.mustChangePassword,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        // Initial sign-in
        token.id = user.id;
        const u = user as { tenantId: string; tenantSlug: string; roles: string[]; mustChangePassword: boolean };
        token.tenantId = u.tenantId;
        token.tenantSlug = u.tenantSlug;
        token.roles = u.roles;
        token.mustChangePassword = u.mustChangePassword;
        token.revoked = false;
        return token;
      }
      // Token refresh (no new login): re-check that the user still exists
      // and is active, so deactivating an account cuts existing sessions
      // (best effort, no schema change). Fail open on DB errors.
      if (typeof token.id === 'string' && token.id) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id },
            select: { isActive: true },
          });
          if (!dbUser || !dbUser.isActive) {
            token.revoked = true;
          }
        } catch {
          // fail open: a store outage must not lock every user out
        }
      }
      return token;
    },
    async session({ session, token }) {
      if ((token as { revoked?: boolean }).revoked) {
        // Revoked session: leave session.user empty so every consumer of
        // session?.user (including requireTenant()) treats it as signed out.
        (session as { user?: unknown }).user = undefined;
        return session;
      }
      if (session.user) {
        session.user.id = token.id as string;
        const su = session.user as typeof session.user & {
          tenantId?: string;
          tenantSlug?: string;
          roles?: string[];
          mustChangePassword?: boolean;
        };
        su.tenantId = token.tenantId as string;
        su.tenantSlug = token.tenantSlug as string;
        su.roles = token.roles as string[];
        su.mustChangePassword = Boolean(token.mustChangePassword);
      }
      return session;
    },
  },
  session: {
    strategy: 'jwt',
  },
  secret: resolveAuthSecret(),
} satisfies NextAuthConfig;

export const { handlers, signIn, signOut, auth: nextAuthAuth } = NextAuth(nextAuthOptions);

// Test override seam: some contract tests run under tsx where node:test mock.module is not available.
// They can set globalThis.__TEST_SESSION__ to bypass NextAuth internals.
import { getTestSession } from '@/lib/test-seams';

export async function auth() {
  const testSession = getTestSession();
  if (testSession) return testSession;
  return nextAuthAuth();
}

