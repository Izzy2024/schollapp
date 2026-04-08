'use client';

import DashboardLayout from '@/components/DashboardLayout';
import UnderConstructionPage from '@/components/UnderConstructionPage';
import { getMenuGroupsForRoles } from '@/lib/nav/menu';

const menuGroups = getMenuGroupsForRoles(['admin']);

export default function AdminClassPrepPage() {
  return (
    <DashboardLayout roleTitle="Admin" userName="Administrador" userRole="Administrador" menuGroups={menuGroups} breadcrumbs={['Admin', 'Preparación de Clase']}>
      <UnderConstructionPage
        title="Preparación de Clase"
        description="Próximamente podrás preparar y organizar contenidos para clases desde esta sección."
        backHref="/admin"
        backLabel="Volver a Admin"
      />
    </DashboardLayout>
  );
}
