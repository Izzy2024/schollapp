'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { getSectionsForAttendance, getAttendanceBySectionDate } from '@/actions/attendance';
import { App } from 'antd';
import { getMenuGroupsForRoles } from '@/lib/nav/menu';

const menuGroups = getMenuGroupsForRoles(['director']);

type Section = { id: string; name: string; gradeLevelId: string; gradeLevelName: string; enrolledCount: number };
type AttRec = { studentId: string; studentName: string; studentCode: string | null; status: string | null; note: string | null };
type TakenBy = { name: string; role: string | null } | null;

const STATUS_CONFIG = {
  present:  { label: 'Presente',  short: 'P', color: 'bg-green-100 text-green-700' },
  absent:   { label: 'Falta',     short: 'F', color: 'bg-red-100   text-red-600'   },
  late:     { label: 'Retardo',   short: 'R', color: 'bg-yellow-100 text-yellow-700' },
  excused:  { label: 'Justific.', short: 'J', color: 'bg-blue-100   text-blue-600'  },
} as const;

type StatusKey = keyof typeof STATUS_CONFIG;

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function DirectorAttendancePage() {
  const { message } = App.useApp();
  const [sections, setSections] = useState<Section[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [date, setDate] = useState(todayIso());
  const [records, setRecords] = useState<AttRec[]>([]);
  const [takenBy, setTakenBy] = useState<TakenBy>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getSectionsForAttendance()
      .then((data) => {
        setSections(data);
        if (data.length > 0) setSelectedSectionId(data[0].id);
      })
      .catch((e) => message.error(e instanceof Error ? e.message : 'Error cargando secciones'));
  }, []);

  const loadRecords = useCallback(async () => {
    if (!selectedSectionId || !date) return;
    setLoading(true);
    try {
      const data = await getAttendanceBySectionDate(selectedSectionId, date);
      setTakenBy(data.takenBy);
      setRecords(data.records.map(r => ({ ...r, status: r.status ?? null })));
    } catch (e) {
      message.error(e instanceof Error ? e.message : 'Error cargando asistencia');
    } finally {
      setLoading(false);
    }
  }, [selectedSectionId, date]);

  useEffect(() => { loadRecords(); }, [loadRecords]);

  const summary = useMemo(() => {
    const counts = { present: 0, absent: 0, late: 0, excused: 0 };
    for (const r of records) {
      const k = r.status as StatusKey;
      if (k in counts) counts[k]++;
    }
    return counts;
  }, [records]);

  const selectedSection = sections.find(s => s.id === selectedSectionId);
  const totalPct = records.length > 0
    ? Math.round(((summary.present + summary.late) / records.length) * 100)
    : 0;

  const sectionsByGrade = useMemo(() => {
    const map = new Map<string, Section[]>();
    for (const s of sections) {
      const arr = map.get(s.gradeLevelName) ?? [];
      arr.push(s);
      map.set(s.gradeLevelName, arr);
    }
    return map;
  }, [sections]);

  return (
    <DashboardLayout
      roleTitle="Director"
      userName="Director"
      userRole="Director"
      menuGroups={menuGroups}
      breadcrumbs={['Director', 'Asistencia']}
    >
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Asistencia</h1>
        <p className="text-sm text-gray-500 mt-1">Vista de solo lectura — la edición de asistencia le corresponde al docente o al administrador.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Fecha</label>
            <input
              type="date"
              value={date}
              max={todayIso()}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Grupo / Sección</span>
            </div>
            <div className="overflow-y-auto max-h-[480px]">
              {Array.from(sectionsByGrade.entries()).map(([grade, secs]) => (
                <div key={grade}>
                  <div className="px-4 py-2 text-xs text-gray-400 font-bold uppercase tracking-wider bg-gray-50/30 border-b border-gray-100">{grade}</div>
                  {secs.map(s => (
                    <button
                      key={s.id}
                      onClick={() => setSelectedSectionId(s.id)}
                      className={`w-full flex items-center justify-between px-4 py-3 text-left text-sm transition-colors border-b border-gray-50 last:border-0 ${
                        selectedSectionId === s.id ? 'bg-gray-900 text-white' : 'hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      <span className="font-medium">Sección &quot;{s.name}&quot;</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                        selectedSectionId === s.id ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                      }`}>{s.enrolledCount}</span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {selectedSection && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h2 className="font-bold text-gray-900 text-lg">
                    {selectedSection.gradeLevelName} — Sección &quot;{selectedSection.name}&quot;
                  </h2>
                  <p className="text-sm text-gray-400 mt-0.5">
                    {new Date(date + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-gray-900">{totalPct}%</div>
                  <div className="text-xs text-gray-400">Asistencia</div>
                </div>
              </div>
              <p className="text-xs text-gray-500 mb-3">
                {takenBy
                  ? `Registrado por ${takenBy.name}${takenBy.role ? ` (${takenBy.role})` : ''}.`
                  : 'Aún no se ha registrado asistencia para esta fecha.'}
              </p>
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden flex">
                {records.length > 0 && (
                  <>
                    <div className="h-full bg-green-500" style={{ width: `${(summary.present / records.length) * 100}%` }} />
                    <div className="h-full bg-yellow-400" style={{ width: `${(summary.late    / records.length) * 100}%` }} />
                    <div className="h-full bg-blue-400"  style={{ width: `${(summary.excused  / records.length) * 100}%` }} />
                    <div className="h-full bg-red-400"   style={{ width: `${(summary.absent   / records.length) * 100}%` }} />
                  </>
                )}
              </div>
              <div className="flex justify-between mt-3 text-xs text-gray-500 font-medium">
                <span className="text-green-600">P: {summary.present}</span>
                <span className="text-yellow-600">R: {summary.late}</span>
                <span className="text-blue-600">J: {summary.excused}</span>
                <span className="text-red-600">F: {summary.absent}</span>
                <span className="text-gray-400">Total: {records.length}</span>
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {loading ? (
              <div className="py-16 text-center text-gray-400">Cargando alumnos...</div>
            ) : records.length === 0 ? (
              <div className="py-16 text-center text-gray-400">No hay alumnos inscritos en esta sección.</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {records.map((rec, idx) => (
                  <div key={rec.studentId} className="flex items-center justify-between px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <span className="w-6 text-center text-xs text-gray-300 font-bold">{idx + 1}</span>
                      <div>
                        <div className="font-medium text-gray-900 text-sm">{rec.studentName}</div>
                        {rec.studentCode && <div className="text-xs text-gray-400 font-mono">{rec.studentCode}</div>}
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-lg text-xs font-bold ${
                      rec.status ? STATUS_CONFIG[rec.status as StatusKey]?.color ?? 'bg-gray-100 text-gray-500' : 'bg-gray-100 text-gray-400'
                    }`}>
                      {rec.status ? STATUS_CONFIG[rec.status as StatusKey]?.label ?? rec.status : 'Sin registrar'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
