'use client';

import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { getParentDashboardData } from '@/actions/parent';
import { getMenuGroupsForRoles } from '@/lib/nav/menu';
import Link from 'next/link';

const menuGroups = getMenuGroupsForRoles(['parent']);

export default function ParentDashboard() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getParentDashboardData('school-demo')
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch(console.error);
  }, []);

  return (
    <DashboardLayout
      roleTitle="Tutor / Padre"
      userName={data?.parentName || 'Familia'}
      userRole="Tutor"
      menuGroups={menuGroups}
      breadcrumbs={['Familia', 'Seguimiento']}
    >
      {/* Title */}
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Seguimiento Familiar</h1>
      <p className="text-sm text-gray-500 mb-8">{loading ? 'Cargando...' : `Bienvenido, ${data?.parentName || 'Familia Demo'}`}</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Children Section */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Mis Hijos</h2>
          {loading ? (
            <div className="space-y-4">
              {[1,2].map(i => (
                <div key={i} className="stat-card animate-pulse">
                  <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                </div>
              ))}
            </div>
          ) : (
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            data?.children?.map((child: any) => (
              <div key={child.id} className="stat-card p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-lg">
                      {child.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-gray-900">{child.name}</h3>
                      <p className="text-sm text-gray-500">{child.grade}</p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                    child.status === 'Presente' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      child.status === 'Presente' ? 'bg-green-500' : 'bg-orange-500'
                    }`}></span>
                    {child.status}
                  </span>
                </div>
                <div className="flex items-center gap-8 border-t border-gray-100 pt-4">
                  <div>
                    <span className="block text-xs text-gray-400 font-medium uppercase tracking-wide">Asistencia Mensual</span>
                    <span className="font-bold text-gray-900 text-lg">{child.attendance}</span>
                  </div>
                  <Link href="/parent/report-card" className="text-sm font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1 ml-auto transition-colors no-underline">
                    <span className="material-symbols-outlined text-base">visibility</span>
                    Ver Calificaciones
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Financial Panel */}
        <div className="space-y-6">
          <div className="stat-card p-6 bg-gradient-to-b from-white to-blue-50/30">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Estado de Cuenta</h2>
              <a
                href="/parent/finances"
                className="flex items-center gap-2 px-3 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-lg hover:bg-gray-800 transition-colors shadow-md"
              >
                <span className="material-symbols-outlined text-sm">receipt_long</span>
                Ver detalle
              </a>
            </div>
            <div className="text-center mb-6">
              <span className="text-gray-500 text-sm font-medium uppercase tracking-wider">Saldo Pendiente</span>
              <p className="text-3xl font-bold text-blue-600 mt-2">
                {typeof data?.financial?.balanceDueCents === 'number'
                  ? new Intl.NumberFormat('es-MX', {
                      style: 'currency',
                      currency: 'MXN',
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    }).format(data.financial.balanceDueCents / 100)
                  : new Intl.NumberFormat('es-MX', {
                      style: 'currency',
                      currency: 'MXN',
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    }).format(0)}
              </p>
              <span className="text-xs text-red-500 font-medium">{data?.financial?.balanceDueCents ? 'Pendiente' : 'Al corriente'}</span>
            </div>
            <div className="border-t border-gray-100 pt-4">
              <h5 className="font-semibold text-gray-700 text-sm mb-3">Próximos Cargos</h5>
              {/* MVP: upcoming charges list is shown in /parent/finances */}
              {data?.financial?.upcomingCharges?.length ? (
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                data.financial.upcomingCharges.map((charge: any) => (
                  <div key={charge.id} className="flex justify-between text-sm mb-2">
                    <span className="text-gray-500">{charge.concept}</span>
                    <span className="font-medium text-gray-900">$ {charge.amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500">Ver detalle en “Pagos y Finanzas”.</p>
              )}
            </div>
          </div>

          {/* Quick Links */}
          <div className="stat-card p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Acciones Rápidas</h3>
            <div className="space-y-3">
              <Link href="/parent/calendar" className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors text-left no-underline">
                <span className="material-symbols-outlined text-gray-500">calendar_month</span>
                <span className="text-sm font-medium text-gray-700">Ver Calendario Escolar</span>
              </Link>
              <Link href="/parent/documents" className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors text-left no-underline">
                <span className="material-symbols-outlined text-gray-500">description</span>
                <span className="text-sm font-medium text-gray-700">Subir Documentos</span>
              </Link>
              <Link href="/parent/messages" className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors text-left no-underline">
                <span className="material-symbols-outlined text-gray-500">support_agent</span>
                <span className="text-sm font-medium text-gray-700">Contactar Administración</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
