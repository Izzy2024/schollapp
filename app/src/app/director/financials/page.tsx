'use client';

import DashboardLayout from '@/components/DashboardLayout';
import UnderConstructionPage from '@/components/UnderConstructionPage';
import { getMenuGroupsForRoles } from '@/lib/nav/menu';

const menuGroups = getMenuGroupsForRoles(['director']);

export default function DirectorFinancialsPage() {
  return (
    <DashboardLayout roleTitle="Director" userName="Director" userRole="Director" menuGroups={menuGroups} breadcrumbs={['Director', 'Finanzas']}>
      <UnderConstructionPage
        title="Finanzas"
        description="Próximamente podrás ver indicadores financieros y estado general de cobranza."
        backHref="/director"
        backLabel="Volver a Director"
      />
    </DashboardLayout>
  );
}
