'use client';

import DashboardLayout from '@/components/DashboardLayout';
import UnderConstructionPage from '@/components/UnderConstructionPage';

export default function StudentMessagesPage() {
  return (
    <DashboardLayout roleTitle="Alumno" userName="Alumno" userRole="Estudiante" menuGroups={[]} breadcrumbs={['Alumno', 'Mensajes']}>
      <UnderConstructionPage
        title="Mensajes"
        description="Próximamente podrás comunicarte con tus docentes desde esta sección."
        backHref="/student"
        backLabel="Volver al inicio"
      />
    </DashboardLayout>
  );
}
