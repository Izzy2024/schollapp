'use client';

import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { App } from 'antd';
import { getMenuGroupsForRoles } from '@/lib/nav/menu';

const menuGroups = getMenuGroupsForRoles(['admin']);

type KPIs = {
  activeStudents: number;
  activeSections: number;
  monthlyAttendancePct: number | null;
};

type EnrollmentSection = {
  id: string;
  gradeName: string;
  sectionName: string;
  capacity: number;
  enrolled: number;
  occupancyPct: number;
};

type AttendanceSection = {
  sectionId: string;
  gradeName: string;
  sectionName: string;
  totalRecords: number;
  attendancePct: number | null;
};

export default function AdminAnalyticsPage() {
  const { message } = App.useApp();
  const [kpis, setKpis] = useState<KPIs | null>(null);
  const [enrollment, setEnrollment] = useState<EnrollmentSection[]>([]);
  const [attendance, setAttendance] = useState<AttendanceSection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [kpiData, enrollData, attendData] = await Promise.all([
          import('@/actions/reports').then(m => m.getReportDashboardKPIs()),
          import('@/actions/reports').then(m => m.getEnrollmentStatsBySection()),
          import('@/actions/reports').then(m => m.getRecentAttendanceStats()),
        ]);
        setKpis(kpiData as any);
        setEnrollment(enrollData as any);
        setAttendance(attendData as any);
      } catch (e: any) {
        message.error(e.message || 'Error cargando analítica');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <DashboardLayout roleTitle="Admin" userName="Administrador" userRole="Administrador" menuGroups={menuGroups} breadcrumbs={['Admin', 'Analítica']}>
      <div className="flex items-center gap-4 mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Analítica</h1>
        <span className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm font-bold">Panel de métricas</span>
      </div>

      {loading ? (
        <div className="py-16 text-center text-gray-400">
          <span className="material-symbols-outlined text-4xl text-gray-200 block mb-3 animate-spin">progress_activity</span>
          Cargando métricas...
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
            {[
              { label: 'Alumnos Activos', value: kpis?.activeStudents ?? 0, icon: 'school', color: 'bg-blue-50 text-blue-600' },
              { label: 'Grupos Activos', value: kpis?.activeSections ?? 0, icon: 'groups', color: 'bg-green-50 text-green-600' },
              { label: 'Asistencia del Mes', value: kpis?.monthlyAttendancePct !== null ? `${kpis?.monthlyAttendancePct}%` : '—', icon: 'how_to_reg', color: kpis?.monthlyAttendancePct && kpis.monthlyAttendancePct >= 90 ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600' },
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
            {/* Enrollment */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Ocupación por Grupo</h2>
              {enrollment.length === 0 ? (
                <p className="text-sm text-gray-400 py-8 text-center">Sin datos de matrícula.</p>
              ) : (
                <div className="space-y-3">
                  {enrollment.map(s => (
                    <div key={s.id} className="flex items-center gap-3">
                      <div className="w-28 text-sm font-medium text-gray-700 truncate">{s.gradeName} {s.sectionName}</div>
                      <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${s.occupancyPct >= 90 ? 'bg-red-400' : s.occupancyPct >= 70 ? 'bg-amber-400' : 'bg-blue-400'}`} style={{ width: `${s.occupancyPct}%` }} />
                      </div>
                      <span className="text-sm font-bold text-gray-900 w-14 text-right">{s.enrolled}/{s.capacity}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Attendance */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-1">Asistencia (últimos 7 días)</h2>
              <p className="text-xs text-gray-400 mb-4">Grupos con menor asistencia primero</p>
              {attendance.length === 0 ? (
                <p className="text-sm text-gray-400 py-8 text-center">Sin registros de asistencia recientes.</p>
              ) : (
                <div className="space-y-3">
                  {attendance.map(s => (
                    <div key={s.sectionId} className="flex items-center gap-3">
                      <div className="w-28 text-sm font-medium text-gray-700 truncate">{s.gradeName} {s.sectionName}</div>
                      <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${(s.attendancePct || 0) >= 90 ? 'bg-green-500' : (s.attendancePct || 0) >= 75 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${s.attendancePct || 0}%` }} />
                      </div>
                      <span className="text-sm font-bold text-gray-900 w-12 text-right">{s.attendancePct ?? '—'}%</span>
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
