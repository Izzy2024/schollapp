'use client';

import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';
import { App } from 'antd';
import { getMenuGroupsForRoles } from '@/lib/nav/menu';
import {
  getReportDashboardKPIs,
  getEnrollmentStatsBySection,
  getRecentAttendanceStats,
  getDirectorFinancialSummary,
  exportActiveStudentsCsv,
} from '@/actions/reports';
import { getDirectorOverviewStats } from '@/actions/directorOverview';
import { getDirectorRecentActivities } from '@/actions/directorActivity';

const menuGroups = getMenuGroupsForRoles(['director']);

type KPIs = Awaited<ReturnType<typeof getReportDashboardKPIs>>;
type EnrollmentStats = Awaited<ReturnType<typeof getEnrollmentStatsBySection>>;
type AttendanceStats = Awaited<ReturnType<typeof getRecentAttendanceStats>>;
type FinancialSummary = Awaited<ReturnType<typeof getDirectorFinancialSummary>>;
type OverviewStats = Awaited<ReturnType<typeof getDirectorOverviewStats>>;
type Activities = Awaited<ReturnType<typeof getDirectorRecentActivities>>;

export default function DirectorDashboard() {
  const { message } = App.useApp();
  const [kpis, setKpis] = useState<KPIs | null>(null);
  const [enrollment, setEnrollment] = useState<EnrollmentStats>([]);
  const [attendance, setAttendance] = useState<AttendanceStats>([]);
  const [financial, setFinancial] = useState<FinancialSummary | null>(null);
  const [overview, setOverview] = useState<OverviewStats | null>(null);
  const [activities, setActivities] = useState<Activities | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    Promise.all([
      getReportDashboardKPIs(),
      getEnrollmentStatsBySection(),
      getRecentAttendanceStats(),
      getDirectorFinancialSummary(),
      getDirectorOverviewStats(),
      getDirectorRecentActivities(undefined, undefined, 1, 5),
    ])
      .then(([k, e, a, f, o, act]) => {
        setKpis(k);
        setEnrollment(e);
        setAttendance(a);
        setFinancial(f);
        setOverview(o);
        setActivities(act);
      })
      .catch((err: any) => message.error(err.message || 'Error cargando el panel de dirección'))
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
      link.setAttribute('download', `Alumnos_${new Date().toISOString().split('T')[0]}.csv`);
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
      roleTitle="Dirección / Analítica"
      userName="Director"
      userRole="Director de Educación"
      menuGroups={menuGroups}
      breadcrumbs={['Director Hub', 'Vista General']}
      headerAction={
        <button
          onClick={handleExportCsv}
          disabled={exporting}
          className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors shadow-lg disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-lg">{exporting ? 'progress_activity' : 'download'}</span>
          {exporting ? 'Generando...' : 'Exportar Alumnos (CSV)'}
        </button>
      }
    >
      {loading ? (
        <div className="py-20 text-center text-gray-400">
          <span className="material-symbols-outlined text-4xl text-gray-200 block mb-3 animate-spin">progress_activity</span>
          Cargando panel de dirección...
        </div>
      ) : (
        <>
          {/* KPI Stat Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="stat-card">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg w-fit mb-4">
                <span className="material-symbols-outlined">school</span>
              </div>
              <h3 className="text-sm font-medium text-gray-500">Alumnos Activos</h3>
              <p className="text-2xl font-bold text-gray-900 mt-1">{kpis?.activeStudents ?? '—'}</p>
              <p className="text-xs text-gray-400 mt-2">{overview?.studentsWithoutEnrollment ?? 0} sin matrícula activa</p>
            </div>
            <div className="stat-card">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg w-fit mb-4">
                <span className="material-symbols-outlined">check_circle</span>
              </div>
              <h3 className="text-sm font-medium text-gray-500">Asistencia Hoy</h3>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {overview?.attendanceTodayPct !== null && overview?.attendanceTodayPct !== undefined ? `${overview.attendanceTodayPct}%` : 'S/D'}
              </p>
              <p className="text-xs text-gray-400 mt-2">Promedio mensual: {kpis?.monthlyAttendancePct !== null ? `${kpis?.monthlyAttendancePct}%` : 'S/D'}</p>
            </div>
            <div className="stat-card">
              <div className="p-2 bg-purple-50 text-purple-600 rounded-lg w-fit mb-4">
                <span className="material-symbols-outlined">class</span>
              </div>
              <h3 className="text-sm font-medium text-gray-500">Grupos Activos</h3>
              <p className="text-2xl font-bold text-gray-900 mt-1">{kpis?.activeSections ?? '—'}</p>
              <p className="text-xs text-gray-400 mt-2">{overview?.pendingBreakdown.classRequests ?? 0} solicitudes de clase pendientes</p>
            </div>
            <Link href="/director/financials" className="stat-card no-underline hover:shadow-md transition-shadow">
              <div className="p-2 bg-amber-50 text-amber-600 rounded-lg w-fit mb-4">
                <span className="material-symbols-outlined">account_balance_wallet</span>
              </div>
              <h3 className="text-sm font-medium text-gray-500">Cartera Vencida</h3>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                ${((financial?.balanceDueCents ?? 0) / 100).toLocaleString('es-PA', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-gray-400 mt-2">Tasa de cobro: {financial?.collectionRate ?? 0}%</p>
            </Link>
          </div>

          {/* Enrollment + Attendance */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">Matrícula por Grupo</h3>
                <Link href="/director/enrollment" className="text-xs font-medium text-indigo-600 hover:text-indigo-800">Ver detalle</Link>
              </div>
              {enrollment.length === 0 ? (
                <p className="text-sm text-gray-400 py-8 text-center">No hay grupos configurados.</p>
              ) : (
                <div className="space-y-3 max-h-72 overflow-y-auto pr-2">
                  {enrollment.map((s) => (
                    <div key={s.id}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="font-medium text-gray-700">{s.gradeName} &quot;{s.sectionName}&quot;</span>
                        <span className="text-gray-500 text-xs">{s.enrolled} / {s.capacity}</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${s.occupancyPct >= 100 ? 'bg-red-500' : s.occupancyPct >= 80 ? 'bg-amber-400' : 'bg-green-500'}`}
                          style={{ width: `${Math.min(100, s.occupancyPct)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">Asistencia por Grupo (Últ. 7 días)</h3>
                <Link href="/director/academic" className="text-xs font-medium text-indigo-600 hover:text-indigo-800">Ver detalle</Link>
              </div>
              {attendance.length === 0 ? (
                <p className="text-sm text-gray-400 py-8 text-center">Sin registros de asistencia recientes.</p>
              ) : (
                <div className="space-y-3 max-h-72 overflow-y-auto pr-2">
                  {attendance.slice(0, 8).map((a) => (
                    <div key={a.sectionId} className="flex items-center gap-3">
                      <div className="flex-1 text-sm font-medium text-gray-700 truncate">{a.gradeName} &quot;{a.sectionName}&quot;</div>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${
                        (a.attendancePct || 0) < 80 ? 'bg-red-100 text-red-700' : (a.attendancePct || 0) < 90 ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
                      }`}>
                        {a.attendancePct}%
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Recent Activity + Recommended Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-6">Actividad Reciente</h3>
              {!activities || activities.activities.length === 0 ? (
                <div className="py-8 text-center text-gray-500">No hay actividad reciente.</div>
              ) : (
                <div className="space-y-4">
                  {activities.activities.map((act) => (
                    <div key={act.id} className="flex gap-4 p-4 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors">
                      <div className={`w-10 h-10 rounded-full ${act.display.iconBg} ${act.display.iconColor} flex items-center justify-center flex-shrink-0`}>
                        <span className="material-symbols-outlined text-lg">{act.display.icon}</span>
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <p className="text-sm font-semibold text-gray-900">{act.display.text}</p>
                          <span className="text-xs text-gray-500">{new Date(act.occurredAt).toLocaleDateString()}</span>
                        </div>
                        <p className="text-sm text-gray-600 mt-0.5">Por {act.actorName}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-6">Acciones Recomendadas</h3>
              <div className="space-y-4">
                {(overview?.pendingBreakdown.classRequests ?? 0) > 0 && (
                  <Link href="/director/class-requests" className="flex items-center justify-between p-4 bg-yellow-50 border border-yellow-100 rounded-xl hover:bg-yellow-100 transition-colors no-underline">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-yellow-600 shadow-sm">
                        <span className="material-symbols-outlined">pending_actions</span>
                      </div>
                      <div>
                        <h4 className="font-semibold text-yellow-900">Solicitudes Pendientes</h4>
                        <p className="text-sm text-yellow-800 opacity-80">{overview?.pendingBreakdown.classRequests} solicitud(es) de clase por revisar.</p>
                      </div>
                    </div>
                    <span className="material-symbols-outlined text-yellow-600">arrow_forward</span>
                  </Link>
                )}
                <Link href="/director/academic" className="flex items-center justify-between p-4 bg-gray-50 border border-gray-100 rounded-xl hover:bg-gray-100 transition-colors no-underline">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-gray-600 shadow-sm">
                      <span className="material-symbols-outlined">insights</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Rendimiento Académico</h4>
                      <p className="text-sm text-gray-500">Ver indicadores detallados por grupo.</p>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-gray-400">arrow_forward</span>
                </Link>
                <Link href="/director/enrollment" className="flex items-center justify-between p-4 bg-gray-50 border border-gray-100 rounded-xl hover:bg-gray-100 transition-colors no-underline">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-gray-600 shadow-sm">
                      <span className="material-symbols-outlined">how_to_reg</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Gestión de Matrícula</h4>
                      <p className="text-sm text-gray-500">Ir al módulo de inscripciones.</p>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-gray-400">arrow_forward</span>
                </Link>
              </div>
            </div>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
