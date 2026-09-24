'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getPublicApplicationInfo } from '@/actions/admissions';
import LoginForm, { type LoginBranding } from '../LoginForm';

export default function TenantLoginPage() {
  const { tenantSlug } = useParams();
  const [branding, setBranding] = useState<LoginBranding | undefined>(undefined);

  useEffect(() => {
    getPublicApplicationInfo(tenantSlug as string).then((info) => {
      setBranding(info ? { name: info.tenantName, logoUrl: info.logoUrl } : null);
    });
  }, [tenantSlug]);

  if (branding === undefined) {
    return <div className="text-center text-gray-400">Cargando...</div>;
  }

  return (
    <Suspense fallback={null}>
      <LoginForm branding={branding} />
    </Suspense>
  );
}
