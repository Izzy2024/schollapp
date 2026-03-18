'use client';

import React, { useActionState, useEffect, useState } from 'react';
import { authenticate } from '@/actions/authActions';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [errorMessage, formAction, isPending] = useActionState(
    authenticate,
    undefined,
  );

  useEffect(() => {
    if (typeof errorMessage === 'string' && errorMessage.startsWith('REDIRECT:')) {
      const targetPath = errorMessage.slice('REDIRECT:'.length);
      router.replace(targetPath);
      router.refresh();
    }
  }, [errorMessage, router]);

  const [email, setEmail] = useState('admin@demo.com');
  const [password, setPassword] = useState('demo-hash-123');

  const setDemoUser = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('demo-hash-123');
  };

  return (
    <div className="sm:mx-auto sm:w-full sm:max-w-md">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 mb-4">
          <span className="material-symbols-outlined text-3xl text-blue-600">school</span>
        </div>
        <h2 className="mt-2 text-3xl font-extrabold text-gray-900">APPSSCHOLL</h2>
        <p className="mt-2 text-sm text-gray-600">
          Inicia sesión en tu cuenta
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" action={formAction}>
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
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
            </div>

            {errorMessage && !errorMessage.startsWith('REDIRECT:') && (
              <div className="text-sm text-red-500 font-medium text-center">
                {errorMessage}
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={isPending}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {isPending ? 'Iniciando sesión...' : 'Ingresar'}
              </button>
            </div>
          </form>
          
          <div className="mt-8 pt-6 border-t border-gray-100">
            <p className="text-sm text-center text-gray-500 mb-4 font-medium">Acceso rápido (Usuarios Demo)</p>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setDemoUser('admin@demo.com')} className="px-3 py-2 text-xs font-medium bg-gray-50 text-gray-700 rounded-md border border-gray-200 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition-colors">Admin</button>
              <button onClick={() => setDemoUser('director@demo.com')} className="px-3 py-2 text-xs font-medium bg-gray-50 text-gray-700 rounded-md border border-gray-200 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition-colors">Director</button>
              <button onClick={() => setDemoUser('docente1@demo.com')} className="px-3 py-2 text-xs font-medium bg-gray-50 text-gray-700 rounded-md border border-gray-200 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition-colors">Profesor</button>
              <button onClick={() => setDemoUser('alumno@demo.com')} className="px-3 py-2 text-xs font-medium bg-gray-50 text-gray-700 rounded-md border border-gray-200 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition-colors">Estudiante</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
