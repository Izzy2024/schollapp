import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { authConfig } from './auth.config';

export const { handlers, signIn, signOut, auth: nextAuthAuth } = NextAuth({
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
          throw new Error('Usuario no encontrado o inactivo');
        }

        let isPasswordValid = false;
        if (
          process.env.ALLOW_DEMO_LOGIN === '1' &&
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
      }
      return token;
    },
    async session({ session, token }) {
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
  secret: process.env.AUTH_SECRET || 'secret-for-dev-only-change-in-prod',
});

// Test override seam: some contract tests run under tsx where node:test mock.module is not available.
// They can set globalThis.__TEST_SESSION__ to bypass NextAuth internals.
import { getTestSession } from '@/lib/test-seams';

export async function auth() {
  const testSession = getTestSession();
  if (testSession) return testSession;
  return nextAuthAuth();
}

