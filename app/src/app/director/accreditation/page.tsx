'use client';

import DashboardLayout from '@/components/DashboardLayout';
import UnderConstructionPage from '@/components/UnderConstructionPage';
import { getMenuGroupsForRoles } from '@/lib/nav/menu';

const menuGroups = getMenuGroupsForRoles(['director']);

export default function DirectorAccreditationPage() {
  return (
    <DashboardLayout roleTitle="Director" userName="Director" userRole="Director" menuGroups={menuGroups} breadcrumbs={['Director', 'Acreditación']}>
      <UnderConstructionPage
        title="Acreditación"
        description="Próximamente podrás dar seguimiento a acreditaciones y cumplimiento."
        backHref="/director"
        backLabel="Volver a Director"
      />
    </DashboardLayout>
  );
}
