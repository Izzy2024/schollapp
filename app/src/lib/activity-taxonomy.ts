export const ACTIVITY_ENTITY_TYPES = ['enrollment', 'attendance', 'announcement', 'finance'] as const;

export type ActivityEntityType = (typeof ACTIVITY_ENTITY_TYPES)[number];

const FILTER_ALIASES: Record<string, ActivityEntityType | null> = {
  all: null,
  '*': null,
  enrollment: 'enrollment',
  enrollments: 'enrollment',
  attendance: 'attendance',
  attendancesession: 'attendance',
  announcement: 'announcement',
  announcements: 'announcement',

  finance: 'finance',
  finanzas: 'finance',
  cobros: 'finance',
  pagos: 'finance',
};

export const ACTIVITY_TAXONOMY: Record<
  ActivityEntityType,
  { label: string; icon: string; actionPrefix: `${ActivityEntityType}.` }
> = {
  enrollment: { label: 'Inscripciones', icon: 'how_to_reg', actionPrefix: 'enrollment.' },
  attendance: { label: 'Asistencia', icon: 'rule', actionPrefix: 'attendance.' },
  announcement: { label: 'Comunicados', icon: 'campaign', actionPrefix: 'announcement.' },
  finance: { label: 'Finanzas', icon: 'paid', actionPrefix: 'finance.' },
};

export function normalizeActivityEntityType(value?: string | null): ActivityEntityType | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  return ACTIVITY_ENTITY_TYPES.includes(normalized as ActivityEntityType)
    ? (normalized as ActivityEntityType)
    : null;
}

export function normalizeActivityFilter(value?: string | null): ActivityEntityType | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  if (normalized in FILTER_ALIASES) {
    return FILTER_ALIASES[normalized];
  }
  return normalizeActivityEntityType(normalized);
}

export function buildActivityFilterWhere(filter: ActivityEntityType | null) {
  if (!filter) return {};
  return {
    OR: [
      { entityType: filter },
      { action: { startsWith: ACTIVITY_TAXONOMY[filter].actionPrefix } },
    ],
  };
}

export function getActivityFilterOptions() {
  return [{ id: 'all', label: 'Actividad Global', icon: 'public' }].concat(
    ACTIVITY_ENTITY_TYPES.map((entityType) => ({
      id: entityType,
      label: ACTIVITY_TAXONOMY[entityType].label,
      icon: ACTIVITY_TAXONOMY[entityType].icon,
    }))
  );
}
