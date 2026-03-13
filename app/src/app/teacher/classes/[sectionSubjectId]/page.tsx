import { getClassDetail, getClassStudents, getClassAttendanceHistory } from '@/actions/classes';
import ClassDetailsTabs from './ClassDetailsTabs';
import { notFound } from 'next/navigation';
import Link from 'next/link';

async function loadClassData(sectionSubjectId: string) {
  try {
    return await Promise.all([
      getClassDetail(sectionSubjectId, 'school-demo'),
      getClassStudents(sectionSubjectId, 'school-demo'),
      getClassAttendanceHistory(sectionSubjectId, 'school-demo')
    ]);
  } catch {
    return null;
  }
}

export default async function ClassDetailsPage({
  params
}: {
  params: Promise<{ sectionSubjectId: string }>
}) {
  const { sectionSubjectId } = await params;
  if (!sectionSubjectId) return notFound();

  const firstTry = await loadClassData(sectionSubjectId);
  const secondTry = firstTry ?? await loadClassData(sectionSubjectId);

  if (secondTry) {
    const [detail, students, attendanceHistory] = secondTry;
    return (
      <ClassDetailsTabs 
        detail={detail}
        students={students}
        attendanceHistory={attendanceHistory}
        sectionSubjectId={sectionSubjectId}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-3 text-center">
        <h1 className="text-lg font-semibold text-slate-800">No se pudo cargar la clase</h1>
        <p className="text-sm text-slate-500">Hubo un problema temporal cargando esta clase. Intenta de nuevo.</p>
        <div className="pt-2">
          <Link href="/teacher" className="inline-flex px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700">
            Volver a Mis Clases
          </Link>
        </div>
      </div>
    </div>
  );
}
