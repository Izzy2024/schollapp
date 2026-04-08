'use client';

import DashboardLayout from '@/components/DashboardLayout';
import UnderConstructionPage from '@/components/UnderConstructionPage';
import { getMenuGroupsForRoles } from '@/lib/nav/menu';

const menuGroups = getMenuGroupsForRoles(['admin']);

export default function AdminNewsPage() {
  return (
    <DashboardLayout roleTitle="Admin" userName="Administrador" userRole="Administrador" menuGroups={menuGroups} breadcrumbs={['Admin', 'Noticias']}>
      <UnderConstructionPage
        title="Noticias"
        description="Próximamente podrás gestionar noticias internas desde esta sección."
        backHref="/admin"
        backLabel="Volver a Admin"
      />
    </DashboardLayout>
  );
}
