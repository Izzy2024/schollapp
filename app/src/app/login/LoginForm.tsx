'use client';

import React, { useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { authenticate } from '@/actions/authActions';
import { useRouter, useSearchParams } from 'next/navigation';
import { useActionState } from 'react';

/** Mapea el primer segmento del path de redirección al label del rol en español. */
const ROLE_BY_PATH: Record<string, string> = {
  admin: 'Administrador',
  director: 'Director',
  teacher: 'Profesor',
  student: 'Estudiante',
  parent: 'Tutor',
};

const DEMO_USERS = [
  { email: 'admin@demo.com', label: 'Admin', icon: 'shield_person', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { email: 'director@demo.com', label: 'Director', icon: 'business_center', color: 'bg-violet-50 text-violet-700 border-violet-200' },
  { email: 'docente1@demo.com', label: 'Profesor', icon: 'co_present', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { email: 'alumno@demo.com', label: 'Estudiante', icon: 'school', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { email: 'padre@demo.com', label: 'Tutor', icon: 'family_restroom', color: 'bg-rose-50 text-rose-700 border-rose-200' },
] as const;

export type LoginBranding = { name: string; logoUrl: string | null } | null;

export default function LoginForm({ branding = null }: { branding?: LoginBranding }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const justRegistered = searchParams.get('registered') === '1';
  const justReset = searchParams.get('reset') === '1';
  const [errorMessage, formAction, isPending] = useActionState(
    authenticate,
    undefined,
  );
  const redirectPathRef = useRef<string | null>(null);

  const targetPath = typeof errorMessage === 'string' && errorMessage.startsWith('REDIRECT:')
    ? errorMessage.slice('REDIRECT:'.length)
    : null;
  const successRole = targetPath ? (ROLE_BY_PATH[targetPath.split('/')[1] ?? ''] ?? null) : null;
  const showSuccess = targetPath !== null;

  useEffect(() => {
    if (typeof errorMessage === 'string' && errorMessage.startsWith('REDIRECT:')) {
      const tPath = errorMessage.slice('REDIRECT:'.length);
      redirectPathRef.current = tPath;

      // Burst de confetti coordinado con el pop del check (empieza a ~0.2s del overlay).
      const confettiTimer = setTimeout(() => {
        const burst = (opts: confetti.Options) =>
          confetti({
            particleCount: 90,
            spread: 70,
            startVelocity: 42,
            ticks: 130,
            gravity: 0.9,
            scalar: 0.95,
            colors: ['#2563eb', '#10b981', '#f59e0b', '#ffffff'],
            disableForReducedMotion: true,
            ...opts,
          });
        burst({ origin: { x: 0.15, y: 0.85 } });
        burst({ origin: { x: 0.85, y: 0.85 } });
        setTimeout(() => {
          burst({ particleCount: 55, spread: 55, startVelocity: 34, origin: { x: 0.5, y: 0.55 } });
        }, 260);
      }, 200);

      const timer = setTimeout(() => {
        if (redirectPathRef.current) {
          router.replace(redirectPathRef.current);
          router.refresh();
        }
      }, 1300);
      return () => {
        clearTimeout(timer);
        clearTimeout(confettiTimer);
      };
    }
  }, [errorMessage, router]);

  const [email, setEmail] = useState('admin@demo.com');
  const [password, setPassword] = useState('demo-hash-123');

  const setDemoUser = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('demo-hash-123');
  };

  const selectedDemo = DEMO_USERS.find((u) => u.email === email);

  return (
    <div className="mx-auto w-full max-w-md">
      {/* Header */}
      <div className="text-center">
        {branding?.logoUrl ? (
          <img
            src={branding.logoUrl}
            alt={branding.name}
            className="mx-auto h-16 w-16 rounded-2xl object-cover shadow-lg"
          />
        ) : (
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 shadow-lg shadow-blue-600/25">
            <span className="material-symbols-outlined text-3xl text-white">school</span>
          </div>
        )}
        <h2 className="mt-5 text-3xl font-bold tracking-tight text-gray-900">
          {branding?.name ?? 'APPSSCHOLL'}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-gray-500">
          Inicia sesión en tu cuenta para continuar
        </p>
      </div>

      {/* Card */}
      <div className="mt-8 overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-xl shadow-gray-900/5">
        <div className="p-6 sm:p-8">
          {justRegistered && (
            <div className="mb-6 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2.5 text-sm text-green-700">
              <span className="material-symbols-outlined text-base">check_circle</span>
              Cuenta creada. Ya puedes iniciar sesión.
            </div>
          )}
          {justReset && (
            <div className="mb-6 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2.5 text-sm text-green-700">
              <span className="material-symbols-outlined text-base">check_circle</span>
              Contraseña actualizada. Ya puedes iniciar sesión.
            </div>
          )}

          <form className="space-y-5" action={formAction}>
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-gray-700">
                Correo Electrónico
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                  <span className="material-symbols-outlined text-lg">mail</span>
                </span>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tucorreo@ejemplo.com"
                  className="block w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-3 text-sm text-gray-900 placeholder-gray-400 shadow-sm transition focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-gray-700">
                Contraseña
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                  <span className="material-symbols-outlined text-lg">lock</span>
                </span>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-3 text-sm text-gray-900 placeholder-gray-400 shadow-sm transition focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                />
              </div>
            </div>

            {errorMessage && !errorMessage.startsWith('REDIRECT:') && (
              <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-600">
                <span className="material-symbols-outlined text-base">error</span>
                {errorMessage}
              </div>
            )}

            <div className="flex items-center justify-between">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  name="remember"
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600"
                />
                Recordarme
              </label>
              <a href="/forgot-password" className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline">
                ¿Olvidaste tu contraseña?
              </a>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-600/25 transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? (
                <>
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  Iniciando sesión...
                </>
              ) : (
                'Ingresar'
              )}
            </button>
          </form>
        </div>

        {/* Demo users */}
        <div className="border-t border-gray-100 bg-gray-50/70 p-5 sm:p-6">
          <p className="mb-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">
            Acceso rápido · Usuarios Demo
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {DEMO_USERS.map((user) => {
              const isActive = selectedDemo?.email === user.email;
              return (
                <button
                  key={user.email}
                  onClick={() => setDemoUser(user.email)}
                  aria-pressed={isActive}
                  className={`flex items-center justify-center gap-1.5 rounded-lg border px-2.5 py-2 text-xs font-medium transition-all ${
                    isActive
                      ? 'border-blue-600 bg-blue-600 text-white shadow-sm shadow-blue-600/25'
                      : `${user.color} hover:-translate-y-0.5 hover:shadow-md`
                  }`}
                >
                  <span className="material-symbols-outlined text-base leading-none">{user.icon}</span>
                  {user.label}
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-center text-[11px] leading-relaxed text-gray-400">
            {selectedDemo
              ? `Seleccionado: ${selectedDemo.email}`
              : 'Selecciona un usuario para rellenar el formulario'}
          </p>
        </div>
      </div>

      <p className="mt-6 text-center text-xs leading-relaxed text-gray-400">
        © {new Date().getFullYear()} {branding?.name ?? 'APPSSCHOLL'} · Sistema administrativo escolar
      </p>

      {showSuccess && (
        <div
          role="status"
          aria-live="polite"
          className="login-success-overlay fixed inset-0 z-50 flex items-center justify-center bg-white/60 backdrop-blur-md"
        >
          <div className="flex flex-col items-center px-6 text-center">
            <div className="relative">
              <div className="login-success-ring absolute inset-0 rounded-full" aria-hidden="true" />
              <div className="login-success-pop login-success-glow flex h-24 w-24 items-center justify-center rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/50 sm:h-28 sm:w-28">
                <svg className="h-12 w-12 sm:h-14 sm:w-14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M5 13l4 4L19 7"
                    stroke="#ffffff"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="login-success-check"
                  />
                </svg>
              </div>
            </div>
            <p className="login-success-text mt-5 text-xl font-semibold text-gray-900 sm:text-2xl">
              {successRole ? `¡Bienvenido, ${successRole}!` : '¡Sesión iniciada!'}
            </p>
            {successRole && (
              <p className="login-success-sub mt-1.5 text-sm font-medium text-emerald-600">
                Tu cuenta de {successRole.toLowerCase()} está lista
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
