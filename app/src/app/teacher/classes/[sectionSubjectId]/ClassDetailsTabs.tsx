'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { TEACHER_MENU_GROUPS } from '@/lib/teacherMenu';
import AttendanceDrawer from '@/components/AttendanceDrawer';
import { getClassStudents, getClassAttendanceHistory } from '@/actions/classes';
import { createScheduleRequest, previewScheduleRequestConflict } from '@/actions/scheduleRequests';
import { useRouter } from 'next/navigation';
import { message } from 'antd';

const DAY_OPTIONS = [
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' }
];

const dayLabel = (day: number) => DAY_OPTIONS.find(d => d.value === day)?.label || `Día ${day}`;
type PreviewConflict = {
  conflictType: 'teacher' | 'room';
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  room: string | null;
  subjectName: string;
  sectionName: string;
  teacherName: string;
  error: string;
};
type PreviewSuggestion = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  room: string | null;
  note: string;
};

export default function ClassDetailsTabs({
  detail,
  students: initialStudents,
  attendanceHistory: initialAttendanceHistory,
  sectionSubjectId
}: {
  detail: any;
  students: any[];
  attendanceHistory: any[];
  sectionSubjectId: string;
}) {
  const [activeTab, setActiveTab] = useState<'alumnos'|'asistencia'|'horario'|'calificaciones'>('alumnos');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerDate, setDrawerDate] = useState(new Date().toISOString());

  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [requestReason, setRequestReason] = useState('');
  const [requestDay, setRequestDay] = useState<number>(1);
  const [requestStart, setRequestStart] = useState('08:00');
  const [requestEnd, setRequestEnd] = useState('09:00');
  const [requestRoom, setRequestRoom] = useState('');
  const [altEnabled, setAltEnabled] = useState(false);
  const [altDay, setAltDay] = useState<number>(2);
  const [altStart, setAltStart] = useState('10:00');
  const [altEnd, setAltEnd] = useState('11:00');
  const [altRoom, setAltRoom] = useState('');
  const [submittingSchedule, setSubmittingSchedule] = useState(false);
  const [scheduleValidation, setScheduleValidation] = useState<{
    state: 'idle' | 'checking' | 'ok' | 'conflict';
    message: string;
    conflicts: PreviewConflict[];
    suggestions: PreviewSuggestion[];
  }>({ state: 'idle', message: 'Completa día y hora para validar disponibilidad.', conflicts: [], suggestions: [] });
  const reasonRef = useRef<HTMLTextAreaElement | null>(null);

  const [students, setStudents] = useState<any[]>(initialStudents);
  const [attendanceHistory, setAttendanceHistory] = useState<any[]>(initialAttendanceHistory);

  const router = useRouter();

  const hasSchedule = (detail.schedules || []).length > 0;

  const latestScheduleRequestLabel = useMemo(() => {
    const latest = detail.latestScheduleRequest;
    if (!latest) return null;
    if (latest.status === 'pending') return 'Solicitud de horario pendiente';
    if (latest.status === 'approved') return 'Última solicitud aprobada';
    if (latest.status === 'rejected') return 'Última solicitud rechazada';
    return null;
  }, [detail.latestScheduleRequest]);

  const handleSaved = async () => {
    const [newSt, newAtt] = await Promise.all([
      getClassStudents(sectionSubjectId, 'school-demo'),
      getClassAttendanceHistory(sectionSubjectId, 'school-demo')
    ]);
    setStudents(newSt);
    setAttendanceHistory(newAtt);
  };

  const openDrawerForToday = () => {
    setDrawerDate(new Date().toISOString());
    setDrawerOpen(true);
  };

  const openDrawerForDate = (dateBox: string) => {
    setDrawerDate(dateBox);
    setDrawerOpen(true);
  };

  const openScheduleRequestModal = () => {
    setScheduleModalOpen(true);
  };

  useEffect(() => {
    if (!scheduleModalOpen) return;
    if (!requestStart || !requestEnd) {
      setScheduleValidation({ state: 'idle', message: 'Completa día y hora para validar disponibilidad.', conflicts: [], suggestions: [] });
      return;
    }

    if (requestStart >= requestEnd) {
      setScheduleValidation({ state: 'conflict', message: 'La hora de inicio debe ser menor a la hora fin.', conflicts: [], suggestions: [] });
      return;
    }

    let cancelled = false;
    const timeout = setTimeout(async () => {
      try {
        setScheduleValidation({ state: 'checking', message: 'Validando choques de docente y aula...', conflicts: [], suggestions: [] });
        const result = await previewScheduleRequestConflict(
          sectionSubjectId,
          hasSchedule ? 'change' : 'new',
          requestDay,
          requestStart,
          requestEnd,
          requestRoom.trim() || null,
          'school-demo'
        );

        if (cancelled) return;
        if ((result as any).ok) {
          setScheduleValidation({ state: 'ok', message: (result as any).message || 'Horario disponible.', conflicts: [], suggestions: [] });
        } else {
          setScheduleValidation({
            state: 'conflict',
            message: (result as any).error || 'Se detectó un conflicto.',
            conflicts: Array.isArray((result as any).conflicts) ? (result as any).conflicts : [],
            suggestions: Array.isArray((result as any).suggestions) ? (result as any).suggestions : []
          });
        }
      } catch (error: any) {
        if (cancelled) return;
        setScheduleValidation({
          state: 'conflict',
          message: error?.message || 'No se pudo validar el horario en este momento.',
          conflicts: [],
          suggestions: []
        });
      }
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [scheduleModalOpen, sectionSubjectId, hasSchedule, requestDay, requestStart, requestEnd, requestRoom]);

  const submitScheduleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (requestReason.trim().length < 10) {
      message.error('El motivo debe tener al menos 10 caracteres.');
      return;
    }

    setSubmittingSchedule(true);
    try {
      const result = await createScheduleRequest(
        sectionSubjectId,
        hasSchedule ? 'change' : 'new',
        requestDay,
        requestStart,
        requestEnd,
        requestRoom.trim() || null,
        requestReason,
        altEnabled ? altDay : null,
        altEnabled ? altStart : null,
        altEnabled ? altEnd : null,
        altEnabled ? (altRoom.trim() || null) : null,
        'school-demo'
      );

      if ((result as any).error) {
        message.error((result as any).error);
      } else {
        message.success('Solicitud de horario enviada para aprobación.');
        setScheduleModalOpen(false);
      }
    } catch (error: any) {
      message.error(error?.message || 'Error al enviar solicitud de horario');
    } finally {
      setSubmittingSchedule(false);
    }
  };

  const applySuggestion = (suggestion: PreviewSuggestion) => {
    setRequestDay(suggestion.dayOfWeek);
    setRequestStart(suggestion.startTime);
    setRequestEnd(suggestion.endTime);
    if (suggestion.room) setRequestRoom(suggestion.room);
    setTimeout(() => {
      if (!reasonRef.current) return;
      reasonRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      reasonRef.current.focus();
    }, 60);
  };

  return (
    <DashboardLayout
      roleTitle="Appsschool"
      menuGroups={TEACHER_MENU_GROUPS}
      userName={detail.teacherName}
      userRole={detail.teacherRole}
      breadcrumbs={['Docente', 'Clases', detail.subjectName]}
    >
      <div className="max-w-6xl mx-auto space-y-6 animate-fade-in-up">

        <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full blur-3xl -mr-20 -mt-20 opacity-60"></div>

          <div className="relative">
            <h1 className="text-3xl font-bold text-slate-800 tracking-tight">{detail.subjectName}</h1>
            <div className="flex items-center gap-3 mt-2 text-slate-500">
              <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[18px]">school</span> {detail.gradeLevel}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
              <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[18px]">group</span> {detail.sectionName}</span>
            </div>
            {!hasSchedule && (
              <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-semibold border border-amber-200">
                <span className="material-symbols-outlined text-[15px]">schedule</span>
                Esta clase aún no tiene horario asignado
              </div>
            )}
            {latestScheduleRequestLabel && (
              <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200">
                <span className="material-symbols-outlined text-[15px]">event_note</span>
                {latestScheduleRequestLabel}
              </div>
            )}
          </div>

          <div className="flex items-center gap-4 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 relative">
            <div className="bg-slate-50 px-5 py-3 rounded-2xl border border-slate-100 min-w-[120px]">
              <div className="text-xs text-slate-500 font-medium mb-1">Alumnos</div>
              <div className="text-2xl font-bold text-slate-800">{detail.stats?.studentCount}</div>
            </div>
            <div className="bg-indigo-50 px-5 py-3 rounded-2xl border border-indigo-100 min-w-[120px]">
              <div className="text-xs text-indigo-600 font-medium mb-1">Asistencia Mensual</div>
              <div className="text-2xl font-bold text-indigo-700">{detail.stats?.monthlyAttendancePct}%</div>
            </div>
            <div className="bg-emerald-50 px-5 py-3 rounded-2xl border border-emerald-100 min-w-[120px]">
              <div className="text-xs text-emerald-600 font-medium mb-1">Promedio Grupal</div>
              <div className="text-2xl font-bold text-emerald-700">{detail.stats?.groupAverage}</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="flex border-b border-slate-100 px-2 overflow-x-auto hide-scrollbar">
            <button onClick={() => setActiveTab('alumnos')} className={`px-6 py-4 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === 'alumnos' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
              Lista de Alumnos
            </button>
            <button onClick={() => setActiveTab('asistencia')} className={`px-6 py-4 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === 'asistencia' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
              Historial de Asistencia
            </button>
            <button onClick={() => setActiveTab('horario')} className={`px-6 py-4 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === 'horario' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
              Horario
            </button>
            <button onClick={() => setActiveTab('calificaciones')} className={`px-6 py-4 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === 'calificaciones' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
              Calificaciones
            </button>
          </div>

          <div className="p-6">
            {activeTab === 'alumnos' && (
              <div className="space-y-4 animate-fade-in-up">
                <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <span className="text-sm font-medium text-slate-700">Gestionar asistencia de la sesión de hoy</span>
                  <button onClick={openDrawerForToday} className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-200">
                    Tomar Asistencia Hoy
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Estudiante</th>
                        <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Matrícula</th>
                        <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Asistencia (mes)</th>
                        <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Promedio Actual</th>
                        <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {students.map((st) => (
                        <tr key={st.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs">
                                {st.name.charAt(0)}
                              </div>
                              <span className="font-medium text-slate-800">{st.name}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-sm text-slate-500 font-mono">{st.studentCode}</td>
                          <td className="py-3 px-4 text-center">
                            <div className="inline-flex items-center justify-center w-12 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                              {st.monthlyAttendancePct}%
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="inline-flex items-center justify-center w-10 py-1 rounded-lg text-sm font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                              {st.currentAverage}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className={`inline-flex px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full ${st.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                              {st.status === 'active' ? 'Activo' : 'Inactivo'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {students.length === 0 && <div className="text-center py-12 text-slate-500 text-sm">No hay alumnos inscritos.</div>}
                </div>
              </div>
            )}

            {activeTab === 'asistencia' && (
              <div className="animate-fade-in-up">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Fecha</th>
                        <th className="py-3 px-4 text-xs font-semibold text-green-600 uppercase tracking-wider text-center">Presentes</th>
                        <th className="py-3 px-4 text-xs font-semibold text-red-600 uppercase tracking-wider text-center">Faltas</th>
                        <th className="py-3 px-4 text-xs font-semibold text-yellow-600 uppercase tracking-wider text-center">Retardos</th>
                        <th className="py-3 px-4 text-xs font-semibold text-blue-600 uppercase tracking-wider text-center">Justificados</th>
                        <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {attendanceHistory.map((sess) => (
                        <tr key={sess.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3 px-4 text-sm font-medium text-slate-700">{new Date(sess.date).toLocaleDateString()}</td>
                          <td className="py-3 px-4 text-center font-semibold text-slate-700">{sess.presentCount}</td>
                          <td className="py-3 px-4 text-center font-semibold text-slate-700">{sess.absentCount}</td>
                          <td className="py-3 px-4 text-center font-semibold text-slate-700">{sess.lateCount}</td>
                          <td className="py-3 px-4 text-center font-semibold text-slate-700">{sess.excusedCount}</td>
                          <td className="py-3 px-4 text-right">
                            <button onClick={() => openDrawerForDate(sess.date)} className="text-indigo-600 hover:text-indigo-800 text-sm font-medium px-3 py-1 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors">
                              Ver / Editar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {attendanceHistory.length === 0 && <div className="text-center py-12 text-slate-500 text-sm">No hay historial de asistencia.</div>}
                </div>
              </div>
            )}

            {activeTab === 'horario' && (
              <div className="animate-fade-in-up space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div>
                    <p className="text-sm font-semibold text-slate-700">Horario de la clase</p>
                    <p className="text-xs text-slate-500">Si no tienes horario asignado o necesitas cambios, envía una solicitud.</p>
                  </div>
                  <button
                    onClick={openScheduleRequestModal}
                    className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-200"
                  >
                    {hasSchedule ? 'Solicitar Cambio de Horario' : 'Solicitar Horario'}
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Día</th>
                        <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Hora</th>
                        <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Aula</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(detail.schedules || []).map((sch: any) => (
                        <tr key={sch.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3 px-4 text-sm font-medium text-slate-700">{dayLabel(sch.dayOfWeek)}</td>
                          <td className="py-3 px-4 text-sm text-slate-700">{sch.startTime} - {sch.endTime}</td>
                          <td className="py-3 px-4 text-sm text-slate-500">{sch.room || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!hasSchedule && <div className="text-center py-12 text-slate-500 text-sm">Aún no hay horario asignado para esta clase.</div>}
                </div>
              </div>
            )}

            {activeTab === 'calificaciones' && (
              <div className="animate-fade-in-up py-10 text-center space-y-4">
                <div className="w-16 h-16 mx-auto bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                  <span className="material-symbols-outlined text-3xl">fact_check</span>
                </div>
                <h3 className="text-lg font-medium text-slate-800">Ir al Libro de Calificaciones</h3>
                <p className="text-slate-500 text-sm max-w-sm mx-auto">La captura de calificaciones por evaluación se realiza en el módulo de Libro de Calificaciones.</p>
                <button onClick={() => router.push(`/teacher/gradebook?classId=${sectionSubjectId}`)} className="inline-flex mt-2 px-6 py-2.5 bg-white border border-slate-300 shadow-sm text-slate-700 font-medium rounded-xl hover:bg-slate-50 transition-colors align-center gap-2">
                  Abrir Libro de Calificaciones <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {scheduleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-800">{hasSchedule ? 'Solicitar Cambio de Horario' : 'Solicitar Horario de Clase'}</h3>
              <button onClick={() => setScheduleModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={submitScheduleRequest} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <select className="h-10 px-3 border border-slate-300 rounded-lg" value={requestDay} onChange={(e) => setRequestDay(Number(e.target.value))}>
                  {DAY_OPTIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
                <input type="time" className="h-10 px-3 border border-slate-300 rounded-lg" value={requestStart} onChange={(e) => setRequestStart(e.target.value)} required />
                <input type="time" className="h-10 px-3 border border-slate-300 rounded-lg" value={requestEnd} onChange={(e) => setRequestEnd(e.target.value)} required />
              </div>

              <input
                className="w-full h-10 px-3 border border-slate-300 rounded-lg"
                placeholder="Aula (opcional)"
                value={requestRoom}
                onChange={(e) => setRequestRoom(e.target.value)}
              />

              <div
                className={`rounded-lg border px-3 py-2 text-sm ${
                  scheduleValidation.state === 'ok'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                    : scheduleValidation.state === 'checking'
                      ? 'bg-blue-50 border-blue-200 text-blue-700'
                      : scheduleValidation.state === 'conflict'
                        ? 'bg-rose-50 border-rose-200 text-rose-700'
                        : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}
              >
                {scheduleValidation.message}
              </div>

              {scheduleValidation.state === 'conflict' && scheduleValidation.conflicts.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-rose-700">Conflictos detectados</p>
                  {scheduleValidation.conflicts.map((conflict, index) => (
                    <div key={`${conflict.conflictType}-${index}`} className="rounded-lg border border-rose-200 bg-rose-50/70 p-3">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 font-semibold ${
                          conflict.conflictType === 'room' ? 'bg-orange-100 text-orange-700' : 'bg-rose-100 text-rose-700'
                        }`}>
                          {conflict.conflictType === 'room' ? 'Choque de aula' : 'Choque docente'}
                        </span>
                        <span className="font-semibold text-slate-700">{dayLabel(conflict.dayOfWeek)}</span>
                        <span className="text-slate-600">{conflict.startTime} - {conflict.endTime}</span>
                        {conflict.room && <span className="text-slate-600">Aula {conflict.room}</span>}
                      </div>
                      <p className="mt-1 text-sm font-medium text-slate-800">{conflict.subjectName} - {conflict.sectionName}</p>
                      <p className="text-xs text-slate-600">{conflict.teacherName}</p>
                    </div>
                  ))}
                </div>
              )}

              {scheduleValidation.state === 'conflict' && scheduleValidation.suggestions.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Sugerencias cercanas</p>
                  {scheduleValidation.suggestions.map((suggestion, index) => (
                    <div key={`${suggestion.dayOfWeek}-${suggestion.startTime}-${index}`} className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-emerald-800">
                          {dayLabel(suggestion.dayOfWeek)} {suggestion.startTime} - {suggestion.endTime}
                        </p>
                        <p className="text-xs text-emerald-700">
                          {suggestion.room ? `Aula ${suggestion.room} - ` : ''}{suggestion.note}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => applySuggestion(suggestion)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors"
                      >
                        Usar sugerencia
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <textarea
                ref={reasonRef}
                className="w-full p-3 border border-slate-300 rounded-lg min-h-[88px]"
                placeholder="Motivo de la solicitud"
                value={requestReason}
                onChange={(e) => setRequestReason(e.target.value)}
                required
              />

              <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={altEnabled} onChange={(e) => setAltEnabled(e.target.checked)} />
                Agregar horario alternativo
              </label>

              {altEnabled && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <select className="h-10 px-3 border border-slate-300 rounded-lg" value={altDay} onChange={(e) => setAltDay(Number(e.target.value))}>
                    {DAY_OPTIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                  </select>
                  <input type="time" className="h-10 px-3 border border-slate-300 rounded-lg" value={altStart} onChange={(e) => setAltStart(e.target.value)} />
                  <input type="time" className="h-10 px-3 border border-slate-300 rounded-lg" value={altEnd} onChange={(e) => setAltEnd(e.target.value)} />
                  <input className="h-10 px-3 border border-slate-300 rounded-lg" placeholder="Aula" value={altRoom} onChange={(e) => setAltRoom(e.target.value)} />
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setScheduleModalOpen(false)} className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700">Cancelar</button>
                <button
                  type="submit"
                  disabled={submittingSchedule || scheduleValidation.state === 'conflict' || scheduleValidation.state === 'checking'}
                  className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-medium disabled:opacity-60"
                >
                  {submittingSchedule ? 'Enviando...' : 'Enviar Solicitud'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <AttendanceDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        sectionSubjectId={sectionSubjectId}
        date={drawerDate}
        onSaved={handleSaved}
      />
    </DashboardLayout>
  );
}
