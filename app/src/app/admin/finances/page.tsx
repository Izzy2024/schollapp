'use client';

import React from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Tabs } from 'antd';
import ConceptsTab from './components/ConceptsTab';
import ChargesTab from './components/ChargesTab';

const menuGroups = [
  {
    title: 'Menú Principal',
    items: [
      { key: '1', icon: 'home', label: 'Vista General', href: '/admin' },
      { key: 'subjects', icon: 'menu_book', label: 'Materias', href: '/admin/subjects' },
      { key: 'classes', icon: 'class', label: 'Gestión de Clases', href: '/admin/classes' },
      { key: 'staff', icon: 'badge', label: 'Docentes / Staff', href: '/admin/staff' },
      { key: 'class-requests', icon: 'pending_actions', label: 'Solicitudes de Clase', href: '/admin/class-requests' },
      { key: 'students', icon: 'people', label: 'Estudiantes', href: '/admin/students' },
      { key: 'enrollment', icon: 'how_to_reg', label: 'Inscripciones', href: '/admin/enrollment' },
      { key: 'attendance', icon: 'schedule', label: 'Asistencia', href: '/admin/attendance' },
      { key: 'announcements', icon: 'campaign', label: 'Comunicados', href: '/admin/announcements' },
      { key: 'reports', icon: 'article', label: 'Reportes', href: '/admin/reports' },
      { key: 'finances', icon: 'payments', label: 'Finanzas', href: '/admin/finances' },
    ],
  },
  {
    title: 'Configuración',
    items: [{ key: 'academic', icon: 'calendar_month', label: 'Académico', href: '/admin/academic' }],
  },
];

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
