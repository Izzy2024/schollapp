'use client';

import { useState, useEffect } from 'react';
import { getSubjectsAndSections, createClassRequest } from '@/actions/classRequests';
import { getDemoStaffId } from '@/actions/teacher';
import { message } from 'antd';

export default function ClassRequestModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const [subjects, setSubjects] = useState<{ id: string, name: string }[]>([]);
  const [sections, setSections] = useState<{ id: string, displayName: string }[]>([]);
  const [staffId, setStaffId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [subjectId, setSubjectId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [justification, setJustification] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      Promise.all([
        getSubjectsAndSections('school-demo'),
        getDemoStaffId('school-demo')
      ]).then(([data, staffIdResult]) => {
        setSubjects(data.subjects);
        setSections(data.sections);
        setStaffId(staffIdResult);
        setLoading(false);
      }).catch(err => {
        console.error(err);
        message.error('Error al cargar datos');
        setLoading(false);
      });
    } else {
      setSubjectId('');
      setSectionId('');
      setJustification('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectId || !sectionId) {
      return message.error('Selecciona materia y sección');
    }
    if (justification.length < 20) {
      return message.error('La justificación debe tener al menos 20 caracteres');
    }
    if (!staffId) {
       return message.error('Error de sesión: no se encontró al docente');
    }

    setSubmitting(true);
    try {
      const res = await createClassRequest(staffId, subjectId, sectionId, justification, 'school-demo');
      if (res.success) {
        message.success('✓ Solicitud enviada al director para aprobación');
        onClose();
      } else {
        message.error(res.error || 'Error al enviar solicitud');
      }
    } catch (err) {
      console.error(err);
      message.error('Error al enviar solicitud');
    }
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden animate-fade-in-up">
        
        <div className="p-6 border-b border-emerald-100 bg-emerald-50/50">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-2xl">add_box</span>
          </div>
          <h2 className="text-xl font-bold text-slate-800">Solicitar Nueva Clase</h2>
          <p className="text-sm text-slate-500 mt-1">Envía una solicitud para que se te asigne una nueva materia y sección.</p>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-500">Cargando...</div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Materia</label>
              <select 
                value={subjectId} 
                onChange={e => setSubjectId(e.target.value)}
                required
                className="w-full h-11 px-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50 text-slate-700 outline-none transition-all"
              >
                <option value="">-- Seleccionar --</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Sección (Grado)</label>
              <select 
                value={sectionId} 
                onChange={e => setSectionId(e.target.value)}
                required
                className="w-full h-11 px-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50 text-slate-700 outline-none transition-all"
              >
                <option value="">-- Seleccionar --</option>
                {sections.map(s => <option key={s.id} value={s.id}>{s.displayName}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Justificación</label>
              <textarea 
                value={justification} 
                onChange={e => setJustification(e.target.value)}
                required
                rows={3}
                placeholder="Explica brevemente por qué solicitas esta clase (mínimo 20 caracteres)..."
                className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50 text-slate-700 outline-none transition-all resize-none"
              ></textarea>
            </div>

            <div className="flex gap-3 pt-4 border-t border-slate-100">
              <button 
                type="button" 
                onClick={onClose}
                disabled={submitting}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-colors"
               >
                Cancelar
              </button>
              <button 
                type="submit" 
                disabled={submitting}
                className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition-colors flex items-center justify-center disabled:opacity-70"
              >
                {submitting ? 'Enviando...' : 'Enviar Solicitud'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
