'use client';

import DashboardLayout from '@/components/DashboardLayout';
import UnderConstructionPage from '@/components/UnderConstructionPage';

export default function StudentActivitiesPage() {
  return (
    <DashboardLayout roleTitle="Alumno" userName="Alumno" userRole="Estudiante" menuGroups={[]} breadcrumbs={['Alumno', 'Actividades']}>
      <UnderConstructionPage
        title="Actividades"
        description="Próximamente podrás ver actividades y eventos escolares."
        backHref="/student"
        backLabel="Volver al inicio"
      />
    </DashboardLayout>
  );
}
