'use client';

import React, { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getActivationKeyInfo, activateTenant } from '@/actions/tenantActivation';

const ERROR_MESSAGES: Record<string, string> = {
  ACTIVATION_KEY_NOT_FOUND: 'Clave de activación no válida.',
  ACTIVATION_KEY_USED: 'Esta clave ya fue utilizada.',
  ACTIVATION_KEY_EXPIRED: 'Esta clave de activación expiró.',
  SCHOOL_NAME_REQUIRED: 'El nombre de la escuela es obligatorio.',
  EMAIL_ALREADY_REGISTERED: 'Ya existe una cuenta con ese correo. Inicia sesión.',
  WEAK_PASSWORD: 'La contraseña debe tener al menos 8 caracteres.',
};

function friendlyError(code: string): string {
  return ERROR_MESSAGES[code] ?? 'Ocurrió un error. Intenta de nuevo.';
}

export default function ActivarPage() {
  return (
    <Suspense fallback={null}>
      <ActivarForm />
    </Suspense>
  );
}

function ActivarForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [key, setKey] = useState(searchParams.get('key') ?? '');
  const [keyValid, setKeyValid] = useState(false);
  const [schoolName, setSchoolName] = useState('');
  const [adminFullName, setAdminFullName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleVerifyKey(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsPending(true);
    const result = await getActivationKeyInfo(key.trim());
    setIsPending(false);

    if ('error' in result) {
      setError(friendlyError(result.error));
      return;
    }

    setKeyValid(true);
  }

  async function handleActivate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setIsPending(true);
    const result = await activateTenant({
      key: key.trim(),
      schoolName,
      adminFullName,
      adminEmail,
      password,
    });
    setIsPending(false);

    if ('error' in result) {
      setError(friendlyError(result.error));
      return;
    }

    router.replace('/login?registered=1');
  }

  return (
    <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600 shadow-lg shadow-blue-600/20 mb-6">
          <span className="material-symbols-outlined text-2xl text-white">domain_add</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
          Activa tu escuela
        </h1>
        <p className="mt-2 text-sm sm:text-base text-slate-600">
          Ingresa la clave de activación que te compartimos
        </p>
      </div>

      <div className="bg-white px-6 py-8 sm:p-10 shadow-xl shadow-slate-200/50 rounded-2xl border border-slate-100">
        {!keyValid ? (
          <form className="space-y-6" onSubmit={handleVerifyKey}>
            <div className="space-y-1.5 text-left">
              <label htmlFor="key" className="block text-sm font-semibold text-slate-700">
                Clave de activación
              </label>
              <input
                id="key"
                name="key"
                type="text"
                required
                value={key}
                onChange={(e) => setKey(e.target.value)}
                className="block w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-600/10 transition-all sm:text-sm"
                placeholder="Pégala aquí"
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
              {isPending ? 'Verificando...' : 'Verificar clave'}
              {!isPending && <span className="material-symbols-outlined text-lg transition-transform group-hover:translate-x-1">arrow_forward</span>}
            </button>
          </form>
        ) : (
          <form className="space-y-6 text-left" onSubmit={handleActivate}>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="schoolName" className="block text-sm font-semibold text-slate-700">
                  Nombre de la escuela
                </label>
                <input
                  id="schoolName"
                  name="schoolName"
                  type="text"
                  required
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  className="block w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-600/10 transition-all sm:text-sm"
                  placeholder="Ej. Colegio Ejemplo"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="adminFullName" className="block text-sm font-semibold text-slate-700">
                  Tu nombre completo
                </label>
                <input
                  id="adminFullName"
                  name="adminFullName"
                  type="text"
                  required
                  value={adminFullName}
                  onChange={(e) => setAdminFullName(e.target.value)}
                  className="block w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-600/10 transition-all sm:text-sm"
                  placeholder="Nombre y apellido"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="adminEmail" className="block text-sm font-semibold text-slate-700">
                  Correo Electrónico
                </label>
                <input
                  id="adminEmail"
                  name="adminEmail"
                  type="email"
                  autoComplete="email"
                  required
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  className="block w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-600/10 transition-all sm:text-sm"
                  placeholder="director@tuescuela.com"
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
              {isPending ? 'Creando escuela...' : 'Crear mi escuela'}
              {!isPending && <span className="material-symbols-outlined text-lg transition-transform group-hover:translate-x-1">arrow_forward</span>}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
