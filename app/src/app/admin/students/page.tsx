'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { getStudents, createStudent, updateStudent } from '@/actions/students';
import { getSectionsForTenant } from '@/actions/adminClasses';
import { App } from 'antd';
import { getMenuGroupsForRoles } from '@/lib/nav/menu';

// Match the updated admin menu groups
const menuGroups = getMenuGroupsForRoles(['admin']);

type Student = {
  id: string;
  studentCode: string;
  fullName: string;
  status: string;
  gradeLevelName?: string;
  sectionName?: string;
  attendancePct: number | null;
};

type Section = { id: string; name: string; gradeLevelName: string; gradeLevelId: string };

export default function StudentsPage() {
  const { message } = App.useApp();
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const [search, setSearch] = useState('');
  const [filterGrade, setFilterGrade] = useState('');
  const [filterSection, setFilterSection] = useState('');
  const [filterStatus, setFilterStatus] = useState('active');

  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    studentCode: '',
    dob: '',
    email: '',
    phone: '',
  });

  const [sections, setSections] = useState<Section[]>([]);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Edit state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    studentCode: '',
    dob: '',
    email: '',
    phone: '',
    status: 'active' as 'active' | 'inactive'
  });

  const loadData = async (currentPage = page, currentSearch = search) => {
    setLoading(true);
    try {
      const res = await getStudents(
        'school-demo', 
        currentSearch, 
        filterGrade || undefined, 
        filterSection || undefined, 
        currentPage, 
        pageSize
      );
      setStudents(res.students);
      setTotal(res.total);
      setPage(res.page);
    } catch (error: any) {
      message.error(error.message || 'Error al cargar estudiantes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getSectionsForTenant('school-demo').then(setSections).catch(console.error);
  }, []);

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      loadData(1, search);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [search, filterGrade, filterSection, filterStatus]); // Re-fetch when filters change (debounced for search)

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > Math.ceil(total / pageSize)) return;
    loadData(newPage, search);
  };

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName || !formData.lastName) {
      message.error('Nombre y Apellido son requeridos');
      return;
    }
    try {
      const dbDate = formData.dob ? new Date(formData.dob) : undefined;
      const res = await createStudent({
        ...formData,
        dob: dbDate
      }, 'school-demo');
      
      if (res.error) {
        message.error(res.error);
      } else {
        message.success('Estudiante registrado con éxito');
        setModalOpen(false);
        setFormData({ firstName: '', lastName: '', studentCode: '', dob: '', email: '', phone: '' });
        loadData(1, search);
      }
    } catch (error: any) {
      message.error(error.message || 'Error al guardar estudiante');
    }
  };

  const openEditModal = async (student: Student) => {
    // Fetch full student data for editing
    try {
      const { getStudentById } = await import('@/actions/students');
      const fullData = await getStudentById(student.id);
      if (!fullData) {
        message.error('No se pudo cargar el estudiante');
        return;
      }
      setEditingStudent(student);
      setEditForm({
        firstName: fullData.firstName || '',
        lastName: fullData.lastName || '',
        studentCode: fullData.studentCode || '',
        dob: fullData.dob ? new Date(fullData.dob).toISOString().split('T')[0] : '',
        email: fullData.email || '',
        phone: fullData.phone || '',
        status: (fullData.status as 'active' | 'inactive') || 'active'
      });
      setEditModalOpen(true);
    } catch (error: any) {
      message.error(error.message || 'Error al cargar estudiante');
    }
  };

  const handleUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    if (!editForm.firstName || !editForm.lastName) {
      message.error('Nombre y Apellido son requeridos');
      return;
    }
    try {
      const res = await updateStudent(editingStudent.id, {
        firstName: editForm.firstName,
        lastName: editForm.lastName,
        studentCode: editForm.studentCode || undefined,
        dob: editForm.dob ? new Date(editForm.dob) : null,
        email: editForm.email || undefined,
        phone: editForm.phone || undefined,
        status: editForm.status
      }, 'school-demo');

      if ('error' in res) {
        message.error(res.error);
      } else {
        message.success('Estudiante actualizado con éxito');
        setEditModalOpen(false);
        setEditingStudent(null);
        loadData(page, search);
      }
    } catch (error: any) {
      message.error(error.message || 'Error al actualizar estudiante');
    }
  };

  // Unique grades for filter
  const uniqueGrades = Array.from(new Map(sections.map(s => [s.gradeLevelId, s.gradeLevelName])).entries()).map(([id, name]) => ({ id, name }));

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <DashboardLayout
      roleTitle="Admin / Control Escolar"
      userName="Administrador"
      userRole="Administrador"
      menuGroups={menuGroups}
      breadcrumbs={['Admin', 'Estudiantes']}
    >
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-900">Estudiantes</h1>
          <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-bold">
            {total} Total
          </span>
        </div>
        <button 
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors shadow-lg"
        >
          <span className="material-symbols-outlined text-lg">add</span>
          Nuevo Alumno
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[200px] relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">search</span>
          <input 
            type="text" 
            placeholder="Buscar por nombre o matrícula..."
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        
        <select 
          className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900 w-40"
          value={filterGrade}
          onChange={e => setFilterGrade(e.target.value)}
        >
          <option value="">Todos los Grados</option>
          {uniqueGrades.map(g => (
            <option key={g.id} value={g.id}>{g.name}</option>
          ))}
        </select>
        
        <select 
          className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900 w-44"
          value={filterSection}
          onChange={e => setFilterSection(e.target.value)}
        >
          <option value="">Todas las Secciones</option>
          {sections.filter(s => !filterGrade || s.gradeLevelId === filterGrade).map(s => (
            <option key={s.id} value={s.id}>{s.gradeLevelName} {s.name}</option>
          ))}
        </select>

        <select 
          className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900 w-36"
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
        >
          <option value="active">Activos</option>
          <option value="inactive">Inactivos</option>
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6">
        {loading ? (
          <div className="p-12 text-center text-gray-500">Cargando...</div>
        ) : students.length === 0 ? (
          <div className="p-12 text-center text-gray-500">No se encontraron estudiantes que coincidan con los filtros.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-gray-50/50 text-gray-600 font-medium border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4">Matrícula</th>
                  <th className="px-6 py-4">Nombre</th>
                  <th className="px-6 py-4">Grado/Sección</th>
                  <th className="px-6 py-4">Asistencia (mes)</th>
                  <th className="px-6 py-4">Estado</th>
                  <th className="px-6 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-800">
                {students.map(s => (
                  <tr key={s.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 font-mono text-gray-600">{s.studentCode}</td>
                    <td className="px-6 py-4 font-medium">{s.fullName}</td>
                    <td className="px-6 py-4">
                      {s.gradeLevelName && s.sectionName ? (
                        `${s.gradeLevelName} ${s.sectionName}`
                      ) : (
                        <span className="text-gray-400 italic">Sin inscripción</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {s.attendancePct !== null ? (
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${
                            s.attendancePct >= 90 ? 'bg-green-500' :
                            s.attendancePct >= 75 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}></span>
                          <span className="font-medium text-gray-700">{s.attendancePct}%</span>
                        </div>
                      ) : (
                        <span className="text-gray-400">N/A</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {s.status === 'active' ? (
                        <span className="px-2.5 py-1 bg-green-100 text-green-800 rounded-lg text-xs font-semibold">Activo</span>
                      ) : (
                        <span className="px-2.5 py-1 bg-gray-100 text-gray-600 rounded-lg text-xs font-semibold">Inactivo</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => router.push(`/admin/students/${s.id}`)} className="text-gray-400 hover:text-blue-600 p-2 rounded-lg hover:bg-blue-50 transition-colors" title="Ver Expediente">
                          <span className="material-symbols-outlined text-xl">visibility</span>
                        </button>
                        <button onClick={() => openEditModal(s)} className="text-gray-400 hover:text-gray-900 p-2 rounded-lg hover:bg-gray-100 transition-colors" title="Editar">
                          <span className="material-symbols-outlined text-xl">edit</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!loading && total > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Mostrando <span className="font-medium text-gray-900">{(page - 1) * pageSize + 1}</span> a <span className="font-medium text-gray-900">{Math.min(page * pageSize, total)}</span> de <span className="font-medium text-gray-900">{total}</span> estudiantes
          </p>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => handlePageChange(page - 1)}
              disabled={page === 1}
              className="px-4 py-2 border border-gray-200 bg-white rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Anterior
            </button>
            <span className="text-sm font-medium text-gray-600 min-w-[5rem] text-center">
              Pág {page} de {totalPages}
            </span>
            <button 
              onClick={() => handlePageChange(page + 1)}
              disabled={page >= totalPages}
              className="px-4 py-2 border border-gray-200 bg-white rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-lg font-bold text-gray-900">Nuevo Alumno</h3>
              <button 
                onClick={() => setModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="overflow-y-auto p-6 flex-1">
              <form id="student-form" onSubmit={handleSaveStudent}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre(s) <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="text" 
                      value={formData.firstName}
                      onChange={e => setFormData({...formData, firstName: e.target.value})}
                      required
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:bg-white transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Apellidos <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="text" 
                      value={formData.lastName}
                      onChange={e => setFormData({...formData, lastName: e.target.value})}
                      required
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:bg-white transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Matrícula <span className="text-gray-400 font-normal">(Auto-generada)</span>
                    </label>
                    <input 
                      type="text" 
                      value={formData.studentCode}
                      onChange={e => setFormData({...formData, studentCode: e.target.value})}
                      placeholder="Dejar vacío para generar"
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:bg-white transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fecha de Nacimiento
                    </label>
                    <input 
                      type="date" 
                      value={formData.dob}
                      onChange={e => setFormData({...formData, dob: e.target.value})}
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:bg-white transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Correo Electrónico
                    </label>
                    <input 
                      type="email" 
                      value={formData.email}
                      onChange={e => setFormData({...formData, email: e.target.value})}
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:bg-white transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Teléfono
                    </label>
                    <input 
                      type="tel" 
                      value={formData.phone}
                      onChange={e => setFormData({...formData, phone: e.target.value})}
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:bg-white transition-all"
                    />
                  </div>
                </div>
              </form>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/50">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="student-form"
                className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors shadow-lg shadow-gray-900/20"
              >
                Guardar Alumno
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editModalOpen && editingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-lg font-bold text-gray-900">Editar Alumno</h3>
              <button
                onClick={() => { setEditModalOpen(false); setEditingStudent(null); }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="overflow-y-auto p-6 flex-1">
              <form id="edit-student-form" onSubmit={handleUpdateStudent}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre(s) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={editForm.firstName}
                      onChange={e => setEditForm({...editForm, firstName: e.target.value})}
                      required
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:bg-white transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Apellidos <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={editForm.lastName}
                      onChange={e => setEditForm({...editForm, lastName: e.target.value})}
                      required
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:bg-white transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Matrícula
                    </label>
                    <input
                      type="text"
                      value={editForm.studentCode}
                      onChange={e => setEditForm({...editForm, studentCode: e.target.value})}
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:bg-white transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fecha de Nacimiento
                    </label>
                    <input
                      type="date"
                      value={editForm.dob}
                      onChange={e => setEditForm({...editForm, dob: e.target.value})}
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:bg-white transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Correo Electrónico
                    </label>
                    <input
                      type="email"
                      value={editForm.email}
                      onChange={e => setEditForm({...editForm, email: e.target.value})}
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:bg-white transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Teléfono
                    </label>
                    <input
                      type="tel"
                      value={editForm.phone}
                      onChange={e => setEditForm({...editForm, phone: e.target.value})}
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:bg-white transition-all"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Estado
                    </label>
                    <select
                      value={editForm.status}
                      onChange={e => setEditForm({...editForm, status: e.target.value as 'active' | 'inactive'})}
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:bg-white transition-all"
                    >
                      <option value="active">Activo</option>
                      <option value="inactive">Inactivo</option>
                    </select>
                  </div>
                </div>
              </form>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/50">
              <button
                type="button"
                onClick={() => { setEditModalOpen(false); setEditingStudent(null); }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="edit-student-form"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-lg"
              >
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
