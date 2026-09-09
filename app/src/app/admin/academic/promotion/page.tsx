'use client';

import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { getAcademicYears } from '@/actions/academic';
import { previewPromotion, runPromotion, type PromotionPreviewRow, type PromotionResult } from '@/actions/promotion';
import { App } from 'antd';
import { getMenuGroupsForRoles } from '@/lib/nav/menu';

const menuGroups = getMenuGroupsForRoles(['admin']);

export default function PromotionPage() {
  const { message } = App.useApp();
  const [years, setYears] = useState<{ id: string; name: string; isActive: boolean }[]>([]);
  const [targetYearId, setTargetYearId] = useState('');
  const [preview, setPreview] = useState<PromotionPreviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<PromotionResult | null>(null);

  useEffect(() => {
    (async () => {
      const [yearsData, previewData] = await Promise.all([getAcademicYears(), previewPromotion()]);
      setYears(yearsData);
      setPreview(previewData);
      const firstInactive = yearsData.find((y: any) => !y.isActive);
      if (firstInactive) setTargetYearId(firstInactive.id);
      setLoading(false);
    })();
  }, []);

  const handleRun = async () => {
    if (!targetYearId) {
      message.error('Selecciona el año académico destino');
      return;
    }
    if (!confirm('Esto promoverá a todos los alumnos activos al siguiente grado en el año seleccionado y lo marcará como año activo. ¿Continuar?')) {
      return;
    }
    setRunning(true);
    try {
      const res = await runPromotion(targetYearId);
      if ('error' in res) {
        message.error(res.error);
      } else {
        setResult(res);
        message.success('Promoción ejecutada');
      }
    } catch (e: any) {
      message.error(e.message || 'Error al ejecutar la promoción');
    } finally {
      setRunning(false);
    }
  };

  const totalStudents = preview.reduce((sum, p) => sum + p.studentCount, 0);
  const activeYear = years.find((y) => y.isActive);
  const targetOptions = years.filter((y) => !y.isActive);

  return (
    <DashboardLayout
      roleTitle="Admin / Control Escolar"
      userName="Administrador"
      userRole="Administrador"
      menuGroups={menuGroups}
      breadcrumbs={['Admin', 'Académico', 'Promoción de año']}
    >
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Promoción de año académico</h1>
      <p className="text-sm text-gray-500 mb-8">
        Avanza a todos los alumnos activos de <strong>{activeYear?.name ?? 'el año activo'}</strong> al siguiente grado en el año que elijas.
        Los alumnos del grado más alto se marcan como egresados. El año destino debe existir ya (créalo primero en Académico si hace falta).
      </p>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6 max-w-xl">
        <label className="block text-sm font-medium text-gray-700 mb-2">Año académico destino</label>
        <select
          value={targetYearId}
          onChange={(e) => setTargetYearId(e.target.value)}
          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Selecciona...</option>
          {targetOptions.map((y) => (
            <option key={y.id} value={y.id}>{y.name}</option>
          ))}
        </select>
        {targetOptions.length === 0 && (
          <p className="text-xs text-amber-600 mt-2">No hay otro año académico creado. Crea uno en Admin → Académico primero.</p>
        )}
      </div>

      {loading ? (
        <div className="py-12 text-center text-gray-400">Cargando...</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-bold text-gray-900">Vista previa ({totalStudents} alumnos activos)</h3>
          </div>
          {preview.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No hay alumnos inscritos en el año activo.</div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50/50 text-gray-600 font-medium border-b border-gray-100">
                <tr>
                  <th className="px-5 py-3">Grado actual</th>
                  <th className="px-5 py-3">Sección</th>
                  <th className="px-5 py-3 text-center">Alumnos</th>
                  <th className="px-5 py-3">Destino</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {preview.map((p) => (
                  <tr key={p.sectionId}>
                    <td className="px-5 py-3 font-medium text-gray-900">{p.gradeLevelName}</td>
                    <td className="px-5 py-3 text-gray-600">{p.sectionName}</td>
                    <td className="px-5 py-3 text-center">{p.studentCount}</td>
                    <td className="px-5 py-3">
                      {p.targetGradeLevelName ? (
                        <span className="text-gray-700">{p.targetGradeLevelName}</span>
                      ) : (
                        <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded text-xs font-semibold">Egresa</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      <button
        onClick={handleRun}
        disabled={running || preview.length === 0}
        className="px-5 py-2.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
      >
        {running ? 'Ejecutando...' : 'Ejecutar promoción'}
      </button>

      {result && (
        <div className="mt-6 bg-green-50 border border-green-200 rounded-xl p-5 max-w-xl">
          <p className="text-sm text-green-800">
            <strong>{result.promoted}</strong> alumnos promovidos, <strong>{result.graduated}</strong> egresados,
            {' '}<strong>{result.sectionsCreated}</strong> secciones nuevas creadas.
          </p>
        </div>
      )}
    </DashboardLayout>
  );
}
