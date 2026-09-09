import React from 'react';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';

import DashboardLayout from '@/components/DashboardLayout';
import { getMenuGroupsForRoles } from '@/lib/nav/menu';
import { getTeacherDashboardData } from '@/actions/teacher';

export default async function TeacherClassesPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const menuGroups = getMenuGroupsForRoles(session.user.roles ?? []);
  const data = await getTeacherDashboardData();

  return (
    <DashboardLayout
      roleTitle="Docente"
      userName={data.teacherName ?? 'Docente'}
      userRole={data.teacherRole ?? 'Docente'}
      menuGroups={menuGroups}
      breadcrumbs={['Docente', 'Mis Clases']}
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Mis Clases</h1>
            <p className="text-sm text-gray-500 mt-1">Accede al detalle de cada clase para asistencia, calificaciones y planeación.</p>
          </div>
        </div>

        {data.classes.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <p className="text-sm text-gray-600">No hay clases asignadas para este docente.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {data.classes.map((c: any) => (
              <Link
                key={c.id}
                href={`/teacher/classes/${c.id}`}
                className="no-underline block bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:border-indigo-200 hover:shadow-md transition"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-gray-500">{c.subject}</div>
                    <div className="text-lg font-bold text-gray-900 truncate">{c.name}</div>
                    <div className="text-sm text-gray-600 mt-1">{c.grade}</div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className="px-2 py-1 rounded-lg text-xs font-semibold bg-gray-50 border border-gray-200 text-gray-700">
                      {c.students} alumnos
                    </span>
                    <span className="px-2 py-1 rounded-lg text-xs font-semibold bg-indigo-50 border border-indigo-100 text-indigo-700">
                      {c.nextLesson}
                    </span>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <div className="text-xs text-gray-500">Pendientes: {c.pendingGrades} califs</div>
                  <div className={c.allCaughtUp ? 'text-xs font-semibold text-green-700' : 'text-xs font-semibold text-amber-700'}>
                    {c.allCaughtUp ? 'Al día' : 'Acción requerida'}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
