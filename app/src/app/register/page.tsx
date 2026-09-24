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
    <div className="w-full max-w-md w-full animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600 shadow-lg shadow-blue-600/20 mb-6">
          <span className="material-symbols-outlined text-2xl text-white">school</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
          Crea tu cuenta
        </h1>
        <p className="mt-2 text-sm sm:text-base text-slate-600">
          Ingresa el código de invitación que te compartió tu escuela
        </p>
      </div>

      <div className="bg-white px-6 py-8 sm:p-10 shadow-xl shadow-slate-200/50 rounded-2xl border border-slate-100">
        {!invite ? (
          <form className="space-y-6" onSubmit={handleVerifyCode}>
            <div className="space-y-1.5 text-left">
              <label htmlFor="code" className="block text-sm font-semibold text-slate-700">
                Código de invitación
              </label>
              <input
                id="code"
                name="code"
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="block w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-600/10 transition-all sm:text-sm"
                placeholder="Ej. ABCD-1234"
              />
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-sm text-red-600 flex items-start gap-2">
                <span className="material-symbols-outlined text-red-500 text-xl shrink-0">error</span>
                <p className="mt-0.5 font-medium">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isPending}
              className="group relative flex w-full justify-center items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
            >
              {isPending ? 'Verificando...' : 'Verificar código'}
              {!isPending && <span className="material-symbols-outlined text-lg transition-transform group-hover:translate-x-1">arrow_forward</span>}
            </button>
          </form>
        ) : (
          <form className="space-y-6 text-left" onSubmit={handleRegister}>
            <div className="flex items-center gap-3 p-4 bg-blue-50/50 border border-blue-100 rounded-xl">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <span className="material-symbols-outlined text-blue-600 text-lg">person</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">
                  {invite.invitedName}
                </p>
                <p className="text-xs font-medium text-slate-500 truncate">
                  {invite.tenantName}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="email" className="block text-sm font-semibold text-slate-700">
                  Correo Electrónico
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-600/10 transition-all sm:text-sm"
                  placeholder="tu@correo.com"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="password" className="block text-sm font-semibold text-slate-700">
                  Contraseña
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-600/10 transition-all sm:text-sm"
                  placeholder="••••••••"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="confirmPassword" className="block text-sm font-semibold text-slate-700">
                  Confirmar contraseña
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="block w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-600/10 transition-all sm:text-sm"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-sm text-red-600 flex items-start gap-2">
                <span className="material-symbols-outlined text-red-500 text-xl shrink-0">error</span>
                <p className="mt-0.5 font-medium">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isPending}
              className="group relative flex w-full justify-center items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
            >
              {isPending ? 'Creando cuenta...' : 'Crear cuenta'}
              {!isPending && <span className="material-symbols-outlined text-lg transition-transform group-hover:translate-x-1">arrow_forward</span>}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
