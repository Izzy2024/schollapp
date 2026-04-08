'use client';

import DashboardLayout from '@/components/DashboardLayout';
import UnderConstructionPage from '@/components/UnderConstructionPage';
import { getMenuGroupsForRoles } from '@/lib/nav/menu';

const menuGroups = getMenuGroupsForRoles(['director']);

export default function DirectorStaffPage() {
  return (
    <DashboardLayout roleTitle="Director" userName="Director" userRole="Director" menuGroups={menuGroups} breadcrumbs={['Director', 'Desempeño Docente']}>
      <UnderConstructionPage
        title="Desempeño Docente"
        description="Próximamente podrás revisar desempeño y métricas de docentes."
        backHref="/director"
        backLabel="Volver a Director"
      />
    </DashboardLayout>
  );
}
