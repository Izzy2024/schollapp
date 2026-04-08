'use client';

import DashboardLayout from '@/components/DashboardLayout';
import UnderConstructionPage from '@/components/UnderConstructionPage';
import { getMenuGroupsForRoles } from '@/lib/nav/menu';

const menuGroups = getMenuGroupsForRoles(['admin']);

export default function AdminAssignmentsPage() {
  return (
    <DashboardLayout roleTitle="Admin" userName="Administrador" userRole="Administrador" menuGroups={menuGroups} breadcrumbs={['Admin', 'Gestión de Tareas']}>
      <UnderConstructionPage
        title="Gestión de Tareas"
        description="Próximamente podrás gestionar tareas y actividades académicas desde esta sección."
        backHref="/admin"
        backLabel="Volver a Admin"
      />
    </DashboardLayout>
  );
}
