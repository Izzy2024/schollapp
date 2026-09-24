'use client';

import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { App } from 'antd';
import { getMenuGroupsForRoles } from '@/lib/nav/menu';
import { getSectionSubjects } from '@/actions/adminClasses';
import {
  getAllClassSchedules,
  previewDirectScheduleConflict,
  createClassScheduleDirect,
  updateClassScheduleDirect,
  deleteClassScheduleDirect,
} from '@/actions/scheduleRequests';

const menuGroups = getMenuGroupsForRoles(['admin']);

type ScheduleEntry = {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  room: string | null;
  sectionSubjectId: string;
  subjectName: string;
  sectionName: string;
  teacherName: string;
};

type ClassOption = {
  id: string;
  subjectName: string;
  gradeLevelName: string;
  sectionName: string;
  staffId: string | null;
  staffName: string | null;
};

const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const DAYS_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

const emptyForm = { sectionSubjectId: '', dayOfWeek: 1, startTime: '08:00', endTime: '09:00', room: '' };

export default function AdminSchedulePage() {
  const { message } = App.useApp();
  const [schedules, setSchedules] = useState<ScheduleEntry[]>([]);
  const [classOptions, setClassOptions] = useState<ClassOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [conflictError, setConflictError] = useState<string | null>(null);
  const [checkingConflict, setCheckingConflict] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<ScheduleEntry | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [scheds, classes] = await Promise.all([getAllClassSchedules(), getSectionSubjects()]);
      setSchedules(scheds);
      setClassOptions(classes);
    } catch (e: any) {
      message.error(e.message || 'Error cargando horarios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openCreateModal = () => {
    setEditingId(null);
    setForm(emptyForm);
    setConflictError(null);
    setModalOpen(true);
  };

  const openEditModal = (s: ScheduleEntry) => {
    setEditingId(s.id);
    setForm({ sectionSubjectId: s.sectionSubjectId, dayOfWeek: s.dayOfWeek, startTime: s.startTime, endTime: s.endTime, room: s.room || '' });
    setConflictError(null);
    setModalOpen(true);
  };

  const checkConflict = async (next: typeof form) => {
    if (!next.sectionSubjectId || !next.startTime || !next.endTime) return;
    setCheckingConflict(true);
    try {
      const result = await previewDirectScheduleConflict(
        next.sectionSubjectId,
        next.dayOfWeek,
        next.startTime,
        next.endTime,
        next.room.trim() || null,
        editingId || undefined
      );
      setConflictError(result.ok ? null : result.error || 'Choque detectado');
    } catch (e: any) {
      setConflictError(e.message || 'Error al validar horario');
    } finally {
      setCheckingConflict(false);
    }
  };

  const updateForm = (patch: Partial<typeof form>) => {
    const next = { ...form, ...patch };
    setForm(next);
    checkConflict(next);
  };

  const handleSave = async () => {
    if (!form.sectionSubjectId) return message.error('Selecciona una clase');
    setSaving(true);
    try {
      const res = editingId
        ? await updateClassScheduleDirect(editingId, form.dayOfWeek, form.startTime, form.endTime, form.room.trim() || null)
        : await createClassScheduleDirect(form.sectionSubjectId, form.dayOfWeek, form.startTime, form.endTime, form.room.trim() || null);

      if (!res.success) {
        message.error(res.error || 'Error al guardar');
      } else {
        message.success(editingId ? 'Horario actualizado' : 'Horario creado');
        setModalOpen(false);
        loadData();
      }
    } catch (e: any) {
      message.error(e.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await deleteClassScheduleDirect(deleteTarget.id);
      if (!res.success) message.error(res.error || 'Error al eliminar');
      else {
        message.success('Horario eliminado');
        setDeleteTarget(null);
        loadData();
      }
    } catch (e: any) {
      message.error(e.message || 'Error al eliminar');
    } finally {
      setDeleting(false);
    }
  };

  const classesWithTeacher = classOptions.filter((c) => c.staffId);

  const filtered = selectedDay !== null ? schedules.filter(s => s.dayOfWeek === selectedDay) : schedules;
  const grouped = filtered.reduce((acc, s) => {
    const day = DAYS[s.dayOfWeek] || 'Sin día';
    if (!acc[day]) acc[day] = [];
    acc[day].push(s);
    return acc;
  }, {} as Record<string, ScheduleEntry[]>);

  Object.values(grouped).forEach(entries => entries.sort((a, b) => a.startTime.localeCompare(b.startTime)));

  return (
    <DashboardLayout roleTitle="Admin" userName="Administrador" userRole="Administrador" menuGroups={menuGroups} breadcrumbs={['Admin', 'Horarios']}>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-900">Horarios</h1>
          <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-bold">{schedules.length} clases</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={openCreateModal} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-lg">
            <span className="material-symbols-outlined text-lg">add</span>
            Nuevo Horario
          </button>
          <a href="/admin/schedule-requests" className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-bold rounded-xl hover:bg-gray-800 transition-colors shadow-lg">
            <span className="material-symbols-outlined text-lg">swap_horiz</span>
            Solicitudes de Horario
          </a>
        </div>
      </div>

      {/* Day filter */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto">
        <button onClick={() => setSelectedDay(null)} className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors whitespace-nowrap ${selectedDay === null ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>Todos</button>
        {[1,2,3,4,5].map(d => (
          <button key={d} onClick={() => setSelectedDay(selectedDay === d ? null : d)} className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors whitespace-nowrap ${selectedDay === d ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>{DAYS_SHORT[d]}</button>
        ))}
      </div>

      {loading ? (
        <div className="py-16 text-center text-gray-400">
          <span className="material-symbols-outlined text-4xl text-gray-200 block mb-3 animate-spin">progress_activity</span>
          Cargando horarios...
        </div>
      ) : schedules.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-2xl border border-dashed border-gray-200">
          <span className="material-symbols-outlined text-5xl text-gray-200 mb-4 block">calendar_month</span>
          <p className="text-gray-500 mb-2">No hay horarios configurados.</p>
          <p className="text-sm text-gray-400">Crea uno con &quot;Nuevo Horario&quot; o espera a que un docente lo solicite.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).sort(([a], [b]) => {
            const ai = DAYS.indexOf(a); const bi = DAYS.indexOf(b); return ai - bi;
          }).map(([day, entries]) => (
            <div key={day}>
              <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">{day}</h2>
              <div className="space-y-2">
                {entries.map(s => (
                  <div key={s.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-4 hover:border-gray-300 transition-all">
                    <div className="w-14 text-center">
                      <div className="text-sm font-bold text-gray-900">{s.startTime}</div>
                      <div className="text-xs text-gray-400">{s.endTime}</div>
                    </div>
                    <div className="w-px h-10 bg-gray-200" />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900">{s.subjectName}</div>
                      <div className="text-sm text-gray-500">{s.sectionName} • {s.teacherName}</div>
                    </div>
                    {s.room && <span className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-lg">{s.room}</span>}
                    <button onClick={() => openEditModal(s)} className="text-gray-400 hover:text-indigo-600 transition-colors" title="Editar">
                      <span className="material-symbols-outlined text-xl">edit</span>
                    </button>
                    <button onClick={() => setDeleteTarget(s)} className="text-gray-400 hover:text-red-600 transition-colors" title="Eliminar">
                      <span className="material-symbols-outlined text-xl">delete</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-lg font-bold text-gray-900">{editingId ? 'Editar Horario' : 'Nuevo Horario'}</h3>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-6 space-y-4">
              {!editingId && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Clase</label>
                  <select
                    value={form.sectionSubjectId}
                    onChange={(e) => updateForm({ sectionSubjectId: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">-- Seleccionar --</option>
                    {classesWithTeacher.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.subjectName} — {c.gradeLevelName} {c.sectionName} ({c.staffName})
                      </option>
                    ))}
                  </select>
                  {classesWithTeacher.length === 0 && (
                    <p className="text-xs text-amber-600 mt-1">No hay clases con docente asignado. Asigna un docente primero en Clases.</p>
                  )}
                </div>
              )}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Día</label>
                  <select
                    value={form.dayOfWeek}
                    onChange={(e) => updateForm({ dayOfWeek: Number(e.target.value) })}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {[1, 2, 3, 4, 5, 6].map((d) => (
                      <option key={d} value={d}>{DAYS[d]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Inicio</label>
                  <input
                    type="time"
                    value={form.startTime}
                    onChange={(e) => updateForm({ startTime: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fin</label>
                  <input
                    type="time"
                    value={form.endTime}
                    onChange={(e) => updateForm({ endTime: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Aula (opcional)</label>
                <input
                  type="text"
                  value={form.room}
                  onChange={(e) => updateForm({ room: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              {checkingConflict && <p className="text-xs text-gray-400">Verificando disponibilidad…</p>}
              {conflictError && (
                <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{conflictError}</div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/50">
              <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !!conflictError || (!editingId && !form.sectionSubjectId)}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
            <div className="p-6 space-y-3">
              <h3 className="text-lg font-bold text-gray-900">¿Eliminar horario?</h3>
              <p className="text-sm text-gray-600">
                {deleteTarget.subjectName} — {deleteTarget.sectionName}, {DAYS[deleteTarget.dayOfWeek]} {deleteTarget.startTime}-{deleteTarget.endTime}
              </p>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/50">
              <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {deleting ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
