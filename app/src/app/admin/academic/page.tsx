'use client';

import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { 
  getAcademicYears, 
  createAcademicYear, 
  setAcademicYearActive,
  getGradeLevels,
  createGradeLevel,
  deleteGradeLevel,
  getSections,
  createSection,
  deleteSection
} from '@/actions/academic';
import { message } from 'antd';
import { getMenuGroupsForRoles } from '@/lib/nav/menu';

const menuGroups = getMenuGroupsForRoles(['admin']);

export default function AcademicSetupPage() {
  const [years, setYears] = useState<any[]>([]);
  const [grades, setGrades] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [yearModalOpen, setYearModalOpen] = useState(false);
  const [gradeModalOpen, setGradeModalOpen] = useState(false);
  const [sectionModalOpen, setSectionModalOpen] = useState(false);

  // Forms
  const [yearForm, setYearForm] = useState({ name: '', start: '', end: '' });
  const [gradeForm, setGradeForm] = useState({ name: '', code: '', sortOrder: 0 });
  const [sectionForm, setSectionForm] = useState({ academicYearId: '', gradeLevelId: '', name: '', capacity: 20 });

  const loadData = async () => {
    setLoading(true);
    try {
      const [y, g, s] = await Promise.all([
        getAcademicYears(),
        getGradeLevels(),
        getSections()
      ]);
      setYears(y);
      setGrades(g);
      setSections(s);
    } catch (error: any) {
      message.error(error.message || 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveYear = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await createAcademicYear(yearForm.name, yearForm.start, yearForm.end);
      if (res.error) {
        message.error(res.error);
      } else {
        message.success('Ciclo creado exitosamente');
        setYearModalOpen(false);
        setYearForm({ name: '', start: '', end: '' });
        loadData();
      }
    } catch (error: any) {
      message.error(error.message || 'Error al crear ciclo');
    }
  };

  const handleSaveGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await createGradeLevel(gradeForm.name, gradeForm.code, Number(gradeForm.sortOrder));
      if (res.error) {
        message.error(res.error);
      } else {
        message.success('Grado creado exitosamente');
        setGradeModalOpen(false);
        setGradeForm({ name: '', code: '', sortOrder: 0 });
        loadData();
      }
    } catch (error: any) {
      message.error(error.message || 'Error al crear grado');
    }
  };

  const handleSetActiveYear = async (id: string) => {
    try {
      const res = await setAcademicYearActive(id);
      if ('error' in res) message.error((res as any).error);
      else {
        message.success('Ciclo activado');
        loadData();
      }
    } catch (error: any) {
      message.error('Error al activar ciclo');
    }
  };

  const handleDeleteGrade = async (id: string) => {
    if(!confirm('¿Seguro de eliminar este grado?')) return;
    try {
      const res = await deleteGradeLevel(id);
      if ('error' in res) message.error((res as any).error);
      else {
        message.success('Grado eliminado');
        loadData();
      }
    } catch (error: any) {
      message.error('Error al eliminar grado');
    }
  };

  const handleSaveSection = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await createSection(sectionForm.academicYearId, sectionForm.gradeLevelId, sectionForm.name, Number(sectionForm.capacity));
      if ('error' in res) {
        message.error((res as any).error);
      } else {
        message.success('Sección creada exitosamente');
        setSectionModalOpen(false);
        setSectionForm({ academicYearId: '', gradeLevelId: '', name: '', capacity: 20 });
        loadData();
      }
    } catch (error: any) {
      message.error(error.message || 'Error al crear sección');
    }
  };

  const handleDeleteSection = async (id: string) => {
    if(!confirm('¿Seguro de eliminar esta sección?')) return;
    try {
      const res = await deleteSection(id);
      if ('error' in res) message.error((res as any).error);
      else {
        message.success('Sección eliminada');
        loadData();
      }
    } catch (error: any) {
      message.error('Error al eliminar sección');
    }
  };

  return (
    <DashboardLayout
      roleTitle="Admin / Control Escolar"
      userName="Administrador"
      userRole="Administrador"
      menuGroups={menuGroups}
      breadcrumbs={['Admin', 'Configuración Académica']}
    >
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Configuración Académica</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Ciclos Escolares */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-gray-900">Ciclos Escolares</h3>
            <button 
              onClick={() => setYearModalOpen(true)}
              className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
            >
              <span className="material-symbols-outlined text-sm">add</span>
              Nuevo Ciclo
            </button>
          </div>
          
          {loading ? (
            <p className="text-gray-500 text-sm">Cargando...</p>
          ) : years.length === 0 ? (
            <p className="text-gray-500 text-sm">No hay ciclos escolares registrados.</p>
          ) : (
            <div className="space-y-3">
              {years.map(y => (
                <div key={y.id} className={`flex items-center justify-between p-3 rounded-lg border ${y.isActive ? 'border-green-200 bg-green-50' : 'border-gray-100 bg-white'}`}>
                  <div>
                    <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                      {y.name}
                      {y.isActive && <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-green-200 text-green-800">Activo</span>}
                    </h4>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(y.startDate).toLocaleDateString()} - {new Date(y.endDate).toLocaleDateString()}
                    </p>
                  </div>
                  {!y.isActive && (
                    <button 
                      onClick={() => handleSetActiveYear(y.id)}
                      className="text-xs font-medium text-blue-600 hover:text-blue-800"
                    >
                      Hacer Activo
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Grados */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-gray-900">Grados</h3>
            <button 
              onClick={() => setGradeModalOpen(true)}
              className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
            >
              <span className="material-symbols-outlined text-sm">add</span>
              Nuevo Grado
            </button>
          </div>
          
          {loading ? (
            <p className="text-gray-500 text-sm">Cargando...</p>
          ) : grades.length === 0 ? (
            <p className="text-gray-500 text-sm">No hay grados registrados.</p>
          ) : (
            <div className="space-y-2">
              {grades.map(g => (
                <div key={g.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded bg-gray-100 text-gray-600 flex items-center justify-center font-mono text-xs font-bold">
                      {g.code}
                    </span>
                    <h4 className="font-medium text-gray-900">{g.name}</h4>
                  </div>
                  <button 
                    onClick={() => handleDeleteGrade(g.id)}
                    className="text-gray-400 hover:text-red-600 transition-colors p-1"
                  >
                    <span className="material-symbols-outlined text-sm">delete</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Secciones (Grupos) */}
      <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-gray-900">Secciones (Grupos)</h3>
          <button 
            onClick={() => setSectionModalOpen(true)}
            className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            Nueva Sección
          </button>
        </div>
        
        {loading ? (
          <p className="text-gray-500 text-sm">Cargando...</p>
        ) : sections.length === 0 ? (
          <p className="text-gray-500 text-sm">No hay secciones registradas.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4">Ciclo Escolar</th>
                  <th className="px-6 py-4">Grado</th>
                  <th className="px-6 py-4">Sección</th>
                  <th className="px-6 py-4">Capacidad</th>
                  <th className="px-6 py-4">Alumnos Inscritos</th>
                  <th className="px-6 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-800">
                {sections.map(s => (
                  <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">{s.academicYear.name}</td>
                    <td className="px-6 py-4">{s.gradeLevel.name}</td>
                    <td className="px-6 py-4 font-semibold text-gray-900">{s.name}</td>
                    <td className="px-6 py-4">{s.capacity || '—'}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-md font-mono text-xs">
                        {s._count.enrollments}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => handleDeleteSection(s.id)}
                        className="text-gray-400 hover:text-red-600 transition-colors p-1"
                        title={s._count.enrollments > 0 ? 'No se puede eliminar (tiene inscripciones)' : 'Eliminar'}
                        disabled={s._count.enrollments > 0}
                      >
                        <span className={`material-symbols-outlined text-sm ${s._count.enrollments > 0 ? 'opacity-50 cursor-not-allowed' : ''}`}>delete</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Year Modal */}
      {yearModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900">Nuevo Ciclo Escolar</h3>
              <button onClick={() => setYearModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleSaveYear} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre (ej. 2026-2027)</label>
                <input required type="text" value={yearForm.name} onChange={e => setYearForm({...yearForm, name: e.target.value})} className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Inicio</label>
                  <input required type="date" value={yearForm.start} onChange={e => setYearForm({...yearForm, start: e.target.value})} className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Fin</label>
                  <input required type="date" value={yearForm.end} onChange={e => setYearForm({...yearForm, end: e.target.value})} className="w-full px-3 py-2 border rounded-lg" />
                </div>
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setYearModalOpen(false)} className="px-4 py-2 border rounded-lg">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-gray-900 text-white rounded-lg">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Grade Modal */}
      {gradeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900">Nuevo Grado</h3>
              <button onClick={() => setGradeModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleSaveGrade} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre (ej. 1° Secundaria)</label>
                <input required type="text" value={gradeForm.name} onChange={e => setGradeForm({...gradeForm, name: e.target.value})} className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Código (ej. 1S)</label>
                  <input required type="text" value={gradeForm.code} onChange={e => setGradeForm({...gradeForm, code: e.target.value})} className="w-full px-3 py-2 border rounded-lg uppercase" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Orden (1, 2, 3...)</label>
                  <input required type="number" min="0" value={gradeForm.sortOrder} onChange={e => setGradeForm({...gradeForm, sortOrder: Number(e.target.value)})} className="w-full px-3 py-2 border rounded-lg" />
                </div>
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setGradeModalOpen(false)} className="px-4 py-2 border rounded-lg">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-gray-900 text-white rounded-lg">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Section Modal */}
      {sectionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900">Nueva Sección</h3>
              <button onClick={() => setSectionModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleSaveSection} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ciclo Escolar</label>
                <select required value={sectionForm.academicYearId} onChange={e => setSectionForm({...sectionForm, academicYearId: e.target.value})} className="w-full px-3 py-2 border rounded-lg bg-white">
                  <option value="">Seleccione ciclo...</option>
                  {years.map(y => (
                    <option key={y.id} value={y.id}>{y.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Grado</label>
                <select required value={sectionForm.gradeLevelId} onChange={e => setSectionForm({...sectionForm, gradeLevelId: e.target.value})} className="w-full px-3 py-2 border rounded-lg bg-white">
                  <option value="">Seleccione grado...</option>
                  {grades.map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre (ej. A)</label>
                  <input required type="text" value={sectionForm.name} onChange={e => setSectionForm({...sectionForm, name: e.target.value})} className="w-full px-3 py-2 border rounded-lg uppercase" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Capacidad (Cupo)</label>
                  <input required type="number" min="1" value={sectionForm.capacity} onChange={e => setSectionForm({...sectionForm, capacity: Number(e.target.value)})} className="w-full px-3 py-2 border rounded-lg" />
                </div>
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setSectionModalOpen(false)} className="px-4 py-2 border rounded-lg">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-gray-900 text-white rounded-lg">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
