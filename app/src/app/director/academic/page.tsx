'use client';

import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { message } from 'antd';
import { getMenuGroupsForRoles } from '@/lib/nav/menu';

const menuGroups = getMenuGroupsForRoles(['director']);

type AttendanceBySection = {
  sectionId: string;
  gradeName: string;
  sectionName: string;
  totalRecords: number;
  attendancePct: number | null;
};

type EnrollmentBySection = {
  id: string;
  gradeName: string;
  sectionName: string;
  capacity: number;
  enrolled: number;
  occupancyPct: number;
};

export default function DirectorAcademicPage() {
  const [attendanceData, setAttendanceData] = useState<AttendanceBySection[]>([]);
  const [enrollmentData, setEnrollmentData] = useState<EnrollmentBySection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [attendance, enrollment] = await Promise.all([
          import('@/actions/reports').then(m => m.getRecentAttendanceStats()),
          import('@/actions/reports').then(m => m.getEnrollmentStatsBySection()),
        ]);
        setAttendanceData(attendance as any);
        setEnrollmentData(enrollment as any);
      } catch (e: any) {
        message.error(e.message || 'Error cargando datos académicos');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const avgAttendance = attendanceData.length > 0
    ? Math.round(attendanceData.reduce((s, d) => s + (d.attendancePct || 0), 0) / attendanceData.length)
    : null;

  const totalEnrolled = enrollmentData.reduce((s, d) => s + d.enrolled, 0);
  const totalCapacity = enrollmentData.reduce((s, d) => s + d.capacity, 0);

  return (
    <DashboardLayout
      roleTitle="Director"
      userName="Director"
      userRole="Director"
      menuGroups={menuGroups}
      breadcrumbs={['Director', 'Rendimiento Académico']}
    >
      <div className="flex items-center gap-4 mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Rendimiento Académico</h1>
        <span className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm font-bold">
          Indicadores
        </span>
      </div>

      {loading ? (
        <div className="py-16 text-center text-gray-400">
          <span className="material-symbols-outlined text-4xl text-gray-200 block mb-3 animate-spin">progress_activity</span>
          Cargando indicadores académicos...
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
            {[
              { label: 'Asistencia Promedio (7 días)', value: avgAttendance !== null ? `${avgAttendance}%` : '—', icon: 'how_to_reg', color: avgAttendance !== null && avgAttendance >= 90 ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600' },
              { label: 'Alumnos Inscritos', value: totalEnrolled.toString(), icon: 'school', color: 'bg-blue-50 text-blue-600' },
              { label: 'Ocupación General', value: totalCapacity > 0 ? `${Math.round((totalEnrolled / totalCapacity) * 100)}%` : '—', icon: 'pie_chart', color: 'bg-violet-50 text-violet-600' },
            ].map(kpi => (
              <div key={kpi.label} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
                <div className={`p-3 rounded-xl ${kpi.color}`}>
                  <span className="material-symbols-outlined text-2xl">{kpi.icon}</span>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500">{kpi.label}</div>
                  <div className="text-2xl font-bold text-gray-900">{kpi.value}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Attendance by section */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-1">Asistencia por Grupo (últimos 7 días)</h2>
              <p className="text-xs text-gray-400 mb-4">Grupos con menor asistencia primero</p>
              {attendanceData.length === 0 ? (
                <p className="text-sm text-gray-400 py-8 text-center">Sin registros de asistencia recientes.</p>
              ) : (
                <div className="space-y-3">
                  {attendanceData.map(s => (
                    <div key={s.sectionId} className="flex items-center gap-3">
                      <div className="w-32 text-sm font-medium text-gray-700 truncate">{s.gradeName} — {s.sectionName}</div>
                      <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            (s.attendancePct || 0) >= 90 ? 'bg-green-500' : (s.attendancePct || 0) >= 75 ? 'bg-amber-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${s.attendancePct || 0}%` }}
                        />
                      </div>
                      <span className="text-sm font-bold text-gray-900 w-12 text-right">{s.attendancePct ?? '—'}%</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Enrollment by section */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-1">Matrícula por Grupo</h2>
              <p className="text-xs text-gray-400 mb-4">Ocupación actual por sección</p>
              {enrollmentData.length === 0 ? (
                <p className="text-sm text-gray-400 py-8 text-center">Sin datos de matrícula.</p>
              ) : (
                <div className="space-y-3">
                  {enrollmentData.map(s => (
                    <div key={s.id} className="flex items-center gap-3">
                      <div className="w-32 text-sm font-medium text-gray-700 truncate">{s.gradeName} — {s.sectionName}</div>
                      <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            s.occupancyPct >= 90 ? 'bg-red-400' : s.occupancyPct >= 70 ? 'bg-amber-400' : 'bg-blue-400'
                          }`}
                          style={{ width: `${s.occupancyPct}%` }}
                        />
                      </div>
                      <span className="text-sm font-bold text-gray-900 w-16 text-right">{s.enrolled}/{s.capacity}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
