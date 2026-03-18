'use client';

import React, { useEffect, useState, useMemo } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { getClassRequests, approveClassRequest, rejectClassRequest } from '@/actions/classRequests';
import { message } from 'antd';

// Match the updated admin menu groups
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
      { key: '2', icon: 'assignment', label: 'Preparación de Clase', href: '/admin/class-prep' },
      { key: '3', icon: 'schedule', label: 'Asistencia', href: '/admin/attendance' },
      { key: '4', icon: 'edit_note', label: 'Exámenes', href: '/admin/exams' },
      { key: '5', icon: 'bookmark', label: 'Gestión de Tareas', href: '/admin/assignments' },
      { key: '6', icon: 'access_time', label: 'Horarios', href: '/admin/schedule' },
      { key: '8', icon: 'mail', label: 'Mensajes', href: '/admin/messages' },
      { key: '9', icon: 'donut_large', label: 'Analítica', href: '/admin/analytics' },
      { key: '10', icon: 'article', label: 'Reportes', href: '/admin/reports' },
    ],
  },
  {
    title: 'Configuración',
    items: [
      { key: '11', icon: 'campaign', label: 'Noticias', href: '/admin/news' },
      { key: '12', icon: 'local_activity', label: 'Actividades', href: '/admin/activities' },
      { key: '13', icon: 'settings', label: 'Configuración', href: '/admin/settings' },
    ],
  },
];

type RequestObj = {
  id: string;
  staffName: string;
  subjectName: string;
  gradeLevelName: string;
  sectionName: string;
  justification: string;
  status: string;
  createdAt: string;
  reviewedAt: string | null;
};

export default function ClassRequestsAdminPage() {
  const [requests, setRequests] = useState<RequestObj[]>([]);
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [loading, setLoading] = useState(true);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const data = await getClassRequests('school-demo');
      setRequests(data as any);
    } catch (error: any) {
      message.error(error.message || 'Error al cargar solicitudes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleApprove = async (id: string) => {
    try {
      const res = await approveClassRequest(id, 'school-demo');
      if ((res as any).error) {
        message.error((res as any).error);
      } else {
        message.success('Solicitud aprobada con éxito');
        loadRequests();
      }
    } catch (error: any) {
      message.error(error.message || 'Error al aprobar solicitud');
    }
  };

  const handleReject = async (id: string) => {
    try {
      const res = await rejectClassRequest(id, 'school-demo');
      if ((res as any).error) {
        message.error((res as any).error);
      } else {
        message.success('Solicitud rechazada con éxito');
        loadRequests();
      }
    } catch (error: any) {
      message.error(error.message || 'Error al rechazar solicitud');
    }
  };

  const counts = useMemo(() => {
    return {
      pending: requests.filter(r => r.status === 'pending').length,
      approved: requests.filter(r => r.status === 'approved').length,
      rejected: requests.filter(r => r.status === 'rejected').length,
    };
  }, [requests]);

  const filteredRequests = useMemo(() => {
    return requests.filter(r => r.status === activeTab);
  }, [requests, activeTab]);

  return (
    <DashboardLayout
      roleTitle="Admin / Control Escolar"
      userName="Administrador"
      userRole="Administrador"
      menuGroups={menuGroups}
      breadcrumbs={['Admin', 'Solicitudes de Clase']}
    >
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Solicitudes de Clase</h1>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-8">
        <div className="flex border-b border-gray-100">
          <button
            onClick={() => setActiveTab('pending')}
            className={`flex-1 py-4 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${activeTab === 'pending' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/30' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
          >
            Pendientes
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${activeTab === 'pending' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>{counts.pending}</span>
          </button>
          <button
            onClick={() => setActiveTab('approved')}
            className={`flex-1 py-4 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${activeTab === 'approved' ? 'text-green-600 border-b-2 border-green-600 bg-green-50/30' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
          >
            Aprobadas
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${activeTab === 'approved' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{counts.approved}</span>
          </button>
          <button
            onClick={() => setActiveTab('rejected')}
            className={`flex-1 py-4 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${activeTab === 'rejected' ? 'text-red-600 border-b-2 border-red-600 bg-red-50/30' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
          >
            Rechazadas
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${activeTab === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>{counts.rejected}</span>
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-gray-500">Cargando solicitudes...</div>
        ) : filteredRequests.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-gray-400 text-3xl">inbox</span>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">Sin solicitudes</h3>
            <p className="text-gray-500 text-sm">No hay solicitudes en esta categoría.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-gray-50/50 text-gray-600 font-medium border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4">Docente</th>
                  <th className="px-6 py-4">Materia</th>
                  <th className="px-6 py-4">Sección</th>
                  <th className="px-6 py-4 w-1/3">Justificación</th>
                  <th className="px-6 py-4">Fecha</th>
                  <th className="px-6 py-4">Estado</th>
                  {activeTab === 'pending' && <th className="px-6 py-4 text-right">Acciones</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-800">
                {filteredRequests.map(req => (
                  <tr key={req.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium">{req.staffName}</td>
                    <td className="px-6 py-4">{req.subjectName}</td>
                    <td className="px-6 py-4">{req.gradeLevelName} {req.sectionName}</td>
                    <td className="px-6 py-4">
                      <span 
                        title={req.justification}
                        className="block w-full max-w-[200px] sm:max-w-xs md:max-w-sm lg:max-w-md xl:max-w-lg truncate text-gray-600"
                      >
                        {req.justification}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {new Date(req.createdAt).toLocaleDateString('es-MX', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-6 py-4">
                      {req.status === 'pending' && <span className="px-2.5 py-1 bg-yellow-100 text-yellow-800 rounded-lg text-xs font-semibold">Pendiente</span>}
                      {req.status === 'approved' && <span className="px-2.5 py-1 bg-green-100 text-green-800 rounded-lg text-xs font-semibold">Aprobada</span>}
                      {req.status === 'rejected' && <span className="px-2.5 py-1 bg-red-100 text-red-800 rounded-lg text-xs font-semibold">Rechazada</span>}
                    </td>
                    {activeTab === 'pending' && (
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleApprove(req.id)}
                            className="px-3 py-1.5 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                          >
                            <span className="material-symbols-outlined text-sm">check</span>
                            Aprobar
                          </button>
                          <button
                            onClick={() => handleReject(req.id)}
                            className="px-3 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                          >
                            <span className="material-symbols-outlined text-sm">close</span>
                            Rechazar
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
