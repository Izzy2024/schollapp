'use client';

import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { getCurrentStudent } from '@/actions/studentQueries';
import { getStudentLoans, type LoanRow } from '@/actions/library';
import { App } from 'antd';
import { getMenuGroupsForRoles } from '@/lib/nav/menu';

const menuGroups = getMenuGroupsForRoles(['student']);

export default function StudentLibraryPage() {
  const { message } = App.useApp();
  const [loans, setLoans] = useState<LoanRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const student = await getCurrentStudent();
        if (!student) return;
        setLoans(await getStudentLoans(student.id));
      } catch (e: any) {
        message.error(e.message || 'Error al cargar préstamos');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const active = loans.filter((l) => !l.returnedAt);
  const history = loans.filter((l) => l.returnedAt);

  return (
    <DashboardLayout roleTitle="Alumno" userName="Alumno" userRole="Estudiante" menuGroups={menuGroups} breadcrumbs={['Alumno', 'Biblioteca']}>
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Mis Préstamos de Biblioteca</h1>

      {loading ? (
        <div className="py-16 text-center text-gray-400">Cargando...</div>
      ) : loans.length === 0 ? (
        <div className="py-12 text-center bg-white rounded-2xl border border-dashed border-gray-200">
          <span className="material-symbols-outlined text-5xl text-gray-200 mb-4 block">menu_book</span>
          <p className="text-gray-500">No tienes préstamos de biblioteca.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {active.length > 0 && (
            <div>
              <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">Activos</h2>
              <div className="space-y-2">
                {active.map((l) => (
                  <div key={l.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center justify-between">
                    <span className="font-medium text-gray-900 text-sm">{l.bookTitle}</span>
                    <span className={`text-xs font-semibold ${l.isOverdue ? 'text-red-600' : 'text-gray-500'}`}>
                      Vence: {new Date(l.dueDate).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                      {l.isOverdue ? ' (vencido)' : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {history.length > 0 && (
            <div>
              <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">Historial</h2>
              <div className="space-y-2">
                {history.map((l) => (
                  <div key={l.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center justify-between">
                    <span className="text-sm text-gray-700">{l.bookTitle}</span>
                    <span className="text-xs text-gray-400">
                      Devuelto: {new Date(l.returnedAt!).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}
