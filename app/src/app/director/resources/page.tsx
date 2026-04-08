'use client';

import DashboardLayout from '@/components/DashboardLayout';
import UnderConstructionPage from '@/components/UnderConstructionPage';
import { getMenuGroupsForRoles } from '@/lib/nav/menu';

const menuGroups = getMenuGroupsForRoles(['director']);

export default function DirectorResourcesPage() {
  return (
    <DashboardLayout roleTitle="Director" userName="Director" userRole="Director" menuGroups={menuGroups} breadcrumbs={['Director', 'Gestión de Recursos']}>
      <UnderConstructionPage
        title="Gestión de Recursos"
        description="Próximamente podrás administrar inventario y recursos del colegio."
        backHref="/director"
        backLabel="Volver a Director"
      />
    </DashboardLayout>
  );
}
