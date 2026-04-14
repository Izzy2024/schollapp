'use client';

import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { message } from 'antd';
import { getMenuGroupsForRoles } from '@/lib/nav/menu';

const menuGroups = getMenuGroupsForRoles(['director']);

type StaffMember = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  roleLabel: string;
  isActive: boolean;
  classesCount: number;
  classesPreview: string;
};

export default function DirectorStaffPage() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const { getStaffList } = await import('@/actions/staff');
        const result = await getStaffList(search || undefined);
        setStaff(result.staff as StaffMember[]);
      } catch (e: any) {
        message.error(e.message || 'Error cargando personal');
      } finally {
        setLoading(false);
      }
    })();
  }, [search]);

  const totalTeachers = staff.length;
  const withClasses = staff.filter(s => s.classesCount > 0).length;
  const avgClasses = totalTeachers > 0 ? (staff.reduce((s, t) => s + t.classesCount, 0) / totalTeachers).toFixed(1) : '0';

  return (
    <DashboardLayout
      roleTitle="Director"
      userName="Director"
      userRole="Director"
      menuGroups={menuGroups}
      breadcrumbs={['Director', 'Desempeño Docente']}
    >
      <div className="flex items-center gap-4 mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Desempeño Docente</h1>
        <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-sm font-bold">
          {totalTeachers} docentes
        </span>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        {[
          { label: 'Total Docentes', value: totalTeachers.toString(), icon: 'groups', color: 'bg-blue-50 text-blue-600' },
          { label: 'Con Asignaciones', value: withClasses.toString(), icon: 'assignment_ind', color: 'bg-green-50 text-green-600' },
          { label: 'Promedio Clases', value: avgClasses, icon: 'calculate', color: 'bg-violet-50 text-violet-600' },
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

      {/* Search */}
      <div className="mb-5">
        <div className="relative max-w-md">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">search</span>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar docente..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center text-gray-400">
          <span className="material-symbols-outlined text-4xl text-gray-200 block mb-3 animate-spin">progress_activity</span>
          Cargando personal...
        </div>
      ) : staff.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-2xl border border-dashed border-gray-200">
          <span className="material-symbols-outlined text-5xl text-gray-200 mb-4 block">person_search</span>
          <p className="text-gray-500">No se encontraron docentes.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left py-3 px-5 text-gray-500 font-medium">Docente</th>
                <th className="text-left py-3 px-5 text-gray-500 font-medium">Rol</th>
                <th className="text-center py-3 px-5 text-gray-500 font-medium">Clases</th>
                <th className="text-left py-3 px-5 text-gray-500 font-medium">Asignaciones</th>
              </tr>
            </thead>
            <tbody>
              {staff.map(s => (
                <tr key={s.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                  <td className="py-3 px-5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm font-bold">
                        {s.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{s.fullName}</div>
                        <div className="text-xs text-gray-400">{s.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-5">
                    <span className="px-2.5 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-lg">{s.roleLabel}</span>
                  </td>
                  <td className="py-3 px-5 text-center">
                    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                      s.classesCount > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'
                    }`}>
                      {s.classesCount}
                    </span>
                  </td>
                  <td className="py-3 px-5 text-gray-500 text-xs max-w-xs truncate">{s.classesPreview || 'Sin asignar'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DashboardLayout>
  );
}
