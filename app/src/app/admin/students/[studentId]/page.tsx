'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { getStudentById } from '@/actions/students';
import { createGuardianAndLink, removeGuardianLink } from '@/actions/guardians';
import { message } from 'antd';

// Match the updated admin menu groups
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
      { key: '3', icon: 'schedule', label: 'Asistencia', href: '/admin/attendance' },
      { key: '10', icon: 'article', label: 'Reportes', href: '/admin/reports' },
    ],
  },
  {
    title: 'Configuración',
    items: [
      { key: 'academic', icon: 'calendar_month', label: 'Académico', href: '/admin/academic' },
      { key: '13', icon: 'settings', label: 'Ajustes', href: '/admin/settings' },
    ],
  },
];

export default function StudentRecordPage() {
  const { studentId } = useParams();
  const router = useRouter();
  const [student, setStudent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'guardians' | 'enrollments'>('overview');

  const [modalOpen, setModalOpen] = useState(false);
  const [guardianForm, setGuardianForm] = useState({ fullName: '', relationship: '', email: '', phone: '', isPrimary: false });

  const loadStudent = async () => {
    try {
      setLoading(true);
      const data = await getStudentById(studentId as string);
      if (!data) {
        message.error('Estudiante no encontrado');
        router.push('/admin/students');
        return;
      }
      setStudent(data);
    } catch (error: any) {
      message.error(error.message || 'Error al cargar estudiante');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (studentId) {
      loadStudent();
    }
  }, [studentId]);

  const handleSaveGuardian = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guardianForm.fullName) return message.error('El nombre es requerido');

    try {
      const res = await createGuardianAndLink(studentId as string, guardianForm);
      if ('error' in res) {
        message.error((res as any).error);
      } else {
        message.success('Tutor vinculado exitosamente');
        setModalOpen(false);
        setGuardianForm({ fullName: '', relationship: '', email: '', phone: '', isPrimary: false });
        loadStudent();
      }
    } catch (error: any) {
      message.error(error.message || 'Error al vincular tutor');
    }
  };

  const handleRemoveGuardian = async (guardianId: string) => {
    if(!confirm('¿Seguro de desvincular este tutor?')) return;
    try {
      const res = await removeGuardianLink(studentId as string, guardianId);
      if ('error' in res) message.error((res as any).error);
      else {
        message.success('Tutor desvinculado');
        loadStudent();
      }
    } catch (error: any) {
      message.error('Error al desvincular tutor');
    }
  };

  if (loading || !student) {
    return (
      <DashboardLayout
        roleTitle="Admin / Control Escolar"
        userName="Administrador"
        userRole="Administrador"
        menuGroups={menuGroups}
        breadcrumbs={['Admin', 'Estudiantes', 'Cargando...']}
      >
        <div className="p-12 text-center text-gray-500">Cargando expediente...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      roleTitle="Admin / Control Escolar"
      userName="Administrador"
      userRole="Administrador"
      menuGroups={menuGroups}
      breadcrumbs={['Admin', 'Estudiantes', `${student.firstName} ${student.lastName}`]}
    >
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{student.firstName} {student.lastName}</h1>
          <p className="text-sm text-gray-500 font-mono mt-1">Matrícula: {student.studentCode || 'No asignada'}</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => router.push('/admin/students')}
            className="px-4 py-2 border border-gray-200 bg-white rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Volver a la lista
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6 flex">
        <button 
          onClick={() => setActiveTab('overview')}
          className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'overview' ? 'border-blue-600 text-blue-600 bg-blue-50/50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
        >
          Información General
        </button>
        <button 
          onClick={() => setActiveTab('guardians')}
          className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'guardians' ? 'border-blue-600 text-blue-600 bg-blue-50/50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
        >
          Tutores / Familia
        </button>
        <button 
          onClick={() => setActiveTab('enrollments')}
          className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'enrollments' ? 'border-blue-600 text-blue-600 bg-blue-50/50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
        >
          Inscripciones
        </button>
      </div>

      {activeTab === 'overview' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-6">Datos del Estudiante</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-12">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Nombre Completo</p>
              <p className="text-base text-gray-900">{student.firstName} {student.lastName}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Matrícula</p>
              <p className="text-base font-mono text-gray-900">{student.studentCode || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Fecha de Nacimiento</p>
              <p className="text-base text-gray-900">{student.dob ? new Date(student.dob).toLocaleDateString() : 'No registrada'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Estado</p>
              <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${student.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                {student.status === 'active' ? 'Activo' : 'Inactivo'}
              </span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Correo Electrónico</p>
              <p className="text-base text-gray-900">{student.email || 'No registrado'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Teléfono</p>
              <p className="text-base text-gray-900">{student.phone || 'No registrado'}</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'guardians' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-900">Familiares y Tutores</h3>
            <button 
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
            >
              <span className="material-symbols-outlined text-sm">person_add</span>
              Añadir Tutor
            </button>
          </div>

          {student.guardians.length === 0 ? (
            <div className="p-8 text-center bg-gray-50 border border-dashed border-gray-200 rounded-xl text-gray-500">
              No hay familiares vinculados a este alumno.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {student.guardians.map((g: any) => (
                <div key={g.guardian.id} className="p-4 border border-gray-200 rounded-xl flex flex-col relative">
                  {g.isPrimary && (
                    <span className="absolute top-4 right-4 px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-bold uppercase rounded">Principal</span>
                  )}
                  <h4 className="font-semibold text-gray-900 mb-1 pr-16">{g.guardian.fullName}</h4>
                  <p className="text-sm text-gray-500 mb-3">{g.guardian.relationship || 'Familiar/Tutor'}</p>
                  
                  <div className="space-y-1 mb-4 flex-1">
                    {g.guardian.phone && (
                      <p className="text-sm text-gray-700 flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm text-gray-400">call</span> {g.guardian.phone}
                      </p>
                    )}
                    {g.guardian.email && (
                      <p className="text-sm text-gray-700 flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm text-gray-400">mail</span> {g.guardian.email}
                      </p>
                    )}
                  </div>
                  
                  <div className="pt-3 border-t border-gray-100 flex justify-end">
                    <button 
                      onClick={() => handleRemoveGuardian(g.guardian.id)}
                      className="text-xs font-medium text-red-600 hover:text-red-800 transition-colors flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[14px]">link_off</span>
                      Desvincular
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'enrollments' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-6">Historial Académico</h3>
          
          {student.enrollments.length === 0 ? (
            <div className="p-8 text-center bg-gray-50 border border-dashed border-gray-200 rounded-xl text-gray-500">
              No hay inscripciones registradas.
            </div>
          ) : (
            <div className="space-y-4">
              {student.enrollments.map((e: any) => (
                <div key={e.id} className="flex items-center justify-between p-4 border border-gray-100 rounded-xl bg-gray-50/50">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center font-bold">
                      {e.academicYear.name.split('-')[0].slice(-2)}
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">
                        {e.section.gradeLevel.name} - Grupo {e.section.name}
                      </h4>
                      <p className="text-sm text-gray-500">Ciclo {e.academicYear.name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                      e.status === 'enrolled' ? 'bg-green-100 text-green-800' :
                      e.status === 'withdrawn' ? 'bg-red-100 text-red-800' :
                      'bg-gray-200 text-gray-800'
                    }`}>
                      {e.status.toUpperCase()}
                    </span>
                    <p className="text-xs text-gray-400 mt-2">Registrado: {new Date(e.enrolledAt).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal Añadir Tutor */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-lg font-bold text-gray-900">Añadir Tutor</h3>
              <button 
                onClick={() => setModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleSaveGuardian} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre Completo <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text" 
                  value={guardianForm.fullName}
                  onChange={e => setGuardianForm({...guardianForm, fullName: e.target.value})}
                  required
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:bg-white transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Parentesco (Ej. Madre, Padre, Tío)
                </label>
                <input 
                  type="text" 
                  value={guardianForm.relationship}
                  onChange={e => setGuardianForm({...guardianForm, relationship: e.target.value})}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:bg-white transition-all"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Teléfono
                  </label>
                  <input 
                    type="tel" 
                    value={guardianForm.phone}
                    onChange={e => setGuardianForm({...guardianForm, phone: e.target.value})}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:bg-white transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Correo
                  </label>
                  <input 
                    type="email" 
                    value={guardianForm.email}
                    onChange={e => setGuardianForm({...guardianForm, email: e.target.value})}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:bg-white transition-all"
                  />
                </div>
              </div>
              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={guardianForm.isPrimary}
                    onChange={e => setGuardianForm({...guardianForm, isPrimary: e.target.checked})}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Marcar como Contacto Principal</span>
                </label>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-gray-100 mt-6">
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
                  Vincular Tutor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </DashboardLayout>
  );
}
