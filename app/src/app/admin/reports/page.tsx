'use client';

import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { 
  getReportDashboardKPIs, 
  getEnrollmentStatsBySection, 
  getRecentAttendanceStats,
  exportActiveStudentsCsv 
} from '@/actions/reports';
import { message } from 'antd';
import { getMenuGroupsForRoles } from '@/lib/nav/menu';

const menuGroups = getMenuGroupsForRoles(['admin']);


type KPIs = Awaited<ReturnType<typeof getReportDashboardKPIs>>;
type EnrollmentStats = Awaited<ReturnType<typeof getEnrollmentStatsBySection>>;
type AttendanceStats = Awaited<ReturnType<typeof getRecentAttendanceStats>>;

export default function ReportsPage() {
  const [kpis, setKpis] = useState<KPIs | null>(null);
  const [enrollment, setEnrollment] = useState<EnrollmentStats>([]);
  const [attendance, setAttendance] = useState<AttendanceStats>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    Promise.all([
      getReportDashboardKPIs(),
      getEnrollmentStatsBySection(),
      getRecentAttendanceStats()
    ])
      .then(([k, e, a]) => {
        setKpis(k);
        setEnrollment(e);
        setAttendance(a);
      })
      .catch((err: any) => message.error(err.message || 'Error cargando reportes'))
      .finally(() => setLoading(false));
  }, []);

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const csvContent = await exportActiveStudentsCsv();
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Alumnos_SIA_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      message.success('Exportación completada');
    } catch (err: any) {
      message.error(err.message || 'Error al exportar alumnos');
    } finally {
      setExporting(false);
    }
  };

  return (
    <DashboardLayout
      roleTitle="Admin / Control Escolar"
      userName="Administrador"
      userRole="Administrador"
      menuGroups={menuGroups}
      breadcrumbs={['Admin', 'Reportes']}
    >
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reportes y Estadísticas</h1>
          <p className="text-sm text-gray-500">Métricas globales de la escuela</p>
        </div>
        
        <button
          onClick={handleExportCsv}
          disabled={exporting}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 text-sm font-bold rounded-xl hover:bg-indigo-100 transition-colors shadow-sm disabled:opacity-50"
        >
          {exporting ? (
            <span className="material-symbols-outlined text-lg animate-spin">progress_activity</span>
          ) : (
            <span className="material-symbols-outlined text-lg">download</span>
          )}
          {exporting ? 'Generando...' : 'Exportar Alumnos (CSV)'}
        </button>
      </div>

      {loading ? (
        <div className="py-20 text-center text-gray-400">
          <span className="material-symbols-outlined text-4xl text-gray-200 block mb-3 animate-spin">progress_activity</span>
          Compilando reportes...
        </div>
      ) : (
        <>
          {/* Main KPIs (Stat Cards) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Alumnos Activos</p>
                <p className="text-3xl font-bold text-gray-900">{kpis?.activeStudents}</p>
              </div>
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl">people</span>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Grupos Activos (Ciclo Actual)</p>
                <p className="text-3xl font-bold text-gray-900">{kpis?.activeSections}</p>
              </div>
              <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl">class</span>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Asistencia Promedio (Mes)</p>
                <p className="text-3xl font-bold text-gray-900">{kpis?.monthlyAttendancePct !== null ? `${kpis?.monthlyAttendancePct}%` : 'S/D'}</p>
              </div>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                !kpis?.monthlyAttendancePct ? 'bg-gray-50 text-gray-400' :
                kpis.monthlyAttendancePct >= 90 ? 'bg-green-50 text-green-600' :
                kpis.monthlyAttendancePct >= 75 ? 'bg-yellow-50 text-yellow-600' : 'bg-red-50 text-red-600'
              }`}>
                <span className="material-symbols-outlined text-2xl">rule</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Enrollment Stats */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col h-full">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <span className="material-symbols-outlined text-indigo-500">bar_chart</span>
                  Matrícula por Grupo
                </h3>
              </div>
              {enrollment.length === 0 ? (
                <div className="py-10 text-center text-gray-400 text-sm">No hay grupos configurados.</div>
              ) : (
                <div className="space-y-4 overflow-y-auto pr-2 max-h-[400px]">
                  {enrollment.map(s => (
                    <div key={s.id}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="font-semibold text-gray-700">{s.gradeName} "{s.sectionName}"</span>
                        <span className="text-gray-500 text-xs">{s.enrolled} / {s.capacity}</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden flex">
                        <div 
                          className={`h-2.5 rounded-full transition-all ${s.occupancyPct >= 100 ? 'bg-red-500' : s.occupancyPct >= 80 ? 'bg-amber-400' : 'bg-green-500'}`}
                          style={{ width: `${Math.min(100, s.occupancyPct)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Attendance Analytics */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col h-full">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <span className="material-symbols-outlined text-orange-500">trending_down</span>
                  Ausentismo Reciente (Últ. 7 días)
                </h3>
              </div>
              {attendance.length === 0 ? (
                <div className="py-10 text-center text-gray-400 text-sm">No hay registros de asistencia en los últimos 7 días.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-gray-100 text-xs uppercase text-gray-400 font-semibold tracking-wider">
                        <th className="pb-3 px-2">Grupo</th>
                        <th className="pb-3 px-2 text-center">Registros evaluados</th>
                        <th className="pb-3 px-2 text-right">Asistencia (%)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 text-sm">
                      {attendance.map(a => (
                        <tr key={a.sectionId} className="hover:bg-gray-50/50">
                          <td className="py-3 px-2 font-medium text-gray-700">{a.gradeName} "{a.sectionName}"</td>
                          <td className="py-3 px-2 text-center text-gray-500">{a.totalRecords}</td>
                          <td className="py-3 px-2 text-right">
                            <span className={`inline-block px-2 py-0.5 rounded-lg font-bold text-xs ${
                              (a.attendancePct || 0) < 80 ? 'bg-red-100 text-red-700' : 
                              (a.attendancePct || 0) < 90 ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
                            }`}>
                              {a.attendancePct}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="text-xs text-center text-gray-400 mt-4">* Ordenado de menor a mayor para destacar grupos con problemas de presentismo.</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
