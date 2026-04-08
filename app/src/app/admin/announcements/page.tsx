'use client';

import React, { useEffect, useState, useMemo } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import {
  getAnnouncements,
  createAnnouncement,
  publishAnnouncement,
  deleteAnnouncement,
  AnnouncementRow,
} from '@/actions/announcements';
import { getSectionsForAttendance } from '@/actions/attendance';
import { message } from 'antd';
import { getMenuGroupsForRoles } from '@/lib/nav/menu';

const menuGroups = getMenuGroupsForRoles(['admin']);

type Section = { id: string; name: string; gradeLevelId: string; gradeLevelName: string; enrolledCount: number };

const TARGET_LABELS: Record<string, string> = {
  all: 'Toda la escuela',
  grade: 'Un grado específico',
  section: 'Un grupo específico',
};

function targetSummary(row: AnnouncementRow, sections: Section[]): string {
  const t = row.targets[0];
  if (!t) return 'Sin destinatario';
  if (t.targetType === 'all') return 'Toda la escuela';
  if (t.targetType === 'grade') {
    const sec = sections.find(s => s.gradeLevelId === t.targetId);
    return sec ? sec.gradeLevelName : t.targetId || '—';
  }
  if (t.targetType === 'section') {
    const sec = sections.find(s => s.id === t.targetId);
    return sec ? `${sec.gradeLevelName} — Secc. "${sec.name}"` : '—';
  }
  return t.targetType;
}

// ─── Modal ────────────────────────────────────────────────────────────────────

function NewAnnouncementModal({
  onClose,
  onCreated,
  sections,
}: {
  onClose: () => void;
  onCreated: () => void;
  sections: Section[];
}) {
  const [form, setForm] = useState({
    title: '',
    body: '',
    publishNow: true,
    targetType: 'all' as 'all' | 'grade' | 'section',
    targetId: '',
  });
  const [saving, setSaving] = useState(false);

  const gradeOptions = useMemo(
    () => Array.from(new Map(sections.map(s => [s.gradeLevelId, s.gradeLevelName])).entries()),
    [sections]
  );

  const sectionOptions = useMemo(
    () => sections.filter(s => form.targetType === 'section'),
    [sections, form.targetType]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return message.warning('El título es requerido');
    if (!form.body.trim()) return message.warning('El contenido es requerido');
    if (form.targetType !== 'all' && !form.targetId) return message.warning('Selecciona el destinatario');

    setSaving(true);
    try {
      const res = await createAnnouncement({
        title: form.title,
        body: form.body,
        publishNow: form.publishNow,
        targetType: form.targetType,
        targetId: form.targetId || undefined,
      });
      if ('error' in res && res.error) {
        message.error(res.error as string);
      } else {
        message.success('Comunicado creado exitosamente');
        onCreated();
        onClose();
      }
    } catch (e: any) {
      message.error(e.message || 'Error al crear comunicado');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
              <span className="material-symbols-outlined">campaign</span>
            </div>
            <h3 className="text-lg font-bold text-gray-900">Nuevo Comunicado</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Título <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              placeholder="Ej. Aviso de Día Festivo"
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 focus:bg-white transition-all text-sm"
              maxLength={120}
            />
          </div>

          {/* Body */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Contenido <span className="text-red-400">*</span>
            </label>
            <textarea
              value={form.body}
              onChange={e => setForm({ ...form, body: e.target.value })}
              rows={5}
              placeholder="Escribe aquí el mensaje completo del comunicado..."
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 focus:bg-white transition-all text-sm resize-none"
            />
            <div className="text-xs text-gray-400 mt-1 text-right">{form.body.length} caracteres</div>
          </div>

          {/* Target */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Destinatarios</label>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {(['all', 'grade', 'section'] as const).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setForm({ ...form, targetType: t, targetId: '' })}
                  className={`p-3 rounded-xl border-2 text-sm font-medium transition-all text-left ${
                    form.targetType === t
                      ? 'border-gray-900 bg-gray-900 text-white'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-400'
                  }`}
                >
                  <span className="material-symbols-outlined text-sm block mb-1">
                    {t === 'all' ? 'public' : t === 'grade' ? 'groups_2' : 'group'}
                  </span>
                  {TARGET_LABELS[t]}
                </button>
              ))}
            </div>

            {form.targetType === 'grade' && (
              <select
                value={form.targetId}
                onChange={e => setForm({ ...form, targetId: e.target.value })}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              >
                <option value="">-- Selecciona un grado --</option>
                {gradeOptions.map(([id, name]) => (
                  <option key={id} value={id}>{name}</option>
                ))}
              </select>
            )}

            {form.targetType === 'section' && (
              <select
                value={form.targetId}
                onChange={e => setForm({ ...form, targetId: e.target.value })}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              >
                <option value="">-- Selecciona un grupo --</option>
                {sections.map(s => (
                  <option key={s.id} value={s.id}>{s.gradeLevelName} — Sección &quot;{s.name}&quot;</option>
                ))}
              </select>
            )}
          </div>

          {/* Publish opt */}
          <label className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-100 rounded-xl cursor-pointer hover:bg-amber-100/60 transition-colors">
            <input
              type="checkbox"
              checked={form.publishNow}
              onChange={e => setForm({ ...form, publishNow: e.target.checked })}
              className="w-4 h-4 rounded border-gray-300 text-amber-500 focus:ring-amber-400"
            />
            <div>
              <div className="text-sm font-semibold text-amber-900">Publicar inmediatamente</div>
              <div className="text-xs text-amber-600">Si no marcas esta opción, quedará como borrador.</div>
            </div>
          </label>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-between items-center bg-gray-50/50">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-800 transition-colors">
            Cancelar
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2 text-sm font-bold text-white bg-gray-900 rounded-xl hover:bg-gray-800 transition-colors shadow-lg shadow-gray-900/20 disabled:opacity-60"
          >
            {saving ? (
              <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
            ) : (
              <span className="material-symbols-outlined text-sm">send</span>
            )}
            {saving ? 'Publicando...' : form.publishNow ? 'Publicar' : 'Guardar borrador'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Preview modal ────────────────────────────────────────────────────────────

function AnnouncementPreview({
  row,
  sections,
  onClose,
  onPublish,
  onDelete,
}: {
  row: AnnouncementRow;
  sections: Section[];
  onClose: () => void;
  onPublish: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-2">
            {row.publishedAt ? (
              <span className="px-2.5 py-1 bg-green-100 text-green-800 text-xs font-bold rounded-lg">Publicado</span>
            ) : (
              <span className="px-2.5 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-lg">Borrador</span>
            )}
            <span className="text-xs text-gray-400">{targetSummary(row, sections)}</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-3">{row.title}</h3>
          <p className="text-gray-600 text-sm whitespace-pre-wrap leading-relaxed">{row.body}</p>
          <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
            <span>
              Creado {new Date(row.createdAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
              {row.createdByName ? ` por ${row.createdByName}` : ''}
            </span>
            {row.publishedAt && (
              <span>Publicado {new Date(row.publishedAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}</span>
            )}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-between items-center bg-gray-50/50">
          <button
            onClick={() => { onDelete(row.id); onClose(); }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg text-sm font-medium transition-colors"
          >
            <span className="material-symbols-outlined text-sm">delete</span>
            Eliminar
          </button>
          {!row.publishedAt && (
            <button
              onClick={() => { onPublish(row.id); onClose(); }}
              className="flex items-center gap-2 px-5 py-2 text-sm font-bold text-white bg-green-600 rounded-xl hover:bg-green-700 transition-colors shadow-lg shadow-green-700/20"
            >
              <span className="material-symbols-outlined text-sm">publish</span>
              Publicar ahora
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AnnouncementsPage() {
  const [rows, setRows] = useState<AnnouncementRow[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [preview, setPreview] = useState<AnnouncementRow | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'published' | 'draft'>('all');

  const load = async () => {
    setLoading(true);
    try {
      const [data, secs] = await Promise.all([getAnnouncements(), getSectionsForAttendance()]);
      setRows(data);
      setSections(secs);
    } catch (e: any) {
      message.error(e.message || 'Error cargando comunicados');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handlePublish = async (id: string) => {
    try {
      await publishAnnouncement(id);
      message.success('Comunicado publicado');
      load();
    } catch (e: any) { message.error(e.message); }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteAnnouncement(id);
      message.success('Comunicado eliminado');
      load();
    } catch (e: any) { message.error(e.message); }
  };

  const filtered = useMemo(() => {
    if (filterStatus === 'published') return rows.filter(r => r.publishedAt);
    if (filterStatus === 'draft') return rows.filter(r => !r.publishedAt);
    return rows;
  }, [rows, filterStatus]);

  const stats = useMemo(() => ({
    total: rows.length,
    published: rows.filter(r => r.publishedAt).length,
    drafts: rows.filter(r => !r.publishedAt).length,
  }), [rows]);

  return (
    <DashboardLayout
      roleTitle="Admin / Control Escolar"
      userName="Administrador"
      userRole="Administrador"
      menuGroups={menuGroups}
      breadcrumbs={['Admin', 'Comunicados']}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-900">Comunicados</h1>
          <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-sm font-bold">
            {stats.published} publicados
          </span>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-bold rounded-xl hover:bg-gray-800 transition-colors shadow-lg"
        >
          <span className="material-symbols-outlined text-lg">add</span>
          Nuevo Comunicado
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        {[
          { label: 'Total', value: stats.total, icon: 'campaign', color: 'bg-gray-50 text-gray-600' },
          { label: 'Publicados', value: stats.published, icon: 'check_circle', color: 'bg-green-50 text-green-600' },
          { label: 'Borradores', value: stats.drafts, icon: 'draft', color: 'bg-amber-50 text-amber-600' },
        ].map(s => (
          <div key={s.label} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
            <div className={`p-3 rounded-xl ${s.color}`}>
              <span className="material-symbols-outlined text-2xl">{s.icon}</span>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-500">{s.label}</div>
              <div className="text-3xl font-bold text-gray-900">{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filter toggles */}
      <div className="flex items-center gap-2 mb-5">
        {(['all', 'published', 'draft'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilterStatus(f)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
              filterStatus === f ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {f === 'all' ? 'Todos' : f === 'published' ? 'Publicados' : 'Borradores'}
          </button>
        ))}
        <span className="ml-auto text-sm text-gray-400">{filtered.length} resultado{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* List */}
      {loading ? (
        <div className="py-16 text-center text-gray-400">
          <span className="material-symbols-outlined text-4xl text-gray-200 block mb-3 animate-spin">progress_activity</span>
          Cargando comunicados...
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-2xl border border-dashed border-gray-200">
          <span className="material-symbols-outlined text-5xl text-gray-200 mb-4 block">campaign</span>
          <p className="text-gray-500 mb-6">
            {filterStatus === 'draft' ? 'No hay borradores pendientes.' : 'No hay comunicados todavía.'}
          </p>
          <button
            onClick={() => setShowNew(true)}
            className="px-5 py-2.5 bg-gray-900 text-white text-sm font-bold rounded-xl hover:bg-gray-800 transition-colors"
          >
            Crear primer comunicado
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(row => (
            <div
              key={row.id}
              onClick={() => setPreview(row)}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 cursor-pointer hover:border-gray-300 hover:shadow-md transition-all group"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  {/* Color indicator */}
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    row.publishedAt ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'
                  }`}>
                    <span className="material-symbols-outlined text-lg">
                      {row.publishedAt ? 'mark_email_read' : 'draft'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-gray-900 truncate group-hover:text-indigo-700 transition-colors">
                        {row.title}
                      </h3>
                      {row.publishedAt ? (
                        <span className="flex-shrink-0 px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold uppercase rounded-full">
                          Publicado
                        </span>
                      ) : (
                        <span className="flex-shrink-0 px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold uppercase rounded-full">
                          Borrador
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 line-clamp-2">{row.body}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[12px]">group</span>
                        {targetSummary(row, sections)}
                      </span>
                      <span>&bull;</span>
                      <span>
                        {new Date(row.createdAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                      {row.createdByName && (
                        <>
                          <span>&bull;</span>
                          <span>{row.createdByName}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {!row.publishedAt && (
                    <button
                      onClick={e => { e.stopPropagation(); handlePublish(row.id); }}
                      className="px-3 py-1.5 bg-green-50 text-green-700 text-xs font-semibold rounded-lg hover:bg-green-100 transition-colors"
                    >
                      Publicar
                    </button>
                  )}
                  <button
                    onClick={e => { e.stopPropagation(); if (confirm('¿Eliminar este comunicado?')) handleDelete(row.id); }}
                    className="p-1.5 text-gray-300 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    <span className="material-symbols-outlined text-lg">delete</span>
                  </button>
                  <span className="material-symbols-outlined text-gray-300 group-hover:text-gray-500 transition-colors">
                    chevron_right
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      {showNew && (
        <NewAnnouncementModal
          onClose={() => setShowNew(false)}
          onCreated={load}
          sections={sections}
        />
      )}
      {preview && (
        <AnnouncementPreview
          row={preview}
          sections={sections}
          onClose={() => setPreview(null)}
          onPublish={handlePublish}
          onDelete={handleDelete}
        />
      )}
    </DashboardLayout>
  );
}
