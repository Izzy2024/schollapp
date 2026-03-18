// auth.config.ts for Edge compatibility
import type { NextAuthConfig } from 'next-auth';
import { extractRoles, isServerActionRequest, resolveFallbackPath, resolveHomePath } from '@/lib/auth-guards.mjs';

export const authConfig = {
  pages: {
    signIn: '/login',
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        const signedInUser = user as {
          id?: string;
          tenantId?: string;
          tenantSlug?: string;
          roles?: string[];
        };

        if (signedInUser.id) token.id = signedInUser.id;
        if (signedInUser.tenantId) token.tenantId = signedInUser.tenantId;
        if (signedInUser.tenantSlug) token.tenantSlug = signedInUser.tenantSlug;
        if (Array.isArray(signedInUser.roles)) token.roles = signedInUser.roles;
      }

      return token;
    },
    session({ session, token }) {
      if (session.user) {
        const userWithClaims = session.user as {
          id?: string;
          tenantId?: string;
          tenantSlug?: string;
          roles?: string[];
        };

        userWithClaims.id = typeof token.id === 'string' ? token.id : '';
        userWithClaims.tenantId = typeof token.tenantId === 'string' ? token.tenantId : '';
        userWithClaims.tenantSlug = typeof token.tenantSlug === 'string' ? token.tenantSlug : '';
        userWithClaims.roles = Array.isArray(token.roles)
          ? token.roles.map((role) => String(role))
          : [];
      }

      return session;
    },
    authorized({ auth, request }) {
      const { nextUrl } = request;
      const isLoggedIn = !!auth?.user;
      const isPublicRoute = nextUrl.pathname.startsWith('/login') || nextUrl.pathname === '/';
      const isApiRoute = nextUrl.pathname.startsWith('/api');
      const isServerAction = isServerActionRequest(request);

      if (isApiRoute) return true; // Let API routes handle their own auth
      if (isServerAction) return true; // Never block/redirect server actions

      if (isLoggedIn) {
        const roles = extractRoles(auth?.user);

        // Redirect from login/index to dashboard
        if (isPublicRoute) {
          return Response.redirect(new URL(resolveHomePath(roles), nextUrl));
        }

        // Strict Path RBAC
        const path = nextUrl.pathname;
        const fallbackPath = resolveFallbackPath(path, roles);
        if (fallbackPath) {
          return Response.redirect(new URL(fallbackPath, nextUrl));
        }

        return true;
      }
      
      // If not logged in and not on a public route, redirect to login
      if (!isPublicRoute) {
        return false; // automatically redirects to pages.signIn
      }

      return true;
    },
  },
  providers: [], // Add providers with an empty array for now
  secret: process.env.AUTH_SECRET || 'secret-for-dev-only-change-in-prod',
} satisfies NextAuthConfig;
