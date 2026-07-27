'use client';

import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { getCurrentStudent } from '@/actions/studentQueries';
import { getStudentConductRecords, type ConductRecordRow } from '@/actions/conduct';
import { App } from 'antd';
import { getMenuGroupsForRoles } from '@/lib/nav/menu';

const menuGroups = getMenuGroupsForRoles(['student']);

export default function StudentConductPage() {
  const { message } = App.useApp();
  const [records, setRecords] = useState<ConductRecordRow[]>([]);
  const [totalPoints, setTotalPoints] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const student = await getCurrentStudent();
        if (!student) return;
        const data = await getStudentConductRecords(student.id);
        setRecords(data.records);
        setTotalPoints(data.totalPoints);
      } catch (e: any) {
        message.error(e.message || 'Error al cargar conducta');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <DashboardLayout roleTitle="Alumno" userName="Alumno" userRole="Estudiante" menuGroups={menuGroups} breadcrumbs={['Alumno', 'Conducta']}>
      <div className="flex items-center gap-4 mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Mi Conducta</h1>
        {!loading && (
          <span className={`px-3 py-1 rounded-full text-sm font-bold ${totalPoints < 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-800'}`}>
            {totalPoints > 0 ? '+' : ''}{totalPoints} pts
          </span>
        )}
      </div>

      {loading ? (
        <div className="py-16 text-center text-gray-400">Cargando...</div>
      ) : records.length === 0 ? (
        <div className="py-12 text-center bg-white rounded-2xl border border-dashed border-gray-200">
          <span className="material-symbols-outlined text-5xl text-gray-200 mb-4 block">verified_user</span>
          <p className="text-gray-500">Sin registros de conducta.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {records.map((r) => (
            <div key={r.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={`px-2 py-0.5 rounded text-xs font-semibold ${
                    r.type === 'merit' ? 'bg-green-100 text-green-800' : r.type === 'demerit' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {r.type === 'merit' ? 'Mérito' : r.type === 'demerit' ? 'Demérito' : 'Incidente'}
                </span>
                {r.category && <span className="text-xs text-gray-500">{r.category}</span>}
                <span className={`text-xs font-bold ${r.points < 0 ? 'text-red-600' : r.points > 0 ? 'text-green-600' : 'text-gray-500'}`}>
                  {r.points > 0 ? '+' : ''}{r.points} pts
                </span>
              </div>
              <p className="text-sm text-gray-900">{r.description}</p>
              <p className="text-xs text-gray-400 mt-1">
                {new Date(r.occurredAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
