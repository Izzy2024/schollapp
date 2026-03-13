'use server';

import { auth } from '@/auth';

import { signIn, signOut } from '@/auth';
import { AuthError } from 'next-auth';

export async function authenticate(
  prevState: string | undefined,
  formData: FormData,
) {
  try {
    const data = Object.fromEntries(formData);
    await signIn('credentials', { ...data, redirectTo: '/' });
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
  await signOut({ redirectTo: '/login' });
}