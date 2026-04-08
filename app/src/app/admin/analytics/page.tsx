'use client';

import DashboardLayout from '@/components/DashboardLayout';
import UnderConstructionPage from '@/components/UnderConstructionPage';
import { getMenuGroupsForRoles } from '@/lib/nav/menu';

const menuGroups = getMenuGroupsForRoles(['admin']);

export default function AdminAnalyticsPage() {
  return (
    <DashboardLayout roleTitle="Admin" userName="Administrador" userRole="Administrador" menuGroups={menuGroups} breadcrumbs={['Admin', 'Analítica']}>
      <UnderConstructionPage
        title="Analítica"
        description="Próximamente podrás ver métricas y analítica del colegio desde esta sección."
        backHref="/admin"
        backLabel="Volver a Admin"
      />
    </DashboardLayout>
  );
}
