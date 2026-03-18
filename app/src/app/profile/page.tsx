import React from 'react';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { logOut } from '@/actions/authActions';

export default async function ProfilePage() {
  const session = await auth();
  
  if (!session?.user) {
    redirect('/login');
  }

  const user = session.user as any;

  // Simplified layout for the profile since it's a global page
  // You might want to match this with your specific dashboard menus
  const menuGroups = [
    {
      title: 'Sistema',
      items: [
        { key: 'back', icon: 'arrow_back', label: 'Volver al Inicio', href: '/' },
      ],
    }
  ];

  return (
    <DashboardLayout
      roleTitle="Perfil de Usuario"
      userName={user.name || 'Usuario'}
      userRole={user.roles?.join(', ') || 'N/A'}
      menuGroups={menuGroups}
      breadcrumbs={['Mi Perfil']}
    >
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">Mi Perfil</h1>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-8 flex items-start gap-6 border-b border-gray-100">
            <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-3xl shadow-inner">
              {user.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{user.name}</h2>
              <p className="text-gray-500">{user.email}</p>
              
              <div className="mt-4 flex flex-wrap gap-2">
                {user.roles?.map((r: string) => (
                  <span key={r} className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold uppercase rounded-lg">
                    {r}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="p-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Información de la Cuenta</h3>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-4 border-b border-gray-50">
                <div className="text-sm font-medium text-gray-500">ID de Usuario</div>
                <div className="text-sm text-gray-900 md:col-span-2 font-mono">{user.id}</div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-4 border-b border-gray-50">
                <div className="text-sm font-medium text-gray-500">Tenant (Escuela) ID</div>
                <div className="text-sm text-gray-900 md:col-span-2 font-mono">{user.tenantId}</div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-4 border-b border-gray-50">
                <div className="text-sm font-medium text-gray-500">URL del Tenant</div>
                <div className="text-sm text-gray-900 md:col-span-2">{user.tenantSlug}</div>
              </div>
            </div>

            <div className="mt-12 flex justify-end">
              <form action={logOut}>
                <button type="submit" className="px-6 py-2.5 bg-red-50 text-red-600 font-semibold rounded-xl hover:bg-red-100 transition-colors flex items-center gap-2">
                  <span className="material-symbols-outlined text-lg">logout</span>
                  Cerrar Sesión
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
