'use client';

import { useState, useEffect } from 'react';
import { getAttendanceSession, saveAttendanceSession } from '@/actions/attendance';
import { message } from 'antd';

export default function AttendanceDrawer({
  sectionSubjectId,
  date,
  isOpen,
  onClose,
  onSaved
}: {
  sectionSubjectId: string,
  date: string,
  isOpen: boolean,
  onClose: () => void,
  onSaved: () => void
}) {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen && sectionSubjectId && date) {
      setLoading(true);
      getAttendanceSession(sectionSubjectId, date, 'school-demo')
        .then(res => {
          const initRecords = res.records.map((r: any) => ({
             ...r,
             status: r.status === null ? 'present' : r.status
          }));
          setRecords(initRecords);
          setLoading(false);
        })
        .catch(err => {
          console.error(err);
          setLoading(false);
        });
    }
  }, [isOpen, sectionSubjectId, date]);

  if (!isOpen) return null;

  const markAll = (status: string) => {
    setRecords(records.map(r => ({ ...r, status })));
  };

  const updateStatus = (studentId: string, status: string) => {
    setRecords(records.map(r => r.studentId === studentId ? { ...r, status } : r));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await saveAttendanceSession(sectionSubjectId, date, records, 'school-demo');
      if (res.success) {
        message.success('Asistencia guardada');
        onSaved();
        onClose();
      }
    } catch(err) {
      console.error(err);
      message.error('Error al guardar asistencia');
    }
    setSaving(false);
  };

  const summary = records.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-slide-in-right">
        
        <div className="p-6 border-b border-slate-200">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-slate-800">Tomar Asistencia</h2>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
          <div className="text-sm text-slate-600 mb-4">{new Date(date).toLocaleDateString()}</div>
          
          <button onClick={() => markAll('present')} className="w-full py-2 bg-indigo-50 text-indigo-700 font-medium rounded-lg hover:bg-indigo-100 transition-colors">
            Marcar todos presentes
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {loading ? (
             <div className="text-center py-10 text-slate-500">Cargando...</div>
          ) : (
            records.map(rec => (
              <div key={rec.studentId} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-slate-200 bg-slate-50 gap-3">
                <span className="font-medium text-slate-800">{rec.studentName}</span>
                <div className="flex gap-1">
                  <button 
                    onClick={() => updateStatus(rec.studentId, 'present')} 
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${rec.status === 'present' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}
                  >P</button>
                  <button 
                    onClick={() => updateStatus(rec.studentId, 'absent')} 
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${rec.status === 'absent' ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}
                  >F</button>
                  <button 
                    onClick={() => updateStatus(rec.studentId, 'late')} 
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${rec.status === 'late' ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}
                  >R</button>
                  <button 
                    onClick={() => updateStatus(rec.studentId, 'excused')} 
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${rec.status === 'excused' ? 'bg-blue-100 text-blue-700 border border-blue-200' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}
                  >J</button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-6 border-t border-slate-200 bg-white">
          <div className="flex justify-between items-center text-sm font-medium text-slate-600 mb-4 px-2">
            <span>P: {summary.present || 0}</span>
            <span>F: {summary.absent || 0}</span>
            <span>R: {summary.late || 0}</span>
            <span>J: {summary.excused || 0}</span>
          </div>
          <button 
            onClick={handleSave} 
            disabled={saving || loading}
            className="w-full py-3 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-70 flex justify-center items-center gap-2"
          >
            {saving ? 'Guardando...' : 'Guardar Asistencia'}
          </button>
        </div>

      </div>
    </div>
  );
}
