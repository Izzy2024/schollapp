'use client';

import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import {
  getEnrollments,
  enrollStudent,
  reenrollStudent,
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
  sectionId?: string;
  status: string;
  enrolledAt: string;
};

type UnenrolledStudent = { id: string; firstName: string; lastName: string; studentCode: string };
type SectionWithCap = {
  id: string;
  name: string;
  gradeLevelName: string;
  capacity: number | null;
  enrolledCount: number;
  isFull: boolean;
};

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
                {isDone ? <span className="material-symbols-outlined text-[14px]">check</span> : step}
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
              <div className={`flex-1 h-px mx-3 ${isDone ? 'bg-green-400' : 'bg-gray-200'}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

const ERROR_MESSAGES: Record<string, string> = {
  CAPACITY_EXCEEDED: 'No hay cupo disponible en la sección seleccionada.',
  ALREADY_ENROLLED_IN_YEAR: 'El alumno ya está inscrito en el ciclo activo.',
  TENANT_SCOPE_VIOLATION: 'No se pudo validar el alcance del tenant para esta operación.',
  NO_ACTIVE_YEAR: 'No existe un ciclo activo para completar la operación.',
  ENROLLMENT_NOT_FOUND: 'No se encontró la inscripción seleccionada.',
};

function normalizeErrorMessage(raw: unknown, fallback: string) {
  if (!raw) return fallback;
  const text = raw instanceof Error ? raw.message : String(raw);
  if (ERROR_MESSAGES[text]) return ERROR_MESSAGES[text];

  const code = Object.keys(ERROR_MESSAGES).find((k) => text.includes(k));
  if (code) return ERROR_MESSAGES[code];

  return text || fallback;
}

function capacityLabel(section: SectionWithCap) {
  if (section.capacity == null) return 'sin límite';
  return `${section.enrolledCount} / ${section.capacity}`;
}

export default function EnrollmentPage() {
  const [enrollments, setEnrollments] = useState<EnrollmentRow[]>([]);
  const [sections, setSections] = useState<SectionWithCap[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [filterGrade, setFilterGrade] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const searchRef = useRef<NodeJS.Timeout | null>(null);

  const [wizardStep, setWizardStep] = useState<0 | 1 | 2 | 3>(0);
  const [studentsWithout, setStudentsWithout] = useState<UnenrolledStudent[]>([]);
  const [sectionsWizard, setSectionsWizard] = useState<SectionWithCap[]>([]);
  const [wizardLoading, setWizardLoading] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<UnenrolledStudent | null>(null);
  const [selectedSection, setSelectedSection] = useState<SectionWithCap | null>(null);
  const [wizardSearch, setWizardSearch] = useState('');
  const [enrolling, setEnrolling] = useState(false);

  const [unenrollConfirmId, setUnenrollConfirmId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [data, caps] = await Promise.all([
        getEnrollments('school-demo'),
        getSectionsWithCapacity('school-demo'),
      ]);
      setEnrollments(data as EnrollmentRow[]);
      setSections(caps);
    } catch (e: any) {
      message.error(normalizeErrorMessage(e, 'Error cargando inscripciones'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const stats = useMemo(() => {
    const active = enrollments.filter((e) => e.status === 'enrolled').length;
    const totalSec = sections.length;
    const sectionsWithLimit = sections.filter((s) => s.capacity != null && s.capacity > 0);
    const avgOcc =
      sectionsWithLimit.length > 0
        ? Math.round(
            sectionsWithLimit.reduce((acc, s) => acc + (s.enrolledCount / (s.capacity as number)) * 100, 0) /
              sectionsWithLimit.length
          )
        : 0;
    return { active, totalSec, avgOcc };
  }, [enrollments, sections]);

  const gradeOptions = useMemo(
    () => Array.from(new Set(enrollments.map((e) => e.gradeLevelName))).sort(),
    [enrollments]
  );

  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    if (searchRef.current) clearTimeout(searchRef.current);
    searchRef.current = setTimeout(() => setDebouncedSearch(search), 200);
    return () => {
      if (searchRef.current) clearTimeout(searchRef.current);
    };
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
      message.error(normalizeErrorMessage(e, 'Error cargando datos'));
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
      await enrollStudent(selectedStudent.id, selectedSection.id, 'school-demo');
      message.success('¡Alumno inscrito exitosamente!');
      closeWizard();
      await loadData();
    } catch (e: any) {
      message.error(normalizeErrorMessage(e, 'Error al inscribir'));
    } finally {
      setEnrolling(false);
    }
  };

  const handleReenroll = async (studentId: string) => {
    const targetSection = sections.find((s) => !s.isFull) || null;
    if (!targetSection) {
      message.error(ERROR_MESSAGES.CAPACITY_EXCEEDED);
      return;
    }

    try {
      await reenrollStudent(studentId, targetSection.id, 'school-demo');
      message.success('Reinscripción completada en el ciclo activo.');
      await loadData();
    } catch (e: any) {
      message.error(normalizeErrorMessage(e, 'Error al reinscribir'));
    }
  };

  const handleUnenroll = async (id: string) => {
    try {
      await unenrollStudent(id, 'school-demo');
      message.success('Baja procesada');
      await loadData();
    } catch (e: any) {
      message.error(normalizeErrorMessage(e, 'Error al dar de baja'));
    } finally {
      setUnenrollConfirmId(null);
    }
  };

  return (
    <DashboardLayout
      roleTitle="Admin / Control Escolar"
      userName="Administrador"
      userRole="Administrador"
      menuGroups={menuGroups}
      breadcrumbs={['Admin', 'Inscripciones']}
    >
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="text-sm font-medium text-gray-500">Total Inscritos</div>
          <div className="text-3xl font-bold text-gray-900 mt-1">{stats.active}</div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="text-sm font-medium text-gray-500">Secciones Activas</div>
          <div className="text-3xl font-bold text-gray-900 mt-1">{stats.totalSec}</div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="text-sm font-medium text-gray-500">Promedio de Ocupación</div>
          <div className="text-3xl font-bold text-gray-900 mt-1">{stats.avgOcc}%</div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6">
        {loading ? (
          <div className="p-12 text-center text-gray-500">Cargando inscripciones...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-gray-500">No hay resultados para los filtros seleccionados.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-gray-50/50 text-gray-600 font-medium border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4">Alumno</th>
                  <th className="px-6 py-4">Grado</th>
                  <th className="px-6 py-4">Sección</th>
                  <th className="px-6 py-4">Estado</th>
                  <th className="px-6 py-4">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-800">
                {filtered.map((e) => (
                  <tr key={e.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">{e.studentName}</td>
                    <td className="px-6 py-4 text-gray-700">{e.gradeLevelName}</td>
                    <td className="px-6 py-4">Sec. {e.sectionName}</td>
                    <td className="px-6 py-4">{e.status === 'enrolled' ? 'Inscrito' : 'Baja'}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => handleReenroll(e.studentId)}
                          className="px-3 py-1.5 text-blue-600 hover:bg-blue-50 rounded-lg text-xs font-medium"
                        >
                          Reinscribir
                        </button>
                        {e.status === 'enrolled' ? (
                          <button
                            onClick={() => handleUnenroll(e.id)}
                            className="px-3 py-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg text-xs font-medium transition-colors"
                          >
                            Dar de Baja
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6">
        {sections.map((sec) => (
          <div key={sec.id} className="text-sm text-gray-700 py-1">
            {sec.gradeLevelName} Sección {sec.name}: <span className="font-medium">{capacityLabel(sec)}</span>
          </div>
        ))}
      </div>

      {wizardStep > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <WizardStepper current={wizardStep} />
            <div className="p-6 flex-1 overflow-y-auto" style={{ position: 'relative' }}>
              {wizardLoading ? (
                <div className="py-16 text-center text-gray-500">Preparando datos...</div>
              ) : wizardStep === 1 ? (
                <div>
                  {filteredWizardStudents.map((s) => (
                    <button key={s.id} onClick={() => { setSelectedStudent(s); setWizardStep(2); }}>
                      {s.firstName} {s.lastName}
                    </button>
                  ))}
                </div>
              ) : wizardStep === 2 ? (
                <div>
                  {sectionsWizard.map((sec) => (
                    <button key={sec.id} disabled={sec.isFull} onClick={() => { setSelectedSection(sec); setWizardStep(3); }}>
                      {sec.gradeLevelName} Sección {sec.name} — {sec.capacity == null ? 'sin límite' : `${sec.enrolledCount} / ${sec.capacity}`}
                    </button>
                  ))}
                </div>
              ) : (
                <div>Confirmar Inscripción</div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-between items-center gap-3 bg-gray-50/50">
              <button onClick={closeWizard}>Cancelar</button>
              {wizardStep === 3 && <button onClick={handleEnroll}>Confirmar e Inscribir</button>}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
