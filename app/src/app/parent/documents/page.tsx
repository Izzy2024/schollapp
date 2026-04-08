'use client';

import DashboardLayout from '@/components/DashboardLayout';
import UnderConstructionPage from '@/components/UnderConstructionPage';
import { getMenuGroupsForRoles } from '@/lib/nav/menu';

const menuGroups = getMenuGroupsForRoles(['parent']);

export default function ParentDocumentsPage() {
  return (
    <DashboardLayout roleTitle="Tutor / Padre" userName="Familia" userRole="Tutor" menuGroups={menuGroups} breadcrumbs={['Familia', 'Documentos']}>
      <UnderConstructionPage
        title="Documentos"
        description="Próximamente podrás consultar documentos escolares desde esta sección."
        backHref="/parent"
        backLabel="Volver a Familia"
      />
    </DashboardLayout>
  );
}
