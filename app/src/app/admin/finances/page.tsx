'use client';

import React from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Tabs } from 'antd';
import ConceptsTab from './components/ConceptsTab';
import ChargesTab from './components/ChargesTab';
import { getMenuGroupsForRoles } from '@/lib/nav/menu';

const menuGroups = getMenuGroupsForRoles(['admin']);

export default function AdminFinancesPage() {
  return (
    <DashboardLayout
      roleTitle="Admin / Control Escolar"
      userName="Administrador"
      userRole="Administrador"
      menuGroups={menuGroups}
      breadcrumbs={['Admin', 'Finanzas']}
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Finanzas</h1>
          <p className="text-sm text-gray-500">Conceptos y generación de cargos (idempotente por periodo)</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <Tabs
          items={[
            {
              key: 'concepts',
              label: 'Conceptos',
              children: <ConceptsTab />,
            },
            {
              key: 'charges',
              label: 'Cargos',
              children: <ChargesTab />,
            },
          ]}
        />
      </div>
    </DashboardLayout>
  );
}
