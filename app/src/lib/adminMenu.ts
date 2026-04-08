import type { MenuGroup } from '@/lib/nav/menu';
import { getMenuGroupsForRoles } from '@/lib/nav/menu';

// Back-compat shim: legacy ADMIN_MENU_GROUPS used by some pages.
// Prefer importing from `src/lib/nav/menu.ts` directly.
export const ADMIN_MENU_GROUPS: MenuGroup[] = getMenuGroupsForRoles(['admin']);
