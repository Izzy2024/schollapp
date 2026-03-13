'use client';

import React from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const menuGroups = [
  {
    title: 'Consola Directiva',
    items: [
      { key: '1', icon: 'analytics', label: 'Vista General', href: '/director' },
      { key: '2', icon: 'monitoring', label: 'Rendimiento Acad.', href: '/director/academic' },
      { key: 'dir-enrollment', icon: 'how_to_reg', label: 'Inscripciones', href: '/director/enrollment' },
      { key: 'dir-class-requests', icon: 'pending_actions', label: 'Solicitudes de Clase', href: '/director/class-requests' },
      { key: 'dir-schedule-requests', icon: 'schedule_send', label: 'Solicitudes de Horario', href: '/director/schedule-requests' },
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

const gradeChartData = {
  labels: ['Ciencias', 'Matem.', 'Historia', 'Español', 'Artes', 'Ed. Fís.'],
  datasets: [
    {
      label: 'Grado A',
      data: [65, 59, 80, 81, 56, 90],
      backgroundColor: '#6366f1',
      borderRadius: 4,
    },
    {
      label: 'Grado B',
      data: [28, 48, 40, 19, 86, 27],
      backgroundColor: '#c7d2fe',
      borderRadius: 4,
    },
  ],
};

const gradeChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top' as const,
      align: 'end' as const,
      labels: { boxWidth: 10, usePointStyle: true, pointStyle: 'circle' as const },
    },
  },
  scales: {
    y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' }, border: { display: false } },
    x: { grid: { display: false } },
  },
};

const attendanceChartData = {
  labels: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie'],
  datasets: [
    {
      label: 'Asistencia %',
      data: [92, 94, 93, 98, 95],
      borderColor: '#10b981',
      backgroundColor: 'rgba(16, 185, 129, 0.1)',
      tension: 0.4,
      fill: true,
      pointBackgroundColor: '#fff',
      pointBorderColor: '#10b981',
      pointBorderWidth: 2,
      pointRadius: 4,
      pointHoverRadius: 6,
    },
  ],
};

const attendanceChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    y: { min: 80, max: 100, grid: { color: 'rgba(0,0,0,0.05)' }, border: { display: false }, ticks: { stepSize: 5 } },
    x: { grid: { display: false } },
  },
};

const reports = [
  { name: 'Revisión Curricular Q3', dept: 'Asuntos Académicos', status: 'Completado', statusColor: 'green', date: 'Oct 24, 2023', icon: 'description', iconBg: 'bg-orange-100 text-orange-600' },
  { name: 'Renovación Campus Fase 2', dept: 'Instalaciones', status: 'En Progreso', statusColor: 'yellow', date: 'Oct 22, 2023', icon: 'construction', iconBg: 'bg-blue-100 text-blue-600' },
  { name: 'Plan Reclutamiento 2024', dept: 'Recursos Humanos', status: 'En Revisión', statusColor: 'gray', date: 'Oct 20, 2023', icon: 'group_add', iconBg: 'bg-purple-100 text-purple-600' },
];

const resources = [
  { label: 'Asig. de Docentes', pct: 92, color: 'bg-indigo-500', note: '4 vacantes en Depto. Ciencias' },
  { label: 'Capacidad de Aulas', pct: 78, color: 'bg-teal-500', note: 'Optimizado para inscripción actual' },
  { label: 'Equipo de TI', pct: 65, color: 'bg-orange-500', note: 'Mantenimiento programado prox. semana' },
];

export default function DirectorDashboard() {
  return (
    <DashboardLayout
      roleTitle="Dirección / Analítica"
      userName="Dr. A. Richardson"
      userRole="Director de Educación"
      menuGroups={menuGroups}
      breadcrumbs={['Director Hub', 'Analítica General']}
      headerAction={
        <button className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors shadow-lg">
          <span className="material-symbols-outlined text-lg">download</span>
          Exportar Reporte
        </button>
      }
    >
      {/* KPI Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="stat-card">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <span className="material-symbols-outlined">school</span>
            </div>
            <span className="trend-up">
              <span className="material-symbols-outlined text-sm">trending_up</span>+2.4%
            </span>
          </div>
          <h3 className="text-sm font-medium text-gray-500">Prom. GPA</h3>
          <p className="text-2xl font-bold text-gray-900 mt-1">3.42</p>
          <p className="text-xs text-gray-400 mt-2">Vs. semestre anterior</p>
        </div>
        <div className="stat-card">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <span className="material-symbols-outlined">check_circle</span>
            </div>
            <span className="trend-down">
              <span className="material-symbols-outlined text-sm">trending_down</span>-0.5%
            </span>
          </div>
          <h3 className="text-sm font-medium text-gray-500">Tasa de Asistencia</h3>
          <p className="text-2xl font-bold text-gray-900 mt-1">94.8%</p>
          <p className="text-xs text-gray-400 mt-2">Promedio diario</p>
        </div>
        <div className="stat-card">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
              <span className="material-symbols-outlined">person_add</span>
            </div>
            <span className="trend-up">
              <span className="material-symbols-outlined text-sm">trending_up</span>+12
            </span>
          </div>
          <h3 className="text-sm font-medium text-gray-500">Nuevas Inscripciones</h3>
          <p className="text-2xl font-bold text-gray-900 mt-1">1,284</p>
          <p className="text-xs text-gray-400 mt-2">Año académico actual</p>
        </div>
        <div className="stat-card">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <span className="material-symbols-outlined">attach_money</span>
            </div>
            <span className="trend-neutral">En Ruta</span>
          </div>
          <h3 className="text-sm font-medium text-gray-500">Presupuesto Utilizado</h3>
          <p className="text-2xl font-bold text-gray-900 mt-1">42%</p>
          <p className="text-xs text-gray-400 mt-2">$2.4M Restante</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Distribución de Calificaciones por Depto.</h3>
              <p className="text-sm text-gray-500">Análisis comparativo entre ciencias y humanidades</p>
            </div>
            <select className="bg-gray-50 border-none text-sm text-gray-700 rounded-lg p-2 pr-8 cursor-pointer outline-none">
              <option>Examen Parcial</option>
              <option>Examen Final</option>
              <option>Evaluación General</option>
            </select>
          </div>
          <div className="h-72">
            <Bar data={gradeChartData} options={gradeChartOptions} />
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Tendencias de Asistencia</h3>
            <button className="text-gray-400 hover:text-gray-600">
              <span className="material-symbols-outlined">more_horiz</span>
            </button>
          </div>
          <div className="h-60">
            <Line data={attendanceChartData} options={attendanceChartOptions} />
          </div>
        </div>
      </div>

      {/* Reports Table + Resource Management */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Reportes Estratégicos</h3>
              <p className="text-sm text-gray-500">Últimas actualizaciones en metas institucionales</p>
            </div>
            <button className="text-sm font-medium text-indigo-600 hover:text-indigo-800">Ver Todos</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-medium">
                <tr>
                  <th className="px-6 py-4">Nombre del Reporte</th>
                  <th className="px-6 py-4">Departamento</th>
                  <th className="px-6 py-4">Estado</th>
                  <th className="px-6 py-4 text-right">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {reports.map((r, i) => (
                  <tr key={i} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 ${r.iconBg} rounded-lg`}>
                          <span className="material-symbols-outlined text-sm">{r.icon}</span>
                        </div>
                        <span className="font-medium text-gray-900">{r.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{r.dept}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                        r.statusColor === 'green' ? 'bg-green-100 text-green-700' :
                        r.statusColor === 'yellow' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          r.statusColor === 'green' ? 'bg-green-500' :
                          r.statusColor === 'yellow' ? 'bg-yellow-500' :
                          'bg-gray-500'
                        }`}></span>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 text-right">{r.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex flex-col">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Gestión de Recursos</h3>
          <div className="space-y-6 flex-1">
            {resources.map((r, i) => (
              <div key={i}>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">{r.label}</span>
                  <span className="text-sm font-bold text-gray-900">{r.pct}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div className={`${r.color} h-2 rounded-full transition-all`} style={{ width: `${r.pct}%` }}></div>
                </div>
                <p className="text-xs text-gray-400 mt-1.5">{r.note}</p>
              </div>
            ))}
          </div>
          <div className="mt-auto pt-6">
            <button className="w-full py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
              Abrir Panel de Recursos
              <span className="material-symbols-outlined text-base">arrow_forward</span>
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
