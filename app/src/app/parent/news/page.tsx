'use client';

import DashboardLayout from '@/components/DashboardLayout';
import UnderConstructionPage from '@/components/UnderConstructionPage';
import { getMenuGroupsForRoles } from '@/lib/nav/menu';

const menuGroups = getMenuGroupsForRoles(['parent']);

export default function ParentNewsPage() {
  return (
    <DashboardLayout roleTitle="Tutor / Padre" userName="Familia" userRole="Tutor" menuGroups={menuGroups} breadcrumbs={['Familia', 'Noticias']}>
      <UnderConstructionPage
        title="Noticias"
        description="Próximamente podrás ver noticias y comunicados de la escuela."
        backHref="/parent"
        backLabel="Volver a Familia"
      />
    </DashboardLayout>
  );
}
