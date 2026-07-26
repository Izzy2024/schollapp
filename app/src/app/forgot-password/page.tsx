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
    <div className="sm:mx-auto sm:w-full sm:max-w-md">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 mb-4">
          <span className="material-symbols-outlined text-3xl text-blue-600">lock_reset</span>
        </div>
        <h2 className="mt-2 text-3xl font-extrabold text-gray-900">Recuperar contraseña</h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {submitted ? (
            <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2 text-center">
              Si el correo existe en nuestro sistema, recibirás un enlace para restablecer tu contraseña.
            </div>
          ) : (
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Correo Electrónico
                </label>
                <div className="mt-1">
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {isPending ? 'Enviando...' : 'Enviar enlace de recuperación'}
              </button>
            </form>
          )}

          <div className="mt-6 text-center">
            <a href="/login" className="text-sm text-blue-600 hover:underline">
              Volver a iniciar sesión
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
