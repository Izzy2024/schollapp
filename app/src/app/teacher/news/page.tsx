'use client';

import DashboardLayout from '@/components/DashboardLayout';
import UnderConstructionPage from '@/components/UnderConstructionPage';
import { getMenuGroupsForRoles } from '@/lib/nav/menu';

const menuGroups = getMenuGroupsForRoles(['teacher']);

export default function TeacherNewsPage() {
  return (
    <DashboardLayout roleTitle="Docente" userName="Docente" userRole="Docente" menuGroups={menuGroups} breadcrumbs={['Docente', 'Noticias']}>
      <UnderConstructionPage
        title="Noticias"
        description="Próximamente podrás ver noticias y comunicados relevantes para docentes."
        backHref="/teacher"
        backLabel="Volver a Docente"
      />
    </DashboardLayout>
  );
}
