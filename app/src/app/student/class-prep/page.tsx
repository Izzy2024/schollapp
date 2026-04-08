'use client';

import DashboardLayout from '@/components/DashboardLayout';
import UnderConstructionPage from '@/components/UnderConstructionPage';

export default function StudentClassPrepPage() {
  return (
    <DashboardLayout
      roleTitle="Alumno"
      userName="Alumno"
      userRole="Estudiante"
      menuGroups={[]}
      breadcrumbs={['Alumno', 'Preparación de Clase']}
    >
      <UnderConstructionPage
        title="Preparación de Clase"
        description="Próximamente podrás ver materiales y planificación de tus clases aquí."
        backHref="/student"
        backLabel="Volver al inicio"
      />
    </DashboardLayout>
  );
}
