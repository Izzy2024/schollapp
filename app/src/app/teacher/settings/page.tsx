'use client';

import DashboardLayout from '@/components/DashboardLayout';
import UnderConstructionPage from '@/components/UnderConstructionPage';
import { getMenuGroupsForRoles } from '@/lib/nav/menu';

const menuGroups = getMenuGroupsForRoles(['teacher']);

export default function TeacherSettingsPage() {
  return (
    <DashboardLayout roleTitle="Docente" userName="Docente" userRole="Docente" menuGroups={menuGroups} breadcrumbs={['Docente', 'Configuración']}>
      <UnderConstructionPage
        title="Configuración"
        description="Próximamente podrás ajustar tus preferencias y configuración."
        backHref="/teacher"
        backLabel="Volver a Docente"
      />
    </DashboardLayout>
  );
}
