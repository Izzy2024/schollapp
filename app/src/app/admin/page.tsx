'use client';

import React, { useEffect, useState, useMemo } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { getAdminDashboardStats } from '@/actions/admin';
import Link from 'next/link';

const baseMenuGroups = [
  {
    title: 'Menú Principal',
    items: [
      { key: '1', icon: 'home', label: 'Vista General', href: '/admin' },
      { key: 'subjects', icon: 'menu_book', label: 'Materias', href: '/admin/subjects' },
      { key: 'classes', icon: 'class', label: 'Gestión de Clases', href: '/admin/classes' },
      { key: 'staff', icon: 'badge', label: 'Docentes / Staff', href: '/admin/staff' },
      { key: 'class-requests', icon: 'pending_actions', label: 'Solicitudes de Clase', href: '/admin/class-requests' },
      { key: 'schedule-requests', icon: 'schedule_send', label: 'Solicitudes de Horario', href: '/admin/schedule-requests' },
      { key: 'students', icon: 'people', label: 'Estudiantes', href: '/admin/students' },
      { key: 'enrollment', icon: 'how_to_reg', label: 'Inscripciones', href: '/admin/enrollment' },
      { key: '2', icon: 'assignment', label: 'Preparación de Clase', href: '/admin/class-prep' },
      { key: '3', icon: 'schedule', label: 'Asistencia', href: '/admin/attendance' },
      { key: '4', icon: 'edit_note', label: 'Exámenes', href: '/admin/exams' },
      { key: '5', icon: 'bookmark', label: 'Gestión de Tareas', href: '/admin/assignments' },
      { key: '6', icon: 'access_time', label: 'Horarios', href: '/admin/schedule' },
      { key: '8', icon: 'mail', label: 'Mensajes', href: '/admin/messages' },
      { key: '9', icon: 'donut_large', label: 'Analítica', href: '/admin/analytics' },
      { key: '10', icon: 'article', label: 'Reportes', href: '/admin/reports' },
    ],
  },
  {
    title: 'Configuración',
    items: [
      { key: '11', icon: 'campaign', label: 'Noticias', href: '/admin/news' },
      { key: '12', icon: 'local_activity', label: 'Actividades', href: '/admin/activities' },
      { key: '13', icon: 'settings', label: 'Configuración', href: '/admin/settings' },
    ],
  },
];

export default function AdminDashboard() {
  const [stats, setStats] = useState<Awaited<ReturnType<typeof getAdminDashboardStats>> | null>(null);

  useEffect(() => {
    getAdminDashboardStats('school-demo')
      .then(setStats)
      .catch(console.error);
  }, []);

  const menuGroups = useMemo(() => {
    const groups = JSON.parse(JSON.stringify(baseMenuGroups)) as typeof baseMenuGroups;
    if (stats && stats.pendingRequestsCount > 0) {
      const mainGroup = groups.find((g) => g.title === 'Menú Principal');
      const reqItem = mainGroup?.items.find((i) => i.key === 'class-requests');
      if (reqItem) {
        (reqItem as any).badge = stats.pendingRequestsCount;
      }
    }
    return groups;
  }, [stats]);

  return (
    <DashboardLayout
      roleTitle="Admin / Control Escolar"
      userName="Administrador"
      userRole="Administrador"
      menuGroups={menuGroups}
      breadcrumbs={['Dashboard']}
    >
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Vista General</h1>
      </div>

      {stats ? (
        <>
          {/* Stat Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="stat-card">
              <div className="flex justify-between items-start mb-3">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                  <span className="material-symbols-outlined">school</span>
                </div>
              </div>
              <h3 className="text-sm font-medium text-gray-500">Total Estudiantes</h3>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.studentsCount}</p>
            </div>
            <div className="stat-card">
              <div className="flex justify-between items-start mb-3">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                  <span className="material-symbols-outlined">badge</span>
                </div>
              </div>
              <h3 className="text-sm font-medium text-gray-500">Docentes Activos</h3>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.teachersCount}</p>
            </div>
            <div className="stat-card">
              <div className="flex justify-between items-start mb-3">
                <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                  <span className="material-symbols-outlined">class</span>
                </div>
              </div>
              <h3 className="text-sm font-medium text-gray-500">Secciones Activas</h3>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.sectionsCount}</p>
            </div>
            <div className="stat-card">
              <div className="flex justify-between items-start mb-3">
                <div className="p-2 bg-green-50 text-green-600 rounded-lg">
                  <span className="material-symbols-outlined">rule</span>
                </div>
              </div>
              <h3 className="text-sm font-medium text-gray-500">Asistencia Hoy</h3>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {stats.attendanceTodayPct !== null ? `${stats.attendanceTodayPct}%` : 'N/A'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-gray-900">Actividad Reciente</h3>
              </div>
              {stats.recentActivities.length === 0 ? (
                <div className="py-8 text-center text-gray-500">No hay actividad reciente.</div>
              ) : (
                <div className="space-y-4">
                  {stats.recentActivities.map((act) => (
                    <div key={act.id} className="flex gap-4 p-4 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors">
                      <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                        <span className="material-symbols-outlined text-lg">history</span>
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <p className="text-sm font-semibold text-gray-900">{act.description}</p>
                          <span className="text-xs text-gray-500">
                            {new Date(act.occurredAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-0.5">Por {act.actorName}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-900">Acciones Recomendadas</h3>
              </div>
              
              <div className="space-y-4">
                {stats.pendingRequestsCount > 0 && (
                  <Link href="/admin/class-requests" className="flex items-center justify-between p-4 bg-yellow-50 border border-yellow-100 rounded-xl hover:bg-yellow-100 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-yellow-600 shadow-sm">
                        <span className="material-symbols-outlined">pending_actions</span>
                      </div>
                      <div>
                        <h4 className="font-semibold text-yellow-900">Solicitudes Pendientes</h4>
                        <p className="text-sm text-yellow-800 opacity-80">Tienes {stats.pendingRequestsCount} solicitud(es) de clase por revisar.</p>
                      </div>
                    </div>
                    <span className="material-symbols-outlined text-yellow-600">arrow_forward</span>
                  </Link>
                )}

                <Link href="/admin/students" className="flex items-center justify-between p-4 bg-gray-50 border border-gray-100 rounded-xl hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-gray-600 shadow-sm">
                      <span className="material-symbols-outlined">person_add</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Inscribir Alumnos</h4>
                      <p className="text-sm text-gray-500">Ir al módulo de control escolar.</p>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-gray-400">arrow_forward</span>
                </Link>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="p-12 text-center text-gray-500">Cargando métricas...</div>
      )}
    </DashboardLayout>
  );
}
