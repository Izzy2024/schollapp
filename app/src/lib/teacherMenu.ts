import type { MenuGroup } from '@/lib/nav/menu';
import { getMenuGroupsForRoles } from '@/lib/nav/menu';

// Back-compat shim: legacy TEACHER_MENU_GROUPS used by some pages.
// Prefer importing from `src/lib/nav/menu.ts` directly.
export const TEACHER_MENU_GROUPS: MenuGroup[] = getMenuGroupsForRoles(['teacher']);
