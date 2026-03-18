'use client';

// NOTE: This page is out of scope for Slice S01/M003 (finances).
// A previous attempt introduced a large client component here that imported server-only code,
// breaking `pnpm -C app build`. We keep a minimal placeholder so the app can build.

import DashboardLayout from '@/components/DashboardLayout';

export default function EnrollmentPage() {
  return (
    <DashboardLayout roleTitle="Admin" userName="" userRole="" menuGroups={[]} breadcrumbs={["Admin", "Inscripciones"]}>
      <div className="p-6">
        <h1 className="text-xl font-semibold">Inscripciones</h1>
        <p className="text-sm text-gray-600 mt-2">Página en construcción.</p>
      </div>
    </DashboardLayout>
  );
}
