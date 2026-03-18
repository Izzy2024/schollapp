'use client';

import React, { useEffect, useState, useMemo } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { 
  getSectionSubjects, 
  createSectionSubject, 
  assignTeacher, 
  removeTeacher, 
  getStaffList, 
  getSectionsForTenant 
} from '@/actions/adminClasses';
import { getSubjects } from '@/actions/subjects';
import { message } from 'antd';

// Match the updated admin menu groups
const menuGroups = [
  {
    title: 'Menú Principal',
    items: [
      { key: '1', icon: 'home', label: 'Vista General', href: '/admin' },
      { key: 'subjects', icon: 'menu_book', label: 'Materias', href: '/admin/subjects' },
      { key: 'classes', icon: 'class', label: 'Gestión de Clases', href: '/admin/classes' },
      { key: 'staff', icon: 'badge', label: 'Docentes / Staff', href: '/admin/staff' },
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

type SectionSubject = {
  id: string;
  subjectId: string;
  subjectName: string;
  gradeLevelId: string;
  gradeLevelName: string;
  sectionId: string;
  sectionName: string;
  staffId: string | null;
  staffName: string | null;
  enrolledCount: number;
};

type Staff = { id: string; fullName: string };
type Section = { id: string; name: string; gradeLevelName: string };
type Subject = { id: string; name: string };

export default function ClassesPage() {
  const [classes, setClasses] = useState<SectionSubject[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterGrade, setFilterGrade] = useState('');
  const [filterSection, setFilterSection] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [filterNoTeacher, setFilterNoTeacher] = useState(false);

  // Modals
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignTarget, setAssignTarget] = useState<SectionSubject | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState('');

  const [newClassModalOpen, setNewClassModalOpen] = useState(false);
  const [newClassForm, setNewClassForm] = useState({ sectionId: '', subjectId: '', staffId: '' });

  // Delete/Remove confirm
  const [removeConfirmId, setRemoveConfirmId] = useState<string | null>(null);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const tenant = 'school-demo';
      const [cls, stf, sec, sub] = await Promise.all([
        getSectionSubjects(tenant),
        getStaffList(tenant),
        getSectionsForTenant(tenant),
        getSubjects(tenant),
      ]);
      setClasses(cls);
      setStaffList(stf);
      setSections(sec);
      setSubjects(sub);
    } catch (error: any) {
      message.error(error.message || 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const openAssignModal = (target: SectionSubject) => {
    setAssignTarget(target);
    setSelectedStaffId(target.staffId || '');
    setAssignModalOpen(true);
  };

  const handleAssignTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignTarget) return;

    try {
      await assignTeacher(assignTarget.id, selectedStaffId, 'school-demo');
      message.success('Docente asignado con éxito');
      setAssignModalOpen(false);
      // Refresh classes
      const cls = await getSectionSubjects('school-demo');
      setClasses(cls);
    } catch (error: any) {
      message.error(error.message || 'Error al asignar docente');
    }
  };

  const handleRemoveTeacher = async (id: string) => {
    try {
      await removeTeacher(id, 'school-demo');
      message.success('Docente removido con éxito');
      const cls = await getSectionSubjects('school-demo');
      setClasses(cls);
    } catch (error: any) {
      message.error(error.message || 'Error al remover docente');
    } finally {
      setRemoveConfirmId(null);
    }
  };

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassForm.sectionId || !newClassForm.subjectId) {
      message.error('Sección y Materia son requeridos');
      return;
    }
    
    try {
      const res = await createSectionSubject(
        newClassForm.sectionId,
        newClassForm.subjectId,
        newClassForm.staffId || null,
        'school-demo'
      );
      
      if ('error' in res && res.error) {
        message.error((res as {error: string}).error);
      } else {
        message.success('Clase creada con éxito');
        setNewClassModalOpen(false);
        setNewClassForm({ sectionId: '', subjectId: '', staffId: '' });
        const cls = await getSectionSubjects('school-demo');
        setClasses(cls);
      }
    } catch (error: any) {
      message.error(error.message || 'Error al crear clase');
    }
  };

  // Derived filter options
  const uniqueGrades = useMemo(() => {
    const map = new Map();
    classes.forEach(c => map.set(c.gradeLevelId, c.gradeLevelName));
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [classes]);

  const uniqueSections = useMemo(() => {
    const map = new Map();
    classes.forEach(c => map.set(c.sectionId, c.sectionName));
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [classes]);

  const uniqueSubjects = useMemo(() => {
    const map = new Map();
    classes.forEach(c => map.set(c.subjectId, c.subjectName));
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [classes]);

  const filteredClasses = useMemo(() => {
    return classes.filter(c => {
      if (filterGrade && c.gradeLevelId !== filterGrade) return false;
      if (filterSection && c.sectionId !== filterSection) return false;
      if (filterSubject && c.subjectId !== filterSubject) return false;
      if (filterNoTeacher && c.staffId !== null) return false;
      return true;
    });
  }, [classes, filterGrade, filterSection, filterSubject, filterNoTeacher]);

  return (
    <DashboardLayout
      roleTitle="Admin / Control Escolar"
      userName="Administrador"
      userRole="Administrador"
      menuGroups={menuGroups}
      breadcrumbs={['Admin', 'Gestión de Clases']}
    >
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Gestión de Clases</h1>
        <button 
          onClick={() => setNewClassModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors shadow-lg"
        >
          <span className="material-symbols-outlined text-lg">add</span>
          Nueva Clase
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 flex flex-wrap items-center gap-4">
        <select 
          className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900"
          value={filterGrade}
          onChange={(e) => setFilterGrade(e.target.value)}
        >
          <option value="">Todos los Grados</option>
          {uniqueGrades.map(g => (
            <option key={g.id} value={g.id}>{g.name}</option>
          ))}
        </select>
        
        <select 
          className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900"
          value={filterSection}
          onChange={(e) => setFilterSection(e.target.value)}
        >
          <option value="">Todas las Secciones</option>
          {uniqueSections.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>

        <select 
          className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900"
          value={filterSubject}
          onChange={(e) => setFilterSubject(e.target.value)}
        >
          <option value="">Todas las Materias</option>
          {uniqueSubjects.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>

        <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
          <input 
            type="checkbox" 
            className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
            checked={filterNoTeacher}
            onChange={(e) => setFilterNoTeacher(e.target.checked)}
          />
          Sin docente asignado
        </label>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Cargando...</div>
        ) : filteredClasses.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No se encontraron clases.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4">Materia</th>
                  <th className="px-6 py-4">Grado</th>
                  <th className="px-6 py-4">Sección</th>
                  <th className="px-6 py-4">Docente Asignado</th>
                  <th className="px-6 py-4 text-left"># Alumnos</th>
                  <th className="px-6 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-800">
                {filteredClasses.map(c => (
                  <tr key={c.id} className={`hover:bg-gray-50 transition-colors ${!c.staffId ? 'border-l-4 border-l-yellow-400' : 'border-l-4 border-l-transparent'}`}>
                    <td className="px-6 py-4 font-medium">{c.subjectName}</td>
                    <td className="px-6 py-4">{c.gradeLevelName}</td>
                    <td className="px-6 py-4">{c.sectionName}</td>
                    <td className="px-6 py-4">
                      {c.staffId ? (
                        <span className="text-gray-900">{c.staffName}</span>
                      ) : (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-semibold">
                          — Sin Asignar —
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-left">
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-md font-mono text-xs">
                        {c.enrolledCount}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {!c.staffId ? (
                        <button
                          onClick={() => openAssignModal(c)}
                          className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors"
                        >
                          Asignar Docente
                        </button>
                      ) : (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openAssignModal(c)}
                            className="px-3 py-1.5 text-blue-600 rounded-lg text-xs font-medium border border-blue-200 hover:bg-blue-50 transition-colors"
                          >
                            Cambiar
                          </button>
                          
                          {removeConfirmId === c.id ? (
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-red-600 font-medium">¿Seguro?</span>
                              <button
                                onClick={() => handleRemoveTeacher(c.id)}
                                className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                              >
                                Sí
                              </button>
                              <button
                                onClick={() => setRemoveConfirmId(null)}
                                className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300"
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setRemoveConfirmId(c.id)}
                              className="px-3 py-1.5 text-red-600 rounded-lg text-xs font-medium hover:bg-red-50 transition-colors"
                            >
                              Quitar
                            </button>
                          )}
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

      {assignModalOpen && assignTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900">
                {assignTarget.staffId ? 'Cambiar Docente' : 'Asignar Docente'}
              </h3>
              <button 
                onClick={() => setAssignModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleAssignTeacher} className="p-6">
              <div className="mb-4 text-sm text-gray-600">
                Clase: <span className="font-semibold text-gray-900">{assignTarget.gradeLevelName} {assignTarget.sectionName} - {assignTarget.subjectName}</span>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Seleccionar Docente <span className="text-red-500">*</span>
                  </label>
                  <select 
                    value={selectedStaffId}
                    onChange={(e) => setSelectedStaffId(e.target.value)}
                    required
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:bg-white transition-all"
                  >
                    <option value="" disabled>Seleccione un docente...</option>
                    {staffList.map(s => (
                      <option key={s.id} value={s.id}>{s.fullName}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mt-8 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setAssignModalOpen(false)}
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

      {newClassModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900">Nueva Clase</h3>
              <button 
                onClick={() => setNewClassModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleCreateClass} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sección <span className="text-red-500">*</span>
                  </label>
                  <select 
                    value={newClassForm.sectionId}
                    onChange={(e) => setNewClassForm({...newClassForm, sectionId: e.target.value})}
                    required
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:bg-white transition-all"
                  >
                    <option value="" disabled>Seleccione una sección...</option>
                    {sections.map(s => (
                      <option key={s.id} value={s.id}>{s.gradeLevelName} {s.name}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Materia <span className="text-red-500">*</span>
                  </label>
                  <select 
                    value={newClassForm.subjectId}
                    onChange={(e) => setNewClassForm({...newClassForm, subjectId: e.target.value})}
                    required
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:bg-white transition-all"
                  >
                    <option value="" disabled>Seleccione una materia...</option>
                    {subjects.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Docente <span className="text-gray-400 font-normal">(Opcional)</span>
                  </label>
                  <select 
                    value={newClassForm.staffId}
                    onChange={(e) => setNewClassForm({...newClassForm, staffId: e.target.value})}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:bg-white transition-all"
                  >
                    <option value="">Dejar sin asignar</option>
                    {staffList.map(s => (
                      <option key={s.id} value={s.id}>{s.fullName}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mt-8 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setNewClassModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors"
                >
                  Crear Clase
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
