'use client';

import React, { useState } from 'react';
import { createUnit } from '@/actions/planning';

type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  sectionSubjectId: string;
  termId: string;
  tenantSlug: string;
};

export default function NewUnitModal({ isOpen, onClose, sectionSubjectId, termId, tenantSlug }: ModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    
    if (!name || !startDate || !endDate) {
      setError('Por favor completa los campos obligatorios.');
      return;
    }

    setLoading(true);
    try {
      const startDateIso = new Date(startDate).toISOString();
      const endDateIso = new Date(endDate).toISOString();
      const res = await createUnit(sectionSubjectId, termId, name, description, startDateIso, endDateIso, tenantSlug);
      if (res.success) {
        setName('');
        setDescription('');
        setStartDate('');
        setEndDate('');
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
             <span className="material-symbols-outlined text-indigo-600">folder</span>
             Nueva Unidad
          </h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-200 text-gray-600 hover:bg-gray-700 transition-colors">
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
        
        <div className="p-6">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {error && <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-xs rounded-lg">{error}</div>}
            
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Nombre *</label>
              <input 
                value={name} 
                onChange={e => setName(e.target.value)}
                placeholder="Ej. Unidad 1"
                className="w-full border border-gray-200 bg-gray-50 rounded-xl px-4 py-2.5 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors"
                autoFocus
              />
            </div>

            <div>
               <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Descripción</label>
               <textarea 
                 value={description} 
                 onChange={e => setDescription(e.target.value)}
                 rows={2}
                 className="w-full border border-gray-200 bg-gray-50 rounded-xl px-4 py-2.5 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors resize-none"
               />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Inicio *</label>
                <input 
                  type="date"
                  value={startDate} 
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full border border-gray-200 bg-gray-50 rounded-xl px-4 py-2.5 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Fin *</label>
                <input 
                  type="date"
                  value={endDate} 
                  onChange={e => setEndDate(e.target.value)}
                  className="w-full border border-gray-200 bg-gray-50 rounded-xl px-4 py-2.5 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors cursor-pointer"
                />
              </div>
            </div>

            <button type="submit" disabled={loading} className="w-full mt-4 py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-lg shadow-indigo-600/20">
              {loading ? 'Guardando...' : 'Crear Unidad'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
