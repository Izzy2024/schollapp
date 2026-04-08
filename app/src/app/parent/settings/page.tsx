'use client';

import DashboardLayout from '@/components/DashboardLayout';
import UnderConstructionPage from '@/components/UnderConstructionPage';
import { getMenuGroupsForRoles } from '@/lib/nav/menu';

const menuGroups = getMenuGroupsForRoles(['parent']);

export default function ParentSettingsPage() {
  return (
    <DashboardLayout roleTitle="Tutor / Padre" userName="Familia" userRole="Tutor" menuGroups={menuGroups} breadcrumbs={['Familia', 'Configuración']}>
      <UnderConstructionPage
        title="Configuración"
        description="Próximamente podrás ajustar tus preferencias y configuración."
        backHref="/parent"
        backLabel="Volver a Familia"
      />
    </DashboardLayout>
  );
}
