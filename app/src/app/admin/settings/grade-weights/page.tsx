'use client';

import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { getGradeWeights, setGradeWeights } from '@/actions/reportCards';
import { App } from 'antd';
import { getMenuGroupsForRoles } from '@/lib/nav/menu';

const menuGroups = getMenuGroupsForRoles(['admin']);

const EVALUATION_TYPES = ['Examen', 'Tarea', 'Participación', 'Proyecto'];

export default function GradeWeightsPage() {
  const { message } = App.useApp();
  const [weights, setWeights] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getGradeWeights()
      .then((rows) => {
        const map: Record<string, number> = {};
        for (const type of EVALUATION_TYPES) map[type] = 0;
        for (const row of rows) map[row.type] = row.weightPercent;
        setWeights(map);
      })
      .catch((error: any) => message.error(error.message || 'Error al cargar la configuración'))
      .finally(() => setLoading(false));
  }, []);

  const total = Object.values(weights).reduce((sum, v) => sum + (v || 0), 0);

  const handleSave = async () => {
    if (total !== 100) {
      message.error('Los porcentajes deben sumar 100');
      return;
    }
    setSaving(true);
    try {
      await setGradeWeights(EVALUATION_TYPES.map((type) => ({ type, weightPercent: weights[type] || 0 })));
      message.success('Ponderación guardada');
    } catch (error: any) {
      message.error(error.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout
      roleTitle="Admin / Control Escolar"
      userName="Administrador"
      userRole="Administrador"
      menuGroups={menuGroups}
      breadcrumbs={['Admin', 'Configuración', 'Ponderación de notas']}
    >
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Ponderación de calificaciones</h1>
        <p className="text-sm text-gray-500 mt-1">
          Define qué porcentaje aporta cada tipo de evaluación al promedio de la boleta. Si no configuras nada,
          se usa un promedio simple entre los tipos con notas.
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 max-w-lg">
        {loading ? (
          <div className="py-12 text-center text-gray-400">Cargando...</div>
        ) : (
          <div className="space-y-4">
            {EVALUATION_TYPES.map((type) => (
              <div key={type} className="flex items-center justify-between gap-4">
                <label className="text-sm font-medium text-gray-700">{type}</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={weights[type] ?? 0}
                    onChange={(e) => setWeights({ ...weights, [type]: Number(e.target.value) })}
                    className="w-24 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-500">%</span>
                </div>
              </div>
            ))}

            <div className={`flex items-center justify-between pt-4 border-t border-gray-100 ${total !== 100 ? 'text-red-600' : 'text-gray-900'}`}>
              <span className="text-sm font-semibold">Total</span>
              <span className="text-sm font-bold">{total}%</span>
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full mt-2 px-4 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              {saving ? 'Guardando...' : 'Guardar ponderación'}
            </button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
