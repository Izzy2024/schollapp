import NextAuth from 'next-auth';
import { authConfig } from './auth.config'; // We need to create a config without Prisma for the Edge middleware

export default NextAuth(authConfig).auth;

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|login).*)'],
};
