'use server';

import { signIn, signOut } from '@/auth';
import { AuthError } from 'next-auth';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { resolveHomePath } from '@/lib/auth-guards.mjs';

async function clearAuthCookies() {
  const store = await cookies();
  const cookieNames = [
    'authjs.session-token',
    '__Secure-authjs.session-token',
    'authjs.csrf-token',
    '__Host-authjs.csrf-token',
    'authjs.callback-url',
  ];

  for (const cookieName of cookieNames) {
    store.set(cookieName, '', {
      path: '/',
      expires: new Date(0),
    });
  }
}

async function resolveLoginRedirectPath(email: string) {
  const normalizedEmail = email.toLowerCase().trim();

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    include: {
      roles: {
        include: {
          role: true,
        },
      },
    },
  });

  const dbRoles = user?.roles.map((userRole) => userRole.role.name.toLowerCase()) ?? [];

  if (dbRoles.length > 0) {
    return resolveHomePath(dbRoles);
  }

  if (normalizedEmail.includes('director')) return '/director';
  if (normalizedEmail.includes('docente') || normalizedEmail.includes('teacher')) return '/teacher';
  if (normalizedEmail.includes('alumno') || normalizedEmail.includes('student')) return '/student';
  if (normalizedEmail.includes('padre') || normalizedEmail.includes('parent')) return '/parent';
  return '/admin';
}

export async function authenticate(
  prevState: string | undefined,
  formData: FormData,
) {
  try {
    const data = Object.fromEntries(formData);
    const email = String(data.email ?? '');
    const redirectPath = await resolveLoginRedirectPath(email);

    await clearAuthCookies();
    await signIn('credentials', {
      ...data,
      redirect: false,
      redirectTo: redirectPath,
    });

    return `REDIRECT:${redirectPath}`;
  } catch (error) {
    console.error('Login error:', error);
    if (error instanceof AuthError) {
      switch (error.type) {
        case 'CredentialsSignin':
          return 'Credenciales incorrectas.';
        default:
          return 'Algo salió mal. Intenta nuevamente.';
      }
    }
    throw error;
  }
}

export async function logOut() {
  try {
    await signOut({ redirect: false });
  } finally {
    await clearAuthCookies();
  }
}
