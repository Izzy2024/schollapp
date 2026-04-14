'use client';

import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { message } from 'antd';
import { getMenuGroupsForRoles } from '@/lib/nav/menu';

const menuGroups = getMenuGroupsForRoles(['student']);

type MonthSummary = { month: string; present: number; absent: number; late: number; excused: number; total: number };

export default function StudentAttendancePage() {
  const [byMonth, setByMonth] = useState<MonthSummary[]>([]);
  const [totalStats, setTotalStats] = useState({ present: 0, absent: 0, late: 0, excused: 0, total: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { getCurrentStudent } = await import('@/actions/studentQueries');
        const student = await getCurrentStudent();
        if (!student) return;
        const { getStudentAttendanceSummary } = await import('@/actions/attendance');
        const summary = await getStudentAttendanceSummary(student.id);
        const months = Object.values(summary.byMonth).sort((a: any, b: any) => b.month.localeCompare(a.month)) as MonthSummary[];
        setByMonth(months);
        const total = months.reduce((acc, m) => ({
          present: acc.present + m.present, absent: acc.absent + m.absent,
          late: acc.late + m.late, excused: acc.excused + m.excused, total: acc.total + m.total,
        }), { present: 0, absent: 0, late: 0, excused: 0, total: 0 });
        setTotalStats(total);
      } catch (e: any) {
        message.error(e.message || 'Error cargando asistencia');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const attendancePct = totalStats.total > 0 ? Math.round(((totalStats.present + totalStats.late) / totalStats.total) * 100) : null;

  return (
    <DashboardLayout roleTitle="Alumno" userName="Alumno" userRole="Estudiante" menuGroups={menuGroups} breadcrumbs={['Alumno', 'Asistencia']}>
      <div className="flex items-center gap-4 mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Mi Asistencia</h1>
      </div>

      {loading ? (
        <div className="py-16 text-center text-gray-400">
          <span className="material-symbols-outlined text-4xl text-gray-200 block mb-3 animate-spin">progress_activity</span>
          Cargando...
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Asistencia', value: attendancePct !== null ? `${attendancePct}%` : '—', icon: 'how_to_reg', color: 'bg-green-50 text-green-600' },
              { label: 'Presentes', value: totalStats.present.toString(), icon: 'check_circle', color: 'bg-blue-50 text-blue-600' },
              { label: 'Faltas', value: totalStats.absent.toString(), icon: 'cancel', color: 'bg-red-50 text-red-600' },
              { label: 'Retardos', value: totalStats.late.toString(), icon: 'schedule', color: 'bg-amber-50 text-amber-600' },
            ].map(kpi => (
              <div key={kpi.label} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${kpi.color}`}><span className="material-symbols-outlined text-xl">{kpi.icon}</span></div>
                <div>
                  <div className="text-xs font-medium text-gray-500">{kpi.label}</div>
                  <div className="text-xl font-bold text-gray-900">{kpi.value}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Monthly breakdown */}
          {byMonth.length === 0 ? (
            <div className="py-12 text-center bg-white rounded-2xl border border-dashed border-gray-200">
              <span className="material-symbols-outlined text-5xl text-gray-200 mb-4 block">event_available</span>
              <p className="text-gray-500">No hay registros de asistencia.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="text-left py-3 px-5 text-gray-500 font-medium">Mes</th>
                    <th className="text-center py-3 px-5 text-gray-500 font-medium">Total</th>
                    <th className="text-center py-3 px-5 text-green-600 font-medium">Presente</th>
                    <th className="text-center py-3 px-5 text-red-600 font-medium">Falta</th>
                    <th className="text-center py-3 px-5 text-amber-600 font-medium">Retardo</th>
                    <th className="text-center py-3 px-5 text-gray-500 font-medium">%</th>
                  </tr>
                </thead>
                <tbody>
                  {byMonth.map(m => {
                    const pct = m.total > 0 ? Math.round(((m.present + m.late) / m.total) * 100) : 0;
                    return (
                      <tr key={m.month} className="border-b border-gray-50 last:border-0">
                        <td className="py-3 px-5 font-medium text-gray-900 capitalize">{m.month}</td>
                        <td className="py-3 px-5 text-center text-gray-600">{m.total}</td>
                        <td className="py-3 px-5 text-center text-green-700 font-semibold">{m.present}</td>
                        <td className="py-3 px-5 text-center text-red-600">{m.absent}</td>
                        <td className="py-3 px-5 text-center text-amber-600">{m.late}</td>
                        <td className="py-3 px-5 text-center font-bold text-gray-900">{pct}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </DashboardLayout>
  );
}
