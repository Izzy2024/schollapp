'use client';

import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { message } from 'antd';
import { getMenuGroupsForRoles } from '@/lib/nav/menu';

const menuGroups = getMenuGroupsForRoles(['teacher']);

export default function TeacherSettingsPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/auth/session');
        const session = await res.json();
        setName(session?.user?.name || '');
        setEmail(session?.user?.email || '');
      } catch { /* defaults */ } finally { setLoading(false); }
    })();
  }, []);

  return (
    <DashboardLayout roleTitle="Docente" userName="Docente" userRole="Docente" menuGroups={menuGroups} breadcrumbs={['Docente', 'Configuración']}>
      <div className="flex items-center gap-4 mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
      </div>

      {loading ? (
        <div className="py-16 text-center text-gray-400"><span className="material-symbols-outlined text-4xl text-gray-200 block mb-3 animate-spin">progress_activity</span>Cargando...</div>
      ) : (
        <div className="max-w-xl space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Perfil</h2>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xl font-bold">
                {name ? name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'DC'}
              </div>
              <div>
                <div className="font-bold text-gray-900 text-lg">{name || 'Docente'}</div>
                <div className="text-sm text-gray-500">{email || 'docente@demo.com'}</div>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nombre</label>
                <input type="text" value={name} readOnly className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-500 cursor-not-allowed" />
                <p className="text-xs text-gray-400 mt-1">Contacta al administrador para cambiar tu nombre.</p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Correo electrónico</label>
                <input type="email" value={email} readOnly className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-500 cursor-not-allowed" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Información</h2>
            <div className="space-y-3 text-sm text-gray-600">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-gray-400">info</span>
                <span>Para cambios en tu perfil o contraseña, contacta al administrador de la escuela.</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-gray-400">help</span>
                <span>Si tienes problemas con la plataforma, comunícate con administración.</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
