// auth.config.ts for Edge compatibility
import type { NextAuthConfig } from 'next-auth';

export const authConfig = {
  pages: {
    signIn: '/login',
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isPublicRoute = nextUrl.pathname.startsWith('/login') || nextUrl.pathname === '/';
      const isApiRoute = nextUrl.pathname.startsWith('/api');

      if (isApiRoute) return true; // Let API routes handle their own auth

      if (isLoggedIn) {
        if (nextUrl.pathname.startsWith('/login') || nextUrl.pathname === '/') {
          // Redirect to appropriate dashboard based on role
          const userObj = auth.user as any;
          const roles = userObj?.roles || [];
          if (roles.includes('director')) return Response.redirect(new URL('/director', nextUrl));
          if (roles.includes('teacher')) return Response.redirect(new URL('/teacher', nextUrl));
          if (roles.includes('student')) return Response.redirect(new URL('/student', nextUrl));
          if (roles.includes('parent')) return Response.redirect(new URL('/parent', nextUrl));
          // Default to admin if they have admin role, or if they have no recognized role (fallback)
          return Response.redirect(new URL('/admin', nextUrl));
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