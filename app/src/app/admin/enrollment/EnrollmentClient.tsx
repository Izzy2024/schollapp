'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { getMenuGroupsForRoles } from '@/lib/nav/menu';
import { enrollmentEnrollStudent, enrollmentGetEnrollments, enrollmentReenrollStudent } from '@/actions/enrollment-client';
import { hasEnrollmentUiEligibleStudents, listEnrollmentUiSections, listEnrollmentUiStudents } from '@/actions/enrollment-ui';
import { getEnrollmentPaymentOptions, type PaymentOption } from '@/actions/finance/enrollment-charges';
import { App } from 'antd';

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
type StudentOpt = Awaited<ReturnType<typeof listEnrollmentUiStudents>>[number];
type SectionOpt = Awaited<ReturnType<typeof listEnrollmentUiSections>>[number];

function formatDomainError(err: unknown): string {
  const code = typeof err === 'object' && err && 'code' in err ? String((err as any).code) : null;
  if (code) {
    switch (code) {
      case 'CAPACITY_EXCEEDED':
        return 'La sección ya está llena.';
      case 'ALREADY_ENROLLED_IN_YEAR':
        return 'El alumno ya está inscrito en el ciclo activo.';
      case 'NO_ACTIVE_YEAR':
        return 'No hay ciclo escolar activo (seed incompleto).';
      case 'TENANT_SCOPE_VIOLATION':
        return 'No se encontró la escuela para esta sesión.';
      default:
        break;
    }
  }

  // Next/RSC sometimes serializes thrown objects into a shape like {name, code, message, digest}
  if (typeof err === 'object' && err) {
    if ('message' in err && typeof (err as any).message === 'string') {
      return String((err as any).message);
    }

    // Some server-action failures bubble up as a plain object that doesn't extend Error.
    // Avoid rendering "[object Object]" in UI.
    if ('name' in err && 'code' in err) {
      const n = String((err as any).name);
      const c = String((err as any).code);
      return `${n}: ${c}`;
    }

    return 'Ocurrió un error inesperado.';
  }

  if (err instanceof Error) return err.message;
  return 'Ocurrió un error inesperado.';
}

export default function EnrollmentClient() {
  const { message } = App.useApp();
  const router = useRouter();
  const menuGroups = useMemo(() => getMenuGroupsForRoles(['admin']), []);

  const [enrollments, setEnrollments] = useState<EnrollmentRow[]>([]);
  const [students, setStudents] = useState<StudentOpt[]>([]);
  const [sections, setSections] = useState<SectionOpt[]>([]);

  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [selectedSectionId, setSelectedSectionId] = useState<string>('');
  const [selectedPaymentOption, setSelectedPaymentOption] = useState<PaymentOption>('monthly');

  const [paymentOptions, setPaymentOptions] = useState<Array<{
    type: PaymentOption;
    label: string;
    description: string;
    totalCents: number;
    discount: number;
  }>>([]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const load = async () => {
    setLoading(true);
    setNotice(null);
    try {
      const [rows, studentOpts, sectionOpts, hasEligible, paymentOptsResult] = await Promise.all([
        enrollmentGetEnrollments(),
        listEnrollmentUiStudents(),
        listEnrollmentUiSections(),
        hasEnrollmentUiEligibleStudents(),
        getEnrollmentPaymentOptions('').catch(() => ({ options: [], concepts: [] })),
      ]);
      setEnrollments(rows);
      setStudents(studentOpts);
      setSections(sectionOpts);
      setPaymentOptions(paymentOptsResult.options);

      if (!hasEligible) {
        setNotice({
          type: 'success',
          message: 'Todos los alumnos activos ya tienen inscripción. Puedes reasignar a otra sección usando el botón de cambio (↔) en la tabla.',
        });
      }

      // set sane defaults
      if (!selectedStudentId && studentOpts[0]) setSelectedStudentId(studentOpts[0].id);
      if (!selectedSectionId) {
        const firstNonFull = sectionOpts.find((s) => !s.isFull);
        setSelectedSectionId((firstNonFull ?? sectionOpts[0])?.id ?? '');
      }
    } catch (err) {
      setNotice({ type: 'error', message: formatDomainError(err) });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canSubmit = selectedStudentId && selectedSectionId && !submitting;

  const onEnroll = async () => {
    setSubmitting(true);
    setNotice(null);
    try {
      await enrollmentEnrollStudent(selectedStudentId, selectedSectionId, selectedPaymentOption);
      message.success('Inscripción guardada correctamente');
      // Ensure we read fresh data after mutation.
      await new Promise((r) => setTimeout(r, 150));
      await load();
    } catch (err) {
      const errorMsg = formatDomainError(err);
      message.error(errorMsg);
      setNotice({ type: 'error', message: errorMsg });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout
      roleTitle="Admin"
      userName="Administrador"
      userRole="Administrador"
      menuGroups={menuGroups}
      breadcrumbs={['Admin', 'Inscripciones']}
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inscripciones</h1>
          <p className="text-sm text-gray-500 mt-1">Crear y consultar inscripciones del ciclo activo.</p>
          <button
            onClick={() => router.push('/admin/students')}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            + Crear nuevo alumno →
          </button>
        </div>

        {/* Prevent Next/RSC serialized error objects from polluting the UI */}
        <div className="hidden" aria-hidden="true">
          {null}
        </div>

        {notice && (
          <div
            className={
              notice.type === 'success'
                ? 'rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800'
                : 'rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800'
            }
          >
            {notice.message}
          </div>
        )}

        <div id="quick-enroll-form" className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 space-y-4">
            <h2 className="text-sm font-semibold text-gray-900">Inscripción rápida</h2>

            {loading ? (
              <div className="text-sm text-gray-500">Cargando...</div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Alumno</label>
                    <select
                      value={selectedStudentId}
                      onChange={(e) => setSelectedStudentId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
                    >
                      {students.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                    <p className="text-[11px] text-gray-500 mt-1">
                      Si no hay alumnos elegibles, el botón hará reasignación (reinscripción) para que el demo avance.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Sección</label>
                    <select
                      value={selectedSectionId}
                      onChange={(e) => setSelectedSectionId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
                    >
                      {sections.map((s) => (
                        <option key={s.id} value={s.id} disabled={s.isFull}>
                          {s.label} {s.isFull ? '— (Llena)' : ''} ({s.enrolledCount}/{s.capacity ?? '∞'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-end">
                    <button
                      onClick={onEnroll}
                      disabled={!canSubmit}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 text-sm font-semibold"
                    >
                      {submitting ? 'Inscribiendo…' : 'Inscribir'}
                    </button>
                  </div>
                </div>

                {/* Payment Options */}
                {paymentOptions.length > 0 && (
                  <div className="mt-4 p-4 rounded-xl bg-blue-50 border border-blue-100">
                    <label className="block text-xs font-semibold text-blue-800 mb-2">Opción de pago</label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {paymentOptions.map((opt) => (
                        <div
                          key={opt.type}
                          onClick={() => setSelectedPaymentOption(opt.type)}
                          className={`p-3 rounded-xl border cursor-pointer transition-all ${
                            selectedPaymentOption === opt.type
                              ? 'border-blue-500 bg-blue-100 shadow-sm'
                              : 'border-gray-200 bg-white hover:border-blue-300'
                          }`}
                        >
                          <div className="font-semibold text-sm text-gray-900">{opt.label}</div>
                          <div className="text-xs text-gray-500 mt-0.5">{opt.description}</div>
                          <div className="text-sm font-bold text-blue-600 mt-1">
                            ${(opt.totalCents / 100).toFixed(2)}
                            {opt.discount > 0 && (
                              <span className="text-xs text-green-600 ml-1">( ahorras ${(opt.discount / 100).toFixed(2)} )</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-900">Inscripciones (ciclo activo)</h2>
              <button
                onClick={load}
                className="px-3 py-2 text-xs font-semibold bg-gray-50 text-gray-700 rounded-lg border border-gray-200 hover:bg-gray-100"
              >
                Recargar
              </button>
            </div>

            {loading ? (
              <div className="text-sm text-gray-500">Cargando...</div>
            ) : enrollments.length === 0 ? (
              <div className="text-sm text-gray-500">No hay inscripciones registradas.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b border-gray-100">
                      <th className="py-2 pr-4">Alumno</th>
                      <th className="py-2 pr-4">Matrícula</th>
                      <th className="py-2 pr-4">Grado</th>
                      <th className="py-2 pr-4">Sección</th>
                      <th className="py-2 pr-4">Estatus</th>
                      <th className="py-2 pr-4">Fecha</th>
                      <th className="py-2">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {enrollments.map((e) => (
                      <tr key={e.id} className="border-b border-gray-50 last:border-none hover:bg-gray-50/50">
                        <td className="py-3 pr-4 font-medium text-gray-900">{e.studentName}</td>
                        <td className="py-3 pr-4 text-gray-600">{e.studentCode ?? '—'}</td>
                        <td className="py-3 pr-4 text-gray-600">{e.gradeLevelName}</td>
                        <td className="py-3 pr-4 text-gray-600">{e.sectionName}</td>
                        <td className="py-3 pr-4">
                          <span className={`px-2 py-1 rounded-md text-xs font-semibold ${
                            e.status === 'enrolled' ? 'bg-green-100 text-green-800 border border-green-200' :
                            e.status === 'reenrolled' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                            e.status === 'unenrolled' ? 'bg-red-100 text-red-800 border border-red-200' :
                            'bg-gray-100 text-gray-700 border border-gray-200'
                          }`}>
                            {e.status === 'enrolled' ? 'Inscrito' : e.status === 'reenrolled' ? 'Reinscrito' : e.status === 'unenrolled' ? 'Dado de baja' : e.status}
                          </span>
                        </td>
                        <td className="py-3 text-gray-600">{new Date(e.enrolledAt).toLocaleDateString()}</td>
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => router.push(`/admin/students/${e.studentId}`)}
                              className="text-gray-400 hover:text-blue-600 p-1 rounded hover:bg-blue-50 transition-colors"
                              title="Ver expediente"
                            >
                              <span className="material-symbols-outlined text-lg">visibility</span>
                            </button>
                            <button
                              onClick={() => {
                                setSelectedStudentId(e.studentId);
                                setSelectedSectionId('');
                                document.getElementById('quick-enroll-form')?.scrollIntoView({ behavior: 'smooth' });
                              }}
                              className="text-gray-400 hover:text-green-600 p-1 rounded hover:bg-green-50 transition-colors"
                              title="Cambiar sección"
                            >
                              <span className="material-symbols-outlined text-lg">swap_horiz</span>
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
        </div>
      </div>
    </DashboardLayout>
  );
}
