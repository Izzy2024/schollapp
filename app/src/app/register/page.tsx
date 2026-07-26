'use client';

import React, { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getInvitationInfo, registerWithInvitation } from '@/actions/invitations';

type InviteInfo = { invitedName: string; tenantName: string; suggestedEmail: string | null };

const ERROR_MESSAGES: Record<string, string> = {
  INVITE_NOT_FOUND: 'Código de invitación no válido.',
  INVITE_USED: 'Este código ya fue utilizado.',
  INVITE_EXPIRED: 'Este código de invitación expiró.',
  INVITE_TARGET_NOT_FOUND: 'La persona invitada ya no existe en el sistema.',
  EMAIL_ALREADY_REGISTERED: 'Ya existe una cuenta con ese correo. Inicia sesión.',
  WEAK_PASSWORD: 'La contraseña debe tener al menos 8 caracteres.',
};

function friendlyError(code: string): string {
  return ERROR_MESSAGES[code] ?? 'Ocurrió un error. Intenta de nuevo.';
}

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterForm />
    </Suspense>
  );
}

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [code, setCode] = useState(searchParams.get('code') ?? '');
  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsPending(true);
    const result = await getInvitationInfo(code.trim());
    setIsPending(false);

    if ('error' in result) {
      setError(friendlyError(result.error));
      return;
    }

    setInvite(result);
    setEmail(result.suggestedEmail ?? '');
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setIsPending(true);
    const result = await registerWithInvitation({ code: code.trim(), email, password });
    setIsPending(false);

    if ('error' in result) {
      setError(friendlyError(result.error));
      return;
    }

    router.replace('/login?registered=1');
  }

  return (
    <div className="sm:mx-auto sm:w-full sm:max-w-md">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 mb-4">
          <span className="material-symbols-outlined text-3xl text-blue-600">school</span>
        </div>
        <h2 className="mt-2 text-3xl font-extrabold text-gray-900">Crear cuenta</h2>
        <p className="mt-2 text-sm text-gray-600">
          Ingresa el código de invitación que te compartió tu escuela
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {!invite ? (
            <form className="space-y-6" onSubmit={handleVerifyCode}>
              <div>
                <label htmlFor="code" className="block text-sm font-medium text-gray-700">
                  Código de invitación
                </label>
                <div className="mt-1">
                  <input
                    id="code"
                    name="code"
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
              </div>

              {error && <div className="text-sm text-red-500 font-medium text-center">{error}</div>}

              <button
                type="submit"
                disabled={isPending}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {isPending ? 'Verificando...' : 'Verificar código'}
              </button>
            </form>
          ) : (
            <form className="space-y-6" onSubmit={handleRegister}>
              <div className="text-sm text-gray-700 bg-blue-50 border border-blue-100 rounded-md px-3 py-2">
                Invitación para <strong>{invite.invitedName}</strong> — {invite.tenantName}
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Correo Electrónico
                </label>
                <div className="mt-1">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Contraseña
                </label>
                <div className="mt-1">
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                  Confirmar contraseña
                </label>
                <div className="mt-1">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
              </div>

              {error && <div className="text-sm text-red-500 font-medium text-center">{error}</div>}

              <button
                type="submit"
                disabled={isPending}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {isPending ? 'Creando cuenta...' : 'Crear cuenta'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
