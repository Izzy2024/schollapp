'use client';

import DashboardLayout from '@/components/DashboardLayout';
import UnderConstructionPage from '@/components/UnderConstructionPage';

export default function StudentSchedulePage() {
  return (
    <DashboardLayout roleTitle="Alumno" userName="Alumno" userRole="Estudiante" menuGroups={[]} breadcrumbs={['Alumno', 'Horarios']}>
      <UnderConstructionPage
        title="Horarios"
        description="Próximamente podrás consultar tu horario de clases."
        backHref="/student"
        backLabel="Volver al inicio"
      />
    </DashboardLayout>
  );
}
