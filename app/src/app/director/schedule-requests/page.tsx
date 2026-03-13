'use client';

import { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { getScheduleRequests, approveScheduleRequest, rejectScheduleRequest } from '@/actions/scheduleRequests';
import { message } from 'antd';

const menuGroups = [
  {
    title: 'Consola Directiva',
    items: [
      { key: '1', icon: 'analytics', label: 'Vista General', href: '/director' },
      { key: 'dir-enrollment', icon: 'how_to_reg', label: 'Inscripciones', href: '/director/enrollment' },
      { key: 'dir-class-requests', icon: 'pending_actions', label: 'Solicitudes de Clase', href: '/director/class-requests' },
      { key: 'dir-schedule-requests', icon: 'schedule_send', label: 'Solicitudes de Horario', href: '/director/schedule-requests' },
      { key: '5', icon: 'inventory_2', label: 'Gestión de Recursos', href: '/director/resources' },
    ],
  },
];

const DAY_LABEL: Record<number, string> = {
  1: 'Lunes',
  2: 'Martes',
  3: 'Miércoles',
  4: 'Jueves',
  5: 'Viernes',
  6: 'Sábado',
  0: 'Domingo'
};

type Req = {
  id: string;
  status: 'pending' | 'approved' | 'rejected';
  type: 'new' | 'change';
  staffName: string;
  subjectName: string;
  sectionName: string;
  proposedDayOfWeek: number;
  proposedStartTime: string;
  proposedEndTime: string;
  proposedRoom: string | null;
  alternativeDayOfWeek: number | null;
  alternativeStartTime: string | null;
  alternativeEndTime: string | null;
  alternativeRoom: string | null;
  reason: string;
};

export default function ScheduleRequestsDirectorPage() {
  const [requests, setRequests] = useState<Req[]>([]);
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getScheduleRequests('school-demo');
      setRequests(res as Req[]);
    } catch (error: any) {
      message.error(error?.message || 'Error al cargar solicitudes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => requests.filter(r => r.status === activeTab), [requests, activeTab]);

  const approve = async (id: string) => {
    const result = await approveScheduleRequest(id, 'school-demo');
    if ((result as any).error) {
      message.error((result as any).error);
      return;
    }
    message.success('Solicitud aprobada y horario aplicado.');
    load();
  };

  const reject = async (id: string) => {
    const result = await rejectScheduleRequest(id, 'No se ajusta a disponibilidad institucional', 'school-demo');
    if ((result as any).error) {
      message.error((result as any).error);
      return;
    }
    message.success('Solicitud rechazada.');
    load();
  };

  const counts = {
    pending: requests.filter(r => r.status === 'pending').length,
    approved: requests.filter(r => r.status === 'approved').length,
    rejected: requests.filter(r => r.status === 'rejected').length,
  };

  return (
    <DashboardLayout
      roleTitle="Dirección / Analítica"
      userName="Dr. A. Richardson"
      userRole="Director de Educación"
      menuGroups={menuGroups}
      breadcrumbs={['Director', 'Solicitudes de Horario']}
    >
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Solicitudes de Horario</h1>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-8">
        <div className="flex border-b border-gray-100">
          {(['pending', 'approved', 'rejected'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-4 text-sm font-medium transition-colors ${activeTab === tab ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/30' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
            >
              {tab === 'pending' ? 'Pendientes' : tab === 'approved' ? 'Aprobadas' : 'Rechazadas'} ({counts[tab]})
            </button>
          ))}
        </div>

        {loading ? (
          <div className="p-12 text-center text-gray-500">Cargando solicitudes...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-gray-500">No hay solicitudes en esta categoría.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-gray-50/50 text-gray-600 font-medium border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4">Docente</th>
                  <th className="px-6 py-4">Clase</th>
                  <th className="px-6 py-4">Tipo</th>
                  <th className="px-6 py-4">Propuesta</th>
                  <th className="px-6 py-4">Alternativa</th>
                  <th className="px-6 py-4">Motivo</th>
                  {activeTab === 'pending' && <th className="px-6 py-4 text-right">Acciones</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-800">
                {filtered.map(req => (
                  <tr key={req.id} className="hover:bg-gray-50/50 transition-colors align-top">
                    <td className="px-6 py-4 font-medium">{req.staffName}</td>
                    <td className="px-6 py-4">{req.subjectName} - {req.sectionName}</td>
                    <td className="px-6 py-4">{req.type === 'new' ? 'Nuevo horario' : 'Cambio de horario'}</td>
                    <td className="px-6 py-4">{DAY_LABEL[req.proposedDayOfWeek]} {req.proposedStartTime}-{req.proposedEndTime} {req.proposedRoom ? `(${req.proposedRoom})` : ''}</td>
                    <td className="px-6 py-4">{req.alternativeDayOfWeek ? `${DAY_LABEL[req.alternativeDayOfWeek]} ${req.alternativeStartTime}-${req.alternativeEndTime}${req.alternativeRoom ? ` (${req.alternativeRoom})` : ''}` : '—'}</td>
                    <td className="px-6 py-4 max-w-[260px] whitespace-normal">{req.reason}</td>
                    {activeTab === 'pending' && (
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => approve(req.id)} className="px-3 py-1.5 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg text-xs font-semibold">Aprobar</button>
                          <button onClick={() => reject(req.id)} className="px-3 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg text-xs font-semibold">Rechazar</button>
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
