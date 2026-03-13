'use client';

import React, { useState } from 'react';
import { createTopic } from '@/actions/planning';

type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  unitId: string;
  tenantSlug: string;
};

export default function NewTopicModal({ isOpen, onClose, unitId, tenantSlug }: ModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    
    if (!name || !date) {
      setError('Por favor completa los campos obligatorios.');
      return;
    }

    setLoading(true);
    try {
      const dateIso = new Date(date).toISOString();
      const res = await createTopic(unitId, name, description, dateIso, tenantSlug);
      if (res.success) {
        setName('');
        setDescription('');
        setDate('');
        onClose();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error inesperado.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all scale-100">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
             <span className="material-symbols-outlined text-indigo-600">note_add</span>
             Nuevo Tema
          </h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-200 text-gray-600 hover:bg-gray-700 transition-colors">
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
        
        <div className="p-6">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {error && <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-xs rounded-lg">{error}</div>}
            
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Título del Tema *</label>
              <input 
                value={name} 
                onChange={e => setName(e.target.value)}
                placeholder="Ej. Ecuaciones Lineales"
                className="w-full border border-gray-200 bg-gray-50 rounded-xl px-4 py-2.5 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors"
                autoFocus
              />
            </div>

            <div>
               <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Descripción (Opcional)</label>
               <textarea 
                 value={description} 
                 onChange={e => setDescription(e.target.value)}
                 placeholder="Breve descripción del objetivo..."
                 rows={3}
                 className="w-full border border-gray-200 bg-gray-50 rounded-xl px-4 py-2.5 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors resize-none"
               />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Fecha *</label>
              <input 
                type="date"
                value={date} 
                onChange={e => setDate(e.target.value)}
                className="w-full border border-gray-200 bg-gray-50 rounded-xl px-4 py-2.5 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors cursor-pointer"
              />
            </div>

            <button type="submit" disabled={loading} className="w-full mt-4 py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-lg shadow-indigo-600/20">
              {loading ? 'Guardando...' : 'Crear Tema'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
