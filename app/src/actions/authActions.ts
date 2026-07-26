'use server';

import { auth, signIn, signOut } from '@/auth';
import { AuthError } from 'next-auth';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import { resolveHomePath } from '@/lib/auth-guards.mjs';
import { STABLE_ERROR, stableError } from '@/lib/errors';

async function clearAuthCookies() {
  // ponytail: cookies() needs a Next.js request context; contract tests call
  // changePassword() outside one, so this is a no-op there (no cookies to clear anyway).
  let store;
  try {
    store = await cookies();
  } catch {
    return;
  }

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

class SeedRequiredError extends Error {
  public readonly code = 'SEED_REQUIRED' as const;
  constructor(message = 'Base sin datos iniciales (seed requerido)') {
    super(message);
    this.name = 'SeedRequiredError';
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
      memberships: true,
    },
  });

  // If the user doesn't exist at all, this is almost always a missing seed in dev.
  // We treat it as a handled error to avoid NextAuth wrapping it as CallbackRouteError.
  if (!user) {
    throw new SeedRequiredError(
      'Base sin datos iniciales. Ejecuta: npx prisma db seed'
    );
  }

  // Seed invariant: demo users should always have an active membership.
  if (user.memberships.length === 0) {
    throw new SeedRequiredError(
      'Falta asociación a escuela (seed incompleto). Ejecuta: npx prisma db seed'
    );
  }

  const dbRoles = user.roles.map((userRole) => userRole.role.name.toLowerCase());

  if (dbRoles.length > 0) {
    return resolveHomePath(dbRoles);
  }

  // Legacy fallback (kept for safety).
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
    });

    return `REDIRECT:${redirectPath}`;
  } catch (error) {
    // Handle seed-missing explicitly to avoid a generic CallbackRouteError and to give an actionable message.
    if (error instanceof SeedRequiredError) {
      console.error(`[auth][seed-missing] ${error.code}: ${error.message}`);
      return `${error.code}: ${error.message}`;
    }

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

export async function changePassword(input: {
  currentPassword: string;
  newPassword: string;
}): Promise<{ success: true } | { error: string }> {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');

  if (input.newPassword.length < 8) return { error: STABLE_ERROR.WEAK_PASSWORD };

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) throw new Error('Unauthorized');

  const isCurrentValid = await bcrypt.compare(input.currentPassword, user.passwordHash);
  if (!isCurrentValid) return { error: STABLE_ERROR.INVALID_CURRENT_PASSWORD };

  const passwordHash = await bcrypt.hash(input.newPassword, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, mustChangePassword: false },
  });

  await clearAuthCookies();
  return { success: true };
}
