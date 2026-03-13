'use client';

import React, { useEffect, useState, useRef } from 'react';
import { getAttachments, uploadAttachment, deleteAttachment } from '@/actions/attachments';
import { message } from 'antd';

export function TopicAttachments({ topicId }: { topicId: string }) {
  const [attachments, setAttachments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchAttachments = async () => {
    try {
      const data = await getAttachments('topic', topicId);
      setAttachments(data);
    } catch (error) {
      console.error('Error fetching attachments:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttachments();
  }, [topicId]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Optional MVP Check: Limit size to 10MB
    if (file.size > 10 * 1024 * 1024) {
      message.error('El archivo es demasiado grande (máx 10MB).');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('ownerType', 'topic');
      formData.append('ownerId', topicId);

      const res = await uploadAttachment(formData);
      if ('error' in res) {
        message.error((res as any).error);
      } else {
        message.success('Archivo subido correctamente');
        fetchAttachments();
      }
    } catch (error: any) {
      message.error('Error al subir el archivo');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Seguro de eliminar este material?')) return;
    try {
      const res = await deleteAttachment(id);
      if ('error' in res) {
        message.error((res as any).error);
      } else {
        message.success('Material eliminado');
        setAttachments(prev => prev.filter(a => a.id !== id));
      }
    } catch (error) {
      message.error('Error al eliminar');
    }
  };

  // Helper for icons based on content type
  const getIcon = (contentType: string | null) => {
    if (!contentType) return 'insert_drive_file';
    if (contentType.includes('pdf')) return 'picture_as_pdf';
    if (contentType.includes('word') || contentType.includes('document')) return 'description';
    if (contentType.includes('presentation') || contentType.includes('powerpoint')) return 'slideshow';
    if (contentType.includes('image')) return 'image';
    return 'insert_drive_file';
  };

  return (
    <div className="mt-3 pl-4 border-l-2 border-indigo-100">
      <div className="flex items-center justify-between mb-2">
        <h5 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Material de Apoyo</h5>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1 disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-[14px]">
            {uploading ? 'hourglass_empty' : 'upload_file'}
          </span>
          {uploading ? 'Subiendo...' : 'Adjuntar archivo'}
        </button>
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept=".pdf,.doc,.docx,.ppt,.pptx,image/*"
          onChange={handleFileChange}
        />
      </div>

      {loading ? (
        <div className="text-xs text-gray-400">Cargando material...</div>
      ) : attachments.length === 0 ? (
        <div className="text-xs text-gray-400 italic">No hay archivos adjuntos.</div>
      ) : (
        <div className="flex flex-col gap-2 mt-2">
          {attachments.map((a) => (
            <div key={a.id} className="flex items-center justify-between bg-white border border-gray-100 rounded-md p-2 shadow-sm hover:border-indigo-200 transition-colors group">
              <a 
                href={a.fileKey} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 flex-1 min-w-0"
                title={a.fileName}
              >
                <span className="material-symbols-outlined text-gray-400 text-sm group-hover:text-indigo-500">
                  {getIcon(a.contentType)}
                </span>
                <span className="text-xs text-gray-700 truncate group-hover:text-indigo-700 font-medium">
                  {a.fileName}
                </span>
                <span className="text-[10px] text-gray-400 ml-1">
                  ({(a.sizeBytes / 1024).toFixed(1)} KB)
                </span>
              </a>
              <button
                onClick={() => handleDelete(a.id)}
                className="text-gray-300 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Eliminar material"
              >
                <span className="material-symbols-outlined text-[14px]">delete</span>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
