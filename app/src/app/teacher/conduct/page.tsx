'use client';

import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { getTeacherClassesOptions } from '@/actions/teacher';
import { getTeacherStudentsData } from '@/actions/teacherStudents';
import { getStudentConductRecords, createConductRecord, type ConductRecordRow } from '@/actions/conduct';
import { App } from 'antd';
import { getMenuGroupsForRoles } from '@/lib/nav/menu';

const menuGroups = getMenuGroupsForRoles(['teacher']);

type StudentOption = { id: string; firstName: string; lastName: string };

export default function TeacherConductPage() {
  const { message } = App.useApp();
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<StudentOption | null>(null);
  const [records, setRecords] = useState<ConductRecordRow[]>([]);
  const [totalPoints, setTotalPoints] = useState(0);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [form, setForm] = useState({ type: 'demerit' as 'merit' | 'demerit' | 'incident', category: '', description: '', points: '-1' });

  useEffect(() => {
    getTeacherClassesOptions().then((data) => setClasses(data.classes));
  }, []);

  useEffect(() => {
    if (!selectedClassId) {
      setStudents([]);
      return;
    }
    getTeacherStudentsData(selectedClassId).then((data) => setStudents(data));
  }, [selectedClassId]);

  const openStudent = async (student: StudentOption) => {
    setSelectedStudent(student);
    setRecordsLoading(true);
    try {
      const data = await getStudentConductRecords(student.id);
      setRecords(data.records);
      setTotalPoints(data.totalPoints);
    } catch (e: any) {
      message.error(e.message || 'Error al cargar conducta');
    } finally {
      setRecordsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;
    if (!form.description.trim()) {
      message.error('La descripción es requerida');
      return;
    }
    try {
      const res = await createConductRecord(selectedStudent.id, {
        type: form.type,
        category: form.category || undefined,
        description: form.description,
        points: Number(form.points) || 0,
      });
      if ('error' in res) {
        message.error(res.error);
      } else {
        message.success('Registro guardado');
        setForm({ type: 'demerit', category: '', description: '', points: '-1' });
        openStudent(selectedStudent);
      }
    } catch (e: any) {
      message.error(e.message || 'Error al guardar');
    }
  };

  return (
    <DashboardLayout roleTitle="Docente" userName="Docente" userRole="Profesor" menuGroups={menuGroups} breadcrumbs={['Docente', 'Conducta']}>
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Conducta y disciplina</h1>

      <div className="mb-6 max-w-md">
        <label className="block text-sm font-medium text-gray-700 mb-1">Clase</label>
        <select
          value={selectedClassId}
          onChange={(e) => {
            setSelectedClassId(e.target.value);
            setSelectedStudent(null);
          }}
          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Selecciona una clase...</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {selectedClassId && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden md:col-span-1">
            <div className="px-4 py-3 border-b border-gray-100 font-semibold text-sm text-gray-700">Alumnos</div>
            <div className="divide-y divide-gray-50 max-h-[500px] overflow-y-auto">
              {students.map((s) => (
                <button
                  key={s.id}
                  onClick={() => openStudent(s)}
                  className={`w-full text-left px-4 py-3 text-sm hover:bg-gray-50 transition-colors ${selectedStudent?.id === s.id ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-700'}`}
                >
                  {s.lastName}, {s.firstName}
                </button>
              ))}
            </div>
          </div>

          <div className="md:col-span-2">
            {!selectedStudent ? (
              <div className="bg-white rounded-xl border border-dashed border-gray-200 p-10 text-center text-gray-400">
                Selecciona un alumno para ver o registrar conducta.
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                  <h3 className="font-bold text-gray-900 mb-3">Registrar para {selectedStudent.firstName} {selectedStudent.lastName}</h3>
                  <form onSubmit={handleSubmit} className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <select
                        value={form.type}
                        onChange={(e) => setForm({ ...form, type: e.target.value as typeof form.type })}
                        className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                      >
                        <option value="demerit">Demérito</option>
                        <option value="merit">Mérito</option>
                        <option value="incident">Incidente</option>
                      </select>
                      <input
                        type="number"
                        value={form.points}
                        onChange={(e) => setForm({ ...form, points: e.target.value })}
                        placeholder="Puntos"
                        className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                      />
                    </div>
                    <input
                      type="text"
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                      placeholder="Categoría (opcional)"
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                    />
                    <textarea
                      required
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      placeholder="Descripción"
                      rows={2}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                    />
                    <button type="submit" className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800">
                      Guardar
                    </button>
                  </form>
                </div>

                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-gray-900">Historial</h3>
                    <span className={`text-sm font-semibold ${totalPoints < 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {totalPoints > 0 ? '+' : ''}{totalPoints} pts
                    </span>
                  </div>
                  {recordsLoading ? (
                    <div className="py-6 text-center text-gray-400">Cargando...</div>
                  ) : records.length === 0 ? (
                    <div className="py-6 text-center text-gray-400">Sin registros.</div>
                  ) : (
                    <div className="space-y-2">
                      {records.map((r) => (
                        <div key={r.id} className="text-sm border-b border-gray-50 pb-2 last:border-0">
                          <span
                            className={`px-1.5 py-0.5 rounded text-xs font-semibold mr-2 ${
                              r.type === 'merit' ? 'bg-green-100 text-green-800' : r.type === 'demerit' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {r.points > 0 ? '+' : ''}{r.points}
                          </span>
                          {r.description}
                          <span className="text-xs text-gray-400 ml-2">
                            {new Date(r.occurredAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
