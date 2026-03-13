'use client';

import React, { useEffect, useState, useMemo } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { getEnrollmentStats } from '@/actions/directorStats';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

// Director Menu Groups with updates from Step 16
const menuGroups = [
  {
    title: 'Consola Directiva',
    items: [
      { key: '1', icon: 'analytics', label: 'Vista General', href: '/director' },
      { key: '2', icon: 'monitoring', label: 'Rendimiento Acad.', href: '/director/academic' },
      { key: 'dir-enrollment', icon: 'how_to_reg', label: 'Inscripciones', href: '/director/enrollment' },
      { key: 'dir-class-requests', icon: 'pending_actions', label: 'Solicitudes de Clase', href: '/director/class-requests' },
      { key: '4', icon: 'attach_money', label: 'Finanzas', href: '/director/financials' },
      { key: '5', icon: 'inventory_2', label: 'Gestión de Recursos', href: '/director/resources' },
    ],
  },
  {
    title: 'Reportes Estratégicos',
    items: [
      { key: '6', icon: 'verified', label: 'Acreditación', href: '/director/accreditation' },
      { key: '7', icon: 'psychology', label: 'Desempeño Docente', href: '/director/staff' },
    ],
  },
];

type GradeStat = { gradeName: string; enrolled: number; capacity: number };
type SectionStat = { gradeName: string; sectionName: string; enrolled: number; capacity: number; pct: number };

type StatsObj = {
  totalEnrolled: number;
  byGrade: GradeStat[];
  sections: SectionStat[];
  studentsWithoutEnrollment: number;
};

export default function DirectorEnrollmentPage() {
  const [stats, setStats] = useState<StatsObj | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getEnrollmentStats('school-demo')
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const totalSections = stats?.sections.length || 0;
  const avgOccupancy = useMemo(() => {
    if (!stats || stats.sections.length === 0) return 0;
    const sum = stats.sections.reduce((acc, curr) => acc + curr.pct, 0);
    return Math.round(sum / stats.sections.length);
  }, [stats]);

  const fullSections = useMemo(() => {
    return stats?.sections.filter(s => s.pct >= 100) || [];
  }, [stats]);

  const chartData = useMemo(() => {
    return {
      labels: stats?.byGrade.map(g => g.gradeName) || [],
      datasets: [
        {
          label: 'Inscritos por Grado',
          data: stats?.byGrade.map(g => g.enrolled) || [],
          backgroundColor: '#6366f1',
          borderRadius: 4,
        }
      ],
    };
  }, [stats]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
    },
    scales: {
      y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' }, border: { display: false } },
      x: { grid: { display: false } },
    },
  };

  return (
    <DashboardLayout
      roleTitle="Dirección / Analítica"
      userName="Dr. A. Richardson"
      userRole="Director de Educación"
      menuGroups={menuGroups}
      breadcrumbs={['Director', 'Inscripciones']}
    >
      {fullSections.length > 0 && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-8 rounded-r-xl flex items-start gap-3 shadow-sm">
          <span className="material-symbols-outlined text-yellow-600">warning</span>
          <div>
            <h3 className="text-yellow-800 font-bold text-sm">Atención Requerida</h3>
            <p className="text-yellow-700 text-sm mt-1">
              Hay <span className="font-bold">{fullSections.length} sección(es)</span> al 100% de capacidad o más.
            </p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Inscripciones — Vista Directiva</h1>
      </div>

      {loading ? (
        <div className="py-12 text-center text-gray-500">Cargando métricas...</div>
      ) : (
        <>
          {/* Stat Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="stat-card">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                  <span className="material-symbols-outlined">groups</span>
                </div>
              </div>
              <h3 className="text-sm font-medium text-gray-500">Total Inscritos</h3>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats?.totalEnrolled}</p>
            </div>
            
            <div className="stat-card">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                  <span className="material-symbols-outlined">class</span>
                </div>
              </div>
              <h3 className="text-sm font-medium text-gray-500">Secciones Activas</h3>
              <p className="text-3xl font-bold text-gray-900 mt-1">{totalSections}</p>
            </div>

            <div className="stat-card">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                  <span className="material-symbols-outlined">pie_chart</span>
                </div>
              </div>
              <h3 className="text-sm font-medium text-gray-500">Promedio de Ocupación</h3>
              <div className="flex items-center gap-3 mt-1">
                <p className="text-3xl font-bold text-gray-900">{avgOccupancy}%</p>
                <div className="flex-1 max-w-[100px] bg-gray-100 rounded-full h-2 mt-2">
                  <div className="bg-purple-500 h-2 rounded-full" style={{ width: `${avgOccupancy}%` }}></div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chart */}
            <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex flex-col">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Distribución por Grado</h3>
              <div className="flex-1 min-h-[300px]">
                <Bar data={chartData} options={chartOptions} />
              </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
              <div className="p-6 border-b border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900">Detalle de Secciones</h3>
              </div>
              <div className="overflow-y-auto max-h-[400px]">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-gray-50/80 text-gray-600 font-medium sticky top-0 backdrop-blur-sm z-10">
                    <tr>
                      <th className="px-6 py-3">Grado/Sec.</th>
                      <th className="px-6 py-3 text-right">Insc. / Cap.</th>
                      <th className="px-6 py-3">% Ocup.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-gray-800">
                    {stats?.sections.map((s, idx) => (
                      <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-semibold text-gray-900">{s.gradeName}</div>
                          <div className="text-xs text-gray-500">Sección {s.sectionName}</div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="font-medium text-gray-900">{s.enrolled}</span>
                          <span className="text-gray-400 mx-1">/</span>
                          <span className="text-gray-500">{s.capacity || '∞'}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className={`w-8 text-right font-medium ${s.pct >= 100 ? 'text-red-600' : 'text-gray-700'}`}>{s.pct}%</span>
                            <div className="w-16 bg-gray-100 rounded-full h-1.5 flex-shrink-0">
                              <div 
                                className={`h-1.5 rounded-full ${s.pct >= 100 ? 'bg-red-500' : s.pct >= 85 ? 'bg-yellow-500' : 'bg-indigo-500'}`} 
                                style={{ width: `${Math.min(100, s.pct)}%` }}
                              ></div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
