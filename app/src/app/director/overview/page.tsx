import { getDirectorOverviewStats } from '@/actions/directorOverview';

export default async function DirectorOverviewPage() {
  const stats = await getDirectorOverviewStats();

  const cards = [
    { label: 'Matrícula total', value: stats.totalEnrolled.toString() },
    { label: 'Asistencia hoy', value: stats.attendanceTodayPct === null ? '—' : `${stats.attendanceTodayPct}%` },
    { label: 'Pendientes (clases)', value: stats.pendingBreakdown.classRequests.toString() },
    { label: 'Sin matrícula activa', value: stats.studentsWithoutEnrollment.toString() },
  ];

  return (
    <div className="space-y-6 p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-gray-900">Overview</h1>
        <p className="text-sm text-gray-600">KPIs operativos de matrícula, asistencia y pendientes.</p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <article key={card.label} className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">{card.label}</p>
            <p className="mt-2 text-2xl font-semibold text-gray-900">{card.value}</p>
          </article>
        ))}
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="text-sm font-medium text-gray-800">Desglose de pendientes</h2>
        <ul className="mt-3 space-y-2 text-sm text-gray-700">
          <li>Class requests: {stats.pendingBreakdown.classRequests}</li>
          <li>Schedule requests: {stats.pendingBreakdown.scheduleRequests}</li>
          <li>Announcements to publish: {stats.pendingBreakdown.announcementsToPublish}</li>
          <li>Role: {stats.pendingBreakdown.role}</li>
          <li>Tenant scope: {stats.pendingBreakdown.scopeTenantId}</li>
        </ul>
      </section>
    </div>
  );
}
