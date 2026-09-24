'use client';

import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { App } from 'antd';
import { getMenuGroupsForRoles } from '@/lib/nav/menu';

const menuGroups = getMenuGroupsForRoles(['student']);

type Peer = { id: string; firstName: string; lastName: string; studentCode: string };

export default function StudentPeersPage() {
  const { message } = App.useApp();
  const [peers, setPeers] = useState<Peer[]>([]);
  const [sectionName, setSectionName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { getStudentPeers } = await import('@/actions/studentQueries');
        const data = await getStudentPeers();
        setPeers(data.peers as Peer[]);
        setSectionName(data.sectionName);
      } catch (e: any) {
        message.error(e.message || 'Error cargando compañeros');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <DashboardLayout roleTitle="Alumno" userName="Alumno" userRole="Estudiante" menuGroups={menuGroups} breadcrumbs={['Alumno', 'Compañeros']}>
      <div className="flex items-center gap-4 mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Compañeros</h1>
        {sectionName && <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-bold">{sectionName}</span>}
      </div>

      {loading ? (
        <div className="py-16 text-center text-gray-400"><span className="material-symbols-outlined text-4xl text-gray-200 block mb-3 animate-spin">progress_activity</span>Cargando...</div>
      ) : peers.length === 0 ? (
        <div className="py-12 text-center bg-white rounded-2xl border border-dashed border-gray-200">
          <span className="material-symbols-outlined text-5xl text-gray-200 mb-4 block">groups</span>
          <p className="text-gray-500">No hay compañeros en tu grupo.</p>
        </div>
      ) : (
        <>
          <div className="mb-4 text-sm text-gray-500">{peers.length} compañeros</div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {peers.map(p => (
              <div key={p.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center text-sm font-bold flex-shrink-0">
                  {p.firstName[0]}{p.lastName[0]}
                </div>
                <div>
                  <div className="font-medium text-gray-900 text-sm">{p.firstName} {p.lastName}</div>
                  {p.studentCode && <div className="text-xs text-gray-400">{p.studentCode}</div>}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
