'use client';

import DashboardLayout from '@/components/DashboardLayout';
import UnderConstructionPage from '@/components/UnderConstructionPage';

export default function StudentAssignmentsPage() {
  return (
    <DashboardLayout roleTitle="Alumno" userName="Alumno" userRole="Estudiante" menuGroups={[]} breadcrumbs={['Alumno', 'Tareas']}>
      <UnderConstructionPage
        title="Gestión de Tareas"
        description="Próximamente podrás ver y entregar tareas desde esta sección."
        backHref="/student"
        backLabel="Volver al inicio"
      />
    </DashboardLayout>
  );
}
