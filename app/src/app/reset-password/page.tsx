'use client';

import React, { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { resetPassword } from '@/actions/passwordReset';

const ERROR_MESSAGES: Record<string, string> = {
  RESET_TOKEN_NOT_FOUND: 'El enlace no es válido.',
  RESET_TOKEN_USED: 'Este enlace ya fue utilizado.',
  RESET_TOKEN_EXPIRED: 'Este enlace expiró. Solicita uno nuevo.',
  WEAK_PASSWORD: 'La contraseña debe tener al menos 8 caracteres.',
};

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setIsPending(true);
    const result = await resetPassword({ token, newPassword: password });
    setIsPending(false);

    if ('error' in result) {
      setError(ERROR_MESSAGES[result.error] ?? 'Ocurrió un error. Intenta de nuevo.');
      return;
    }

    router.replace('/login?reset=1');
  }

  return (
    <div>
      <div className="text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-200">
          <span className="material-symbols-outlined text-2xl text-white">lock_reset</span>
        </div>
        <h2 className="mt-5 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Restablecer contraseña
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          Define una nueva contraseña para tu cuenta.
        </p>
      </div>

      <div className="mt-8 rounded-2xl border border-slate-100 bg-white px-5 py-8 shadow-xl shadow-slate-200/60 sm:px-8">
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-700">
              Nueva contraseña
            </label>
            <div className="mt-1.5">
              <input
                id="password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                className="block h-11 w-full rounded-lg border border-slate-300 bg-white px-3.5 text-sm text-slate-900 shadow-sm placeholder:font-normal placeholder:text-slate-400 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
            </div>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700">
              Confirmar contraseña
            </label>
            <div className="mt-1.5">
              <input
                id="confirmPassword"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repite tu nueva contraseña"
                className="block h-11 w-full rounded-lg border border-slate-300 bg-white px-3.5 text-sm text-slate-900 shadow-sm placeholder:font-normal placeholder:text-slate-400 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
              <span className="material-symbols-outlined mt-0.5 text-lg text-red-500">error</span>
              <p className="text-sm leading-relaxed text-red-700">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="flex h-11 w-full items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? 'Guardando...' : 'Restablecer contraseña'}
          </button>
        </form>
      </div>
    </div>
  );
}