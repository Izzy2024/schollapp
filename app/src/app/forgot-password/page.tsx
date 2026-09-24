'use client';

import React, { useState } from 'react';
import { requestPasswordReset } from '@/actions/passwordReset';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isPending, setIsPending] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsPending(true);
    await requestPasswordReset(email);
    setIsPending(false);
    setSubmitted(true);
  }

  return (
    <div>
      <div className="text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-200">
          <span className="material-symbols-outlined text-2xl text-white">lock_reset</span>
        </div>
        <h2 className="mt-5 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Recuperar contraseña
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.
        </p>
      </div>

      <div className="mt-8 rounded-2xl border border-slate-100 bg-white px-5 py-8 shadow-xl shadow-slate-200/60 sm:px-8">
        {submitted ? (
          <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3.5">
            <span className="material-symbols-outlined mt-0.5 text-xl text-emerald-600">check_circle</span>
            <p className="text-sm leading-relaxed text-emerald-800">
              Si el correo existe en nuestro sistema, recibirás un enlace para restablecer tu contraseña.
            </p>
          </div>
        ) : (
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700">
                Correo Electrónico
              </label>
              <div className="mt-1.5">
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="usuario@correo.com"
                  className="block h-11 w-full rounded-lg border border-slate-300 bg-white px-3.5 text-sm text-slate-900 shadow-sm placeholder:font-normal placeholder:text-slate-400 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="flex h-11 w-full items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? 'Enviando...' : 'Enviar enlace de recuperación'}
            </button>
          </form>
        )}

        <div className="mt-6 pt-5 text-center">
          <a href="/login" className="text-sm font-medium text-blue-600 transition hover:text-blue-700 hover:underline">
            Volver a iniciar sesión
          </a>
        </div>
      </div>
    </div>
  );
}