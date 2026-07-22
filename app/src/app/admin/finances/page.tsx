'use client';

import React from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Tabs } from 'antd';
import ConceptsTab from './components/ConceptsTab';
import ChargesTab from './components/ChargesTab';
import InvoicesTab from './components/InvoicesTab';
import PaymentsTab from './components/PaymentsTab';
import DelinquencyTab from './components/DelinquencyTab';
import DiscountsTab from './components/DiscountsTab';
import PlansTab from './components/PlansTab';
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
          <p className="text-sm text-gray-500">Gestión de conceptos, cargos, facturas y cobranza</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <Tabs
          items={[
            {
              key: 'invoices',
              label: 'Facturas',
              children: <InvoicesTab />,
            },
            {
              key: 'payments',
              label: 'Pagos',
              children: <PaymentsTab />,
            },
            {
              key: 'delinquency',
              label: 'Morosidad',
              children: <DelinquencyTab />,
            },
            {
              key: 'charges',
              label: 'Cargos',
              children: <ChargesTab />,
            },
            {
              key: 'concepts',
              label: 'Conceptos',
              children: <ConceptsTab />,
            },
            {
              key: 'discounts',
              label: 'Descuentos',
              children: <DiscountsTab />,
            },
            {
              key: 'plans',
              label: 'Planes de pago',
              children: <PlansTab />,
            },
          ]}
        />
      </div>
    </DashboardLayout>
  );
}
