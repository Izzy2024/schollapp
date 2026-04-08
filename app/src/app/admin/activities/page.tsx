'use client';

import DashboardLayout from '@/components/DashboardLayout';
import UnderConstructionPage from '@/components/UnderConstructionPage';
import { getMenuGroupsForRoles } from '@/lib/nav/menu';

const menuGroups = getMenuGroupsForRoles(['admin']);

export default function AdminActivitiesPage() {
  return (
    <DashboardLayout roleTitle="Admin" userName="Administrador" userRole="Administrador" menuGroups={menuGroups} breadcrumbs={['Admin', 'Actividades']}>
      <UnderConstructionPage
        title="Actividades"
        description="Próximamente podrás gestionar actividades del colegio desde esta sección."
        backHref="/admin"
        backLabel="Volver a Admin"
      />
    </DashboardLayout>
  );
}
