'use client';

import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { getSubjects, createSubject, updateSubject, deleteSubject } from '@/actions/subjects';
import { message } from 'antd';

// Static menu groups for the subjects page (match the updated admin ones)
const menuGroups = [
  {
    title: 'Menú Principal',
    items: [
      { key: '1', icon: 'home', label: 'Vista General', href: '/admin' },
      { key: 'subjects', icon: 'menu_book', label: 'Materias', href: '/admin/subjects' },
      { key: 'classes', icon: 'class', label: 'Gestión de Clases', href: '/admin/classes' },
      { key: 'class-requests', icon: 'pending_actions', label: 'Solicitudes de Clase', href: '/admin/class-requests' },
      { key: 'students', icon: 'people', label: 'Estudiantes', href: '/admin/students' },
      { key: 'enrollment', icon: 'how_to_reg', label: 'Inscripciones', href: '/admin/enrollment' },
      { key: '2', icon: 'assignment', label: 'Preparación de Clase', href: '/admin/class-prep' },
      { key: '3', icon: 'schedule', label: 'Asistencia', href: '/admin/attendance' },
      { key: '4', icon: 'edit_note', label: 'Exámenes', href: '/admin/exams' },
      { key: '5', icon: 'bookmark', label: 'Gestión de Tareas', href: '/admin/assignments' },
      { key: '6', icon: 'access_time', label: 'Horarios', href: '/admin/schedule' },
      { key: '8', icon: 'mail', label: 'Mensajes', href: '/admin/messages' },
      { key: '9', icon: 'donut_large', label: 'Analítica', href: '/admin/analytics' },
      { key: '10', icon: 'article', label: 'Reportes', href: '/admin/reports' },
    ],
  },
  {
    title: 'Configuración',
    items: [
      { key: '11', icon: 'campaign', label: 'Noticias', href: '/admin/news' },
      { key: '12', icon: 'local_activity', label: 'Actividades', href: '/admin/activities' },
      { key: '13', icon: 'settings', label: 'Configuración', href: '/admin/settings' },
    ],
  },
];

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

  const openNewModal = () => {
    setEditingSubject(null);
    setFormName('');
    setFormCode('');
    setModalOpen(true);
  };

  const openEditModal = (subject: Subject) => {
    setEditingSubject(subject);
    setFormName(subject.name);
    setFormCode(subject.code || '');
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      message.error('El nombre es requerido');
      return;
    }
    
    try {
      if (editingSubject) {
        const res = await updateSubject(editingSubject.id, formName.trim(), formCode.trim() || null, 'school-demo');
        if (res.error) {
          message.error(res.error);
        } else {
          message.success('Materia actualizada con éxito');
          setModalOpen(false);
          loadSubjects();
        }
      } else {
        const res = await createSubject(formName.trim(), formCode.trim() || null, 'school-demo');
        if (res.error) {
          message.error(res.error);
        } else {
          message.success('Materia creada con éxito');
          setModalOpen(false);
          loadSubjects();
        }
      }
    } catch (error: any) {
      message.error(error.message || 'Error al guardar materia');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await deleteSubject(id, 'school-demo');
      if (res.error) {
        message.error(res.error);
      } else {
        message.success('Materia eliminada con éxito');
        loadSubjects();
      }
    } catch (error: any) {
      message.error(error.message || 'Error al eliminar materia');
    } finally {
      setDeleteConfirmId(null);
    }
  };

  return (
    <DashboardLayout
      roleTitle="Admin / Control Escolar"
      userName="Administrador"
      userRole="Administrador"
      menuGroups={menuGroups}
      breadcrumbs={['Admin', 'Materias']}
    >
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Materias</h1>
        <button 
          onClick={openNewModal}
          className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors shadow-lg"
        >
          <span className="material-symbols-outlined text-lg">add</span>
          Nueva Materia
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Cargando...</div>
        ) : subjects.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No hay materias creadas.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4">Código</th>
                  <th className="px-6 py-4">Nombre</th>
                  <th className="px-6 py-4"># Clases</th>
                  <th className="px-6 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-800">
                {subjects.map(subject => (
                  <tr key={subject.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-md font-mono text-xs">
                        {subject.code || '—'}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium">{subject.name}</td>
                    <td className="px-6 py-4">{subject.classCount}</td>
                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                      <button
                        onClick={() => openEditModal(subject)}
                        className="text-blue-600 hover:text-blue-800 p-2 rounded-lg hover:bg-blue-50 transition-colors"
                        title="Editar"
                      >
                        <span className="material-symbols-outlined text-xl">edit</span>
                      </button>
                      
                      {deleteConfirmId === subject.id ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-red-600 font-medium">¿Seguro?</span>
                          <button
                            onClick={() => handleDelete(subject.id)}
                            className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                          >
                            Sí
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            if (subject.classCount > 0) return;
                            setDeleteConfirmId(subject.id);
                          }}
                          disabled={subject.classCount > 0}
                          className={`p-2 rounded-lg transition-colors ${
                            subject.classCount > 0 
                              ? 'text-gray-300 cursor-not-allowed' 
                              : 'text-red-600 hover:text-red-800 hover:bg-red-50'
                          }`}
                          title={subject.classCount > 0 ? 'No se puede eliminar porque tiene clases asignadas' : 'Eliminar'}
                        >
                          <span className="material-symbols-outlined text-xl">delete</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900">
                {editingSubject ? 'Editar Materia' : 'Nueva Materia'}
              </h3>
              <button 
                onClick={() => setModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="text" 
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    required
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:bg-white transition-all"
                    placeholder="Ej. Matemáticas"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Código <span className="text-gray-400 font-normal">(Opcional)</span>
                  </label>
                  <input 
                    type="text" 
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:bg-white transition-all"
                    placeholder="Ej. MAT-101"
                  />
                </div>
              </div>
              <div className="mt-8 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
