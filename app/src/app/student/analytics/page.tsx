'use client';

import DashboardLayout from '@/components/DashboardLayout';
import UnderConstructionPage from '@/components/UnderConstructionPage';

export default function StudentAnalyticsPage() {
  return (
    <DashboardLayout roleTitle="Alumno" userName="Alumno" userRole="Estudiante" menuGroups={[]} breadcrumbs={['Alumno', 'Analítica']}>
      <UnderConstructionPage
        title="Analítica"
        description="Próximamente podrás ver tu progreso académico y métricas."
        backHref="/student"
        backLabel="Volver al inicio"
      />
    </DashboardLayout>
  );
}
