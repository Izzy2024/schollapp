'use client';

import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { message } from 'antd';
import { getMenuGroupsForRoles } from '@/lib/nav/menu';

const menuGroups = getMenuGroupsForRoles(['parent']);

type Attachment = { id: string; fileName: string; fileType: string; createdAt: string; url: string };

export default function ParentDocumentsPage() {
  const [documents, setDocuments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { getAttachments } = await import('@/actions/attachments');
        // Get school-wide announcements as proxy for documents
        // Attachments need ownerType/ownerId — use 'tenant' scope
        const data = await getAttachments('tenant', 'general');
        setDocuments((data || []).map((d: any) => ({
          id: d.id, fileName: d.fileName, fileType: d.contentType || '', createdAt: d.createdAt, url: d.fileKey,
        })));
      } catch (e: any) {
        // If no attachments found, show empty state (not error)
        setDocuments([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const fileIcon = (type: string) => {
    if (type?.includes('pdf')) return 'picture_as_pdf';
    if (type?.includes('image')) return 'image';
    if (type?.includes('word') || type?.includes('doc')) return 'description';
    return 'draft';
  };

  return (
    <DashboardLayout roleTitle="Tutor / Padre" userName="Familia" userRole="Tutor" menuGroups={menuGroups} breadcrumbs={['Familia', 'Documentos']}>
      <div className="flex items-center gap-4 mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Documentos</h1>
        <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-sm font-bold">{documents.length} archivos</span>
      </div>

      {loading ? (
        <div className="py-16 text-center text-gray-400"><span className="material-symbols-outlined text-4xl text-gray-200 block mb-3 animate-spin">progress_activity</span>Cargando...</div>
      ) : documents.length === 0 ? (
        <div className="py-12 text-center bg-white rounded-2xl border border-dashed border-gray-200">
          <span className="material-symbols-outlined text-5xl text-gray-200 mb-4 block">folder_open</span>
          <p className="text-gray-500">No hay documentos disponibles.</p>
          <p className="text-sm text-gray-400 mt-1">Los documentos compartidos por la escuela aparecerán aquí.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {documents.map(doc => (
            <div key={doc.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4 hover:border-gray-300 transition-all">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-xl">{fileIcon(doc.fileType)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-gray-900 truncate">{doc.fileName}</div>
                <div className="text-xs text-gray-400 mt-1">
                  {new Date(doc.createdAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
                  {doc.fileType && <> • {doc.fileType}</>}
                </div>
              </div>
              {doc.url && (
                <a href={doc.url} target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-emerald-50 text-emerald-700 text-sm font-semibold rounded-xl hover:bg-emerald-100 transition-colors flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm">download</span>
                  Descargar
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
