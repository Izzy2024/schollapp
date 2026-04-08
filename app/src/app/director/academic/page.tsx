'use client';

import DashboardLayout from '@/components/DashboardLayout';
import UnderConstructionPage from '@/components/UnderConstructionPage';
import { getMenuGroupsForRoles } from '@/lib/nav/menu';

const menuGroups = getMenuGroupsForRoles(['director']);

export default function DirectorAcademicPage() {
  return (
    <DashboardLayout roleTitle="Director" userName="Director" userRole="Director" menuGroups={menuGroups} breadcrumbs={['Director', 'Rendimiento Académico']}>
      <UnderConstructionPage
        title="Rendimiento Académico"
        description="Próximamente podrás revisar indicadores académicos y tendencias por grupo/materia."
        backHref="/director"
        backLabel="Volver a Director"
      />
    </DashboardLayout>
  );
}
