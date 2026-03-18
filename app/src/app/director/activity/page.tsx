import Link from 'next/link';

import { getDirectorRecentActivities } from '@/actions/directorActivity';
import { getActivityFilterOptions, normalizeActivityFilter } from '@/lib/activity-taxonomy';

type DirectorActivityPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function DirectorActivityPage({ searchParams }: DirectorActivityPageProps) {
  const resolvedParams = (await searchParams) ?? {};
  const selectedFilterRaw = Array.isArray(resolvedParams.type) ? resolvedParams.type[0] : resolvedParams.type;
  const selectedFilter = normalizeActivityFilter(selectedFilterRaw);

  const activityFeed = await getDirectorRecentActivities(undefined, selectedFilter, 1, 50);
  const filterOptions = getActivityFilterOptions();

  return (
    <div className="space-y-6 p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-gray-900">Bitácora Global</h1>
        <p className="text-sm text-gray-600">Actividad reciente de tu institución (scope por tenant y rol DIRECTOR).</p>
      </header>

      <section className="rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-medium text-gray-700">Filtros</h2>
        <div className="flex flex-wrap gap-2">
          {filterOptions.map((option) => {
            const isActive = option.value === selectedFilter;
            return (
              <Link
                key={option.value}
                href={option.value === 'all' ? '/director/activity' : `/director/activity?type=${option.value}`}
                className={`rounded-full border px-3 py-1.5 text-sm transition ${
                  isActive
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                {option.label}
              </Link>
            );
          })}
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white">
        <ul className="divide-y divide-gray-100">
          {activityFeed.activities.map((activity) => (
            <li key={activity.id} className="flex items-start gap-3 p-4">
              <span className={`inline-flex rounded-lg p-2 ${activity.display.iconBg}`}>
                <span className={`material-symbols-outlined text-base ${activity.display.iconColor}`}>{activity.display.icon}</span>
              </span>
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-sm font-medium text-gray-900">{activity.display.text}</p>
                <p className="text-xs text-gray-600">
                  {activity.actorName} · {new Date(activity.occurredAt).toLocaleString()}
                </p>
                {activity.metadata?._errorCode ? (
                  <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                    {activity.metadata._errorCode}
                  </span>
                ) : null}
              </div>
            </li>
          ))}
          {activityFeed.activities.length === 0 ? (
            <li className="p-6 text-sm text-gray-500">No hay actividad para el filtro seleccionado.</li>
          ) : null}
        </ul>
      </section>
    </div>
  );
}
