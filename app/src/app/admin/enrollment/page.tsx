'use client';

import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import {
  getEnrollments,
  enrollStudent,
  unenrollStudent,
  getStudentsWithoutEnrollment,
  getSectionsWithCapacity,
} from '@/actions/enrollment';
import { message } from 'antd';

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

type EnrollmentRow = {
  id: string;
  studentId: string;
  studentName: string;
  studentCode: string | null;
  gradeLevelName: string;
  sectionName: string;
  status: string;
  enrolledAt: string;
};

type UnenrolledStudent = { id: string; firstName: string; lastName: string; studentCode: string };
type SectionWithCap = {
  id: string;
  name: string;
  gradeLevelName: string;
  capacity: number;
  enrolledCount: number;
  isFull: boolean;
};

// ─── Stepper ──────────────────────────────────────────────────────────────────
const STEPS = ['Buscar Alumno', 'Elegir Sección', 'Confirmar'];

function WizardStepper({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-0 px-6 py-4 border-b border-gray-100 bg-gray-50/50">
      {STEPS.map((label, idx) => {
        const step = idx + 1;
        const isActive = step === current;
        const isDone = step < current;
        return (
          <React.Fragment key={step}>
            <div className="flex items-center gap-2.5">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  isDone
                    ? 'bg-green-500 text-white'
                    : isActive
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                {isDone ? (
                  <span className="material-symbols-outlined text-[14px]">check</span>
                ) : (
                  step
                )}
              </div>
              <span
                className={`text-sm font-medium hidden sm:block ${
                  isActive ? 'text-gray-900' : isDone ? 'text-green-600' : 'text-gray-400'
                }`}
              >
                {label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div
                className={`flex-1 h-px mx-3 ${isDone ? 'bg-green-400' : 'bg-gray-200'}`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function EnrollmentPage() {
  const [enrollments, setEnrollments] = useState<EnrollmentRow[]>([]);
  const [sections, setSections] = useState<SectionWithCap[]>([]);
  const [loading, setLoading] = useState(true);

  // Table filters
  const [search, setSearch] = useState('');
  const [filterGrade, setFilterGrade] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const searchRef = useRef<NodeJS.Timeout | null>(null);

  // Wizard
  const [wizardStep, setWizardStep] = useState<0 | 1 | 2 | 3>(0);
  const [studentsWithout, setStudentsWithout] = useState<UnenrolledStudent[]>([]);
  const [sectionsWizard, setSectionsWizard] = useState<SectionWithCap[]>([]);
  const [wizardLoading, setWizardLoading] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<UnenrolledStudent | null>(null);
  const [selectedSection, setSelectedSection] = useState<SectionWithCap | null>(null);
  const [wizardSearch, setWizardSearch] = useState('');
  const [enrolling, setEnrolling] = useState(false);

  // Confirm unenroll
  const [unenrollConfirmId, setUnenrollConfirmId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [data, caps] = await Promise.all([
        getEnrollments('school-demo'),
        getSectionsWithCapacity('school-demo'),
      ]);
      setEnrollments(data);
      setSections(caps);
    } catch (e: any) {
      message.error(e.message || 'Error cargando inscripciones');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Stats ──────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const active = enrollments.filter((e) => e.status === 'enrolled').length;
    const totalSec = sections.length;
    const avgOcc =
      sections.length > 0
        ? Math.round(
            sections.reduce((acc, s) => acc + (s.capacity ? (s.enrolledCount / s.capacity) * 100 : 0), 0) /
              sections.filter((s) => s.capacity > 0).length || 0
          )
        : 0;
    return { active, totalSec, avgOcc };
  }, [enrollments, sections]);

  // ── Table filter ───────────────────────────────────────────────────────────
  const gradeOptions = useMemo(
    () => Array.from(new Set(enrollments.map((e) => e.gradeLevelName))).sort(),
    [enrollments]
  );

  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    if (searchRef.current) clearTimeout(searchRef.current);
    searchRef.current = setTimeout(() => setDebouncedSearch(search), 200);
    return () => { if (searchRef.current) clearTimeout(searchRef.current); };
  }, [search]);

  const filtered = useMemo(() => {
    const q = debouncedSearch.toLowerCase();
    return enrollments.filter((e) => {
      const matchesSearch =
        !q ||
        e.studentName.toLowerCase().includes(q) ||
        (e.studentCode || '').toLowerCase().includes(q);
      const matchesGrade = !filterGrade || e.gradeLevelName === filterGrade;
      const matchesStatus = !filterStatus || e.status === filterStatus;
      return matchesSearch && matchesGrade && matchesStatus;
    });
  }, [enrollments, debouncedSearch, filterGrade, filterStatus]);

  // ── Wizard ─────────────────────────────────────────────────────────────────
  const openWizard = async () => {
    setWizardStep(1);
    setSelectedStudent(null);
    setSelectedSection(null);
    setWizardSearch('');
    setWizardLoading(true);
    try {
      const [students, caps] = await Promise.all([
        getStudentsWithoutEnrollment('school-demo'),
        getSectionsWithCapacity('school-demo'),
      ]);
      setStudentsWithout(students);
      setSectionsWizard(caps);
    } catch (e: any) {
      message.error(e.message || 'Error cargando datos');
      setWizardStep(0);
    } finally {
      setWizardLoading(false);
    }
  };

  const closeWizard = () => setWizardStep(0);

  const filteredWizardStudents = useMemo(() => {
    const q = wizardSearch.toLowerCase();
    if (!q) return studentsWithout;
    return studentsWithout.filter(
      (s) =>
        s.firstName.toLowerCase().includes(q) ||
        s.lastName.toLowerCase().includes(q) ||
        s.studentCode.toLowerCase().includes(q)
    );
  }, [studentsWithout, wizardSearch]);

  const handleEnroll = async () => {
    if (!selectedStudent || !selectedSection) return;
    setEnrolling(true);
    try {
      const res = await enrollStudent(selectedStudent.id, selectedSection.id, 'school-demo');
      if ('error' in res && res.error) {
        message.error((res as { error: string }).error);
      } else {
        message.success('¡Alumno inscrito exitosamente!');
        closeWizard();
        loadData();
      }
    } catch (e: any) {
      message.error(e.message || 'Error al inscribir');
    } finally {
      setEnrolling(false);
    }
  };

  const handleUnenroll = async (id: string) => {
    try {
      await unenrollStudent(id, 'school-demo');
      message.success('Baja procesada');
      loadData();
    } catch (e: any) {
      message.error(e.message || 'Error al dar de baja');
    } finally {
      setUnenrollConfirmId(null);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <DashboardLayout
      roleTitle="Admin / Control Escolar"
      userName="Administrador"
      userRole="Administrador"
      menuGroups={menuGroups}
      breadcrumbs={['Admin', 'Inscripciones']}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-900">Inscripciones</h1>
          <span className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm font-bold">
            {stats.active} inscritos
          </span>
        </div>
        <button
          onClick={openWizard}
          className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors shadow-lg"
        >
          <span className="material-symbols-outlined text-lg">person_add</span>
          Inscribir Alumno
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <span className="material-symbols-outlined">groups</span>
            </div>
          </div>
          <div className="text-sm font-medium text-gray-500">Total Inscritos</div>
          <div className="text-3xl font-bold text-gray-900 mt-1">{stats.active}</div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <span className="material-symbols-outlined">class</span>
            </div>
          </div>
          <div className="text-sm font-medium text-gray-500">Secciones Activas</div>
          <div className="text-3xl font-bold text-gray-900 mt-1">{stats.totalSec}</div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <span className="material-symbols-outlined">pie_chart</span>
            </div>
          </div>
          <div className="text-sm font-medium text-gray-500">Promedio de Ocupación</div>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-3xl font-bold text-gray-900">{stats.avgOcc}%</span>
            <div className="flex-1 h-2 bg-gray-100 rounded-full mt-1">
              <div
                className="h-2 rounded-full bg-emerald-500 transition-all"
                style={{ width: `${Math.min(stats.avgOcc, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[220px] relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">search</span>
          <input
            type="text"
            placeholder="Buscar alumno o matrícula..."
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          value={filterGrade}
          onChange={(e) => setFilterGrade(e.target.value)}
          className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900 min-w-[160px]"
        >
          <option value="">Todos los grados</option>
          {gradeOptions.map((g) => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900 min-w-[140px]"
        >
          <option value="">Todos los estados</option>
          <option value="enrolled">Inscrito</option>
          <option value="withdrawn">Baja</option>
          <option value="pre_enrolled">Pre-inscrito</option>
        </select>
        {(search || filterGrade || filterStatus) && (
          <button
            onClick={() => { setSearch(''); setFilterGrade(''); setFilterStatus(''); }}
            className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-sm">close</span>
            Limpiar
          </button>
        )}
        <span className="text-sm text-gray-500 ml-auto">
          {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6">
        {loading ? (
          <div className="p-12 text-center text-gray-500">Cargando inscripciones...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <span className="material-symbols-outlined text-4xl text-gray-300 mb-3 block">search_off</span>
            <div className="text-gray-500">No hay resultados para los filtros seleccionados.</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-gray-50/50 text-gray-600 font-medium border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4">Alumno</th>
                  <th className="px-6 py-4">Grado</th>
                  <th className="px-6 py-4">Sección</th>
                  <th className="px-6 py-4">Estado</th>
                  <th className="px-6 py-4">Inscrito el</th>
                  <th className="px-6 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-800">
                {filtered.map((e) => (
                  <tr key={e.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-xs flex-shrink-0">
                          {e.studentName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{e.studentName}</div>
                          <div className="text-xs text-gray-400 font-mono">{e.studentCode || '—'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-700">{e.gradeLevelName}</td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-lg text-xs font-bold">
                        Sec. {e.sectionName}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {e.status === 'enrolled' ? (
                        <span className="px-2.5 py-1 bg-green-100 text-green-800 rounded-lg text-xs font-semibold">
                          Inscrito
                        </span>
                      ) : e.status === 'pre_enrolled' ? (
                        <span className="px-2.5 py-1 bg-yellow-100 text-yellow-800 rounded-lg text-xs font-semibold">
                          Pre-inscrito
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 bg-gray-100 text-gray-500 rounded-lg text-xs font-semibold">
                          Baja
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {new Date(e.enrolledAt).toLocaleDateString('es-MX', {
                        day: '2-digit', month: 'short', year: 'numeric',
                      })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {e.status === 'enrolled' ? (
                        unenrollConfirmId === e.id ? (
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-xs text-red-600 font-medium">¿Confirmar baja?</span>
                            <button
                              onClick={() => handleUnenroll(e.id)}
                              className="px-2 py-1 bg-red-600 text-white text-xs rounded-lg hover:bg-red-700"
                            >
                              Sí
                            </button>
                            <button
                              onClick={() => setUnenrollConfirmId(null)}
                              className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded-lg hover:bg-gray-300"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setUnenrollConfirmId(e.id)}
                            className="px-3 py-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg text-xs font-medium transition-colors"
                          >
                            Dar de Baja
                          </button>
                        )
                      ) : (
                        <span className="text-gray-300 text-xs italic">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Wizard Modal */}
      {wizardStep > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Stepper header */}
            <WizardStepper current={wizardStep} />

            {/* Close button */}
            <div className="absolute top-4 right-4 z-10">
              <button
                onClick={closeWizard}
                className="text-gray-400 hover:text-gray-700 transition-colors bg-white/80 rounded-full p-1"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Body */}
            <div className="p-6 flex-1 overflow-y-auto" style={{ position: 'relative' }}>
              {wizardLoading ? (
                <div className="py-16 text-center text-gray-500">
                  <span className="material-symbols-outlined text-4xl text-gray-300 mb-3 block animate-spin">progress_activity</span>
                  Preparando datos...
                </div>
              ) : wizardStep === 1 ? (
                /* ── Step 1: Buscar alumno ────────────────────────────────── */
                <div className="flex flex-col h-full">
                  <p className="text-sm text-gray-500 mb-4">
                    Selecciona el alumno a inscribir. Solo aparecen alumnos sin inscripción activa en el ciclo actual.
                  </p>
                  <div className="relative mb-4">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">search</span>
                    <input
                      type="text"
                      placeholder="Buscar por nombre o matrícula..."
                      autoFocus
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 text-sm"
                      value={wizardSearch}
                      onChange={(e) => setWizardSearch(e.target.value)}
                    />
                  </div>
                  <div className="flex-1 border border-gray-100 rounded-xl divide-y divide-gray-100 overflow-y-auto min-h-[260px] max-h-[380px]">
                    {filteredWizardStudents.length === 0 ? (
                      <div className="p-8 text-center text-gray-500">
                        {studentsWithout.length === 0
                          ? '✅ Todos los alumnos ya están inscritos en este ciclo.'
                          : 'No se encontraron alumnos con ese criterio.'}
                      </div>
                    ) : (
                      filteredWizardStudents.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => { setSelectedStudent(s); setWizardStep(2); }}
                          className="w-full text-left px-5 py-4 hover:bg-blue-50 transition-colors flex justify-between items-center group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-xs flex-shrink-0">
                              {s.firstName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-medium text-gray-900 group-hover:text-blue-700">
                                {s.firstName} {s.lastName}
                              </div>
                              <div className="text-xs text-gray-400 font-mono">{s.studentCode}</div>
                            </div>
                          </div>
                          <span className="material-symbols-outlined text-gray-300 group-hover:text-blue-500">
                            chevron_right
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              ) : wizardStep === 2 ? (
                /* ── Step 2: Elegir sección ───────────────────────────────── */
                <div className="flex flex-col h-full">
                  <div className="flex items-center gap-3 mb-5 p-3.5 bg-indigo-50 border border-indigo-100 rounded-xl">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs flex-shrink-0">
                      {selectedStudent?.firstName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-xs text-indigo-500 font-medium uppercase">Alumno seleccionado</div>
                      <div className="font-bold text-indigo-900">
                        {selectedStudent?.firstName} {selectedStudent?.lastName}
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 mb-4">Elige una sección disponible. Las secciones llenas no se pueden seleccionar.</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 overflow-y-auto max-h-[360px]">
                    {sectionsWizard.map((sec) => {
                      const pct = sec.capacity ? Math.min(100, Math.round((sec.enrolledCount / sec.capacity) * 100)) : 0;
                      return (
                        <button
                          key={sec.id}
                          disabled={sec.isFull}
                          onClick={() => { setSelectedSection(sec); setWizardStep(3); }}
                          className={`text-left p-4 rounded-xl border-2 transition-all ${
                            sec.isFull
                              ? 'bg-red-50 border-red-100 opacity-55 cursor-not-allowed'
                              : 'bg-white border-gray-200 hover:border-indigo-400 hover:shadow-md hover:ring-1 hover:ring-indigo-300'
                          }`}
                        >
                          <div className="font-bold text-gray-900 text-sm">
                            {sec.gradeLevelName}
                            <span className="ml-1.5 text-gray-500 font-normal">Sección {sec.name}</span>
                          </div>
                          <div className="flex items-center justify-between mt-3">
                            <span className={`text-xs ${sec.isFull ? 'text-red-500 font-semibold' : 'text-gray-400'}`}>
                              {sec.enrolledCount} / {sec.capacity || '∞'} lugares
                            </span>
                            {sec.isFull && (
                              <span className="text-red-600 text-xs font-bold uppercase tracking-wide">Lleno</span>
                            )}
                          </div>
                          {sec.capacity > 0 && (
                            <div className={`w-full mt-2 h-1.5 rounded-full ${sec.isFull ? 'bg-red-100' : 'bg-gray-100'}`}>
                              <div
                                className={`h-1.5 rounded-full ${
                                  pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-yellow-400' : 'bg-green-500'
                                }`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : wizardStep === 3 ? (
                /* ── Step 3: Confirmar ────────────────────────────────────── */
                <div className="flex flex-col items-center justify-center py-8">
                  <div className="w-20 h-20 bg-green-50 text-green-600 rounded-full flex items-center justify-center mb-6">
                    <span className="material-symbols-outlined text-4xl">how_to_reg</span>
                  </div>
                  <h4 className="text-xl font-bold text-gray-900 mb-2">Confirmar Inscripción</h4>
                  <p className="text-sm text-gray-500 mb-8 text-center max-w-sm">
                    Revisa los datos y confirma. Esta acción creará el registro de inscripción en el ciclo activo.
                  </p>
                  <div className="w-full max-w-sm bg-gray-50 border border-gray-100 rounded-2xl p-6 space-y-4 shadow-sm">
                    <div>
                      <div className="text-xs text-gray-400 uppercase font-semibold tracking-wide mb-1">Alumno</div>
                      <div className="font-bold text-gray-900 text-lg">
                        {selectedStudent?.firstName} {selectedStudent?.lastName}
                      </div>
                      <div className="text-gray-400 text-sm font-mono">{selectedStudent?.studentCode}</div>
                    </div>
                    <div className="h-px w-full bg-gray-200" />
                    <div>
                      <div className="text-xs text-gray-400 uppercase font-semibold tracking-wide mb-1">Asignando a</div>
                      <div className="font-bold text-gray-900 text-lg">
                        {selectedSection?.gradeLevelName}
                      </div>
                      <div className="text-gray-500 text-sm">Sección "{selectedSection?.name}"</div>
                      <div className="flex items-center gap-2 mt-2">
                        <div className="h-1.5 flex-1 bg-gray-100 rounded-full">
                          <div
                            className="h-1.5 bg-green-500 rounded-full"
                            style={{
                              width: `${selectedSection?.capacity
                                ? Math.min(100, ((selectedSection.enrolledCount + 1) / selectedSection.capacity) * 100)
                                : 0}%`,
                            }}
                          />
                        </div>
                        <span className="text-xs text-gray-400">
                          {(selectedSection?.enrolledCount || 0) + 1} / {selectedSection?.capacity || '∞'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 flex justify-between items-center gap-3 bg-gray-50/50">
              <div>
                {wizardStep > 1 && !wizardLoading ? (
                  <button
                    onClick={() => setWizardStep((s) => (s - 1) as 1 | 2)}
                    className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm">arrow_back</span>
                    Volver
                  </button>
                ) : (
                  <div />
                )}
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={closeWizard}
                  className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-800 transition-colors"
                >
                  Cancelar
                </button>
                {wizardStep === 3 && (
                  <button
                    onClick={handleEnroll}
                    disabled={enrolling}
                    className="flex items-center gap-2 px-6 py-2 text-sm font-bold text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors shadow-lg shadow-green-700/20 disabled:opacity-60"
                  >
                    {enrolling ? (
                      <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                    ) : (
                      <span className="material-symbols-outlined text-sm">check_circle</span>
                    )}
                    {enrolling ? 'Inscribiendo...' : 'Confirmar e Inscribir'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
