'use client';

import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { getSubjects, createSubject, updateSubject, deleteSubject } from '@/actions/subjects';
import { message } from 'antd';
import { getMenuGroupsForRoles } from '@/lib/nav/menu';

const menuGroups = getMenuGroupsForRoles(['admin']);

type Subject = {
  id: string;
  name: string;
  code: string | null;
  classCount: number;
};

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const loadSubjects = async () => {
    setLoading(true);
    try {
      const data = await getSubjects('school-demo');
      setSubjects(data);
    } catch (error: any) {
      message.error(error.message || 'Error al cargar materias');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubjects();
  }, []);

  const openCreate = () => {
    setEditingSubject(null);
    setFormName('');
    setFormCode('');
    setModalOpen(true);
  };

  const openEdit = (subject: Subject) => {
    setEditingSubject(subject);
    setFormName(subject.name);
    setFormCode(subject.code || '');
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingSubject(null);
    setFormName('');
    setFormCode('');
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      message.error('Nombre requerido');
      return;
    }

    try {
      if (editingSubject) {
        await updateSubject(
          editingSubject.id,
          formName.trim(),
          formCode.trim() ? formCode.trim() : null,
        );
        message.success('Materia actualizada');
      } else {
        await createSubject(formName.trim(), formCode.trim() ? formCode.trim() : null);
        message.success('Materia creada');
      }

      closeModal();
      await loadSubjects();
    } catch (error: any) {
      message.error(error.message || 'Error al guardar materia');
    }
  };

  const handleDelete = async (subjectId: string) => {
    try {
      await deleteSubject(subjectId);
      message.success('Materia eliminada');
      setDeleteConfirmId(null);
      await loadSubjects();
    } catch (error: any) {
      message.error(error.message || 'Error al eliminar materia');
    }
  };

  return (
    <DashboardLayout
      roleTitle="Admin"
      userName="Administrador"
      userRole="Administrador"
      menuGroups={menuGroups}
      breadcrumbs={['Admin', 'Materias']}
      headerAction={
        <button
          onClick={openCreate}
          className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          + Nueva Materia
        </button>
      }
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Materias</h1>
          <p className="text-sm text-gray-500 mt-1">Gestiona el catálogo de materias del ciclo escolar.</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6">
            {loading ? (
              <div className="text-sm text-gray-500">Cargando...</div>
            ) : subjects.length === 0 ? (
              <div className="text-sm text-gray-500">No hay materias registradas.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b border-gray-100">
                      <th className="py-2 pr-4">Nombre</th>
                      <th className="py-2 pr-4">Código</th>
                      <th className="py-2 pr-4">Clases</th>
                      <th className="py-2">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subjects.map((s) => (
                      <tr key={s.id} className="border-b border-gray-50 last:border-none">
                        <td className="py-3 pr-4 font-medium text-gray-900">{s.name}</td>
                        <td className="py-3 pr-4 text-gray-600">{s.code || '—'}</td>
                        <td className="py-3 pr-4 text-gray-600">{s.classCount}</td>
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => openEdit(s)}
                              className="px-3 py-1.5 text-xs font-semibold bg-gray-50 text-gray-700 rounded-lg border border-gray-200 hover:bg-gray-100"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(s.id)}
                              className="px-3 py-1.5 text-xs font-semibold bg-red-50 text-red-700 rounded-lg border border-red-100 hover:bg-red-100"
                            >
                              Eliminar
                            </button>
                          </div>
                          {deleteConfirmId === s.id && (
                            <div className="mt-2 text-xs text-gray-600 flex items-center gap-2">
                              <span>¿Confirmar?</span>
                              <button
                                onClick={() => handleDelete(s.id)}
                                className="px-2 py-1 bg-red-600 text-white rounded-md"
                              >
                                Sí
                              </button>
                              <button
                                onClick={() => setDeleteConfirmId(null)}
                                className="px-2 py-1 bg-gray-100 text-gray-700 rounded-md"
                              >
                                No
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {modalOpen && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 w-full max-w-md overflow-hidden">
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-lg font-bold text-gray-900">
                  {editingSubject ? 'Editar Materia' : 'Nueva Materia'}
                </h2>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Nombre</label>
                  <input
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Matemáticas"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Código (opcional)</label>
                  <input
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="MAT"
                  />
                </div>
              </div>
              <div className="p-6 border-t border-gray-100 flex justify-end gap-2">
                <button
                  onClick={closeModal}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 text-sm font-semibold"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 text-sm font-semibold"
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
