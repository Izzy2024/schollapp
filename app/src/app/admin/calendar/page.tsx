'use client';

import React, { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { App, Button, Card, DatePicker, Input, Modal, Switch } from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import { createCalendarEvent, deleteCalendarEvent, listCalendarEvents } from '@/actions/calendar';
import { getMenuGroupsForRoles } from '@/lib/nav/menu';

type CalendarRow = Awaited<ReturnType<typeof listCalendarEvents>>[number];

const menuGroups = getMenuGroupsForRoles(['admin']);

function defaultRange(): { start: Dayjs; end: Dayjs } {
  const start = dayjs().startOf('month');
  const end = dayjs().endOf('month');
  return { start, end };
}

export default function AdminCalendarPage() {
  const { message: antdMessage } = App.useApp();
  const [{ start, end }, setRange] = useState(defaultRange);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<CalendarRow[]>([]);

  const [query, setQuery] = useState('');

  const [newOpen, setNewOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newAllDay, setNewAllDay] = useState(true);
  const [newStartAt, setNewStartAt] = useState<Dayjs | null>(dayjs());
  const [newEndAt, setNewEndAt] = useState<Dayjs | null>(null);
  const [saving, setSaving] = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      const data = await listCalendarEvents({ startAt: start.toDate(), endAt: end.toDate() });
      setRows(data);
    } catch (e: any) {
      antdMessage.error(e?.message || 'Error cargando calendario');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, [start.valueOf(), end.valueOf()]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const t = r.title.toLowerCase();
      const d = (r.description ?? '').toLowerCase();
      return t.includes(q) || d.includes(q);
    });
  }, [rows, query]);

  async function handleCreate() {
    const title = newTitle.trim();
    if (!title) return antdMessage.warning('Título requerido');
    if (!newStartAt) return antdMessage.warning('Selecciona fecha/hora de inicio');

    setSaving(true);
    try {
      await createCalendarEvent({
        title,
        description: newDescription.trim() ? newDescription.trim() : null,
        startAt: newStartAt.toDate(),
        endAt: newEndAt ? newEndAt.toDate() : null,
        allDay: newAllDay,
      });
      antdMessage.success('Evento creado');
      setNewOpen(false);
      setNewTitle('');
      setNewDescription('');
      setNewAllDay(true);
      setNewStartAt(dayjs());
      setNewEndAt(null);
      await refresh();
    } catch (e: any) {
      antdMessage.error(e?.message || 'No se pudo crear el evento');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    Modal.confirm({
      title: 'Eliminar evento',
      content: '¿Seguro que deseas eliminar este evento del calendario?',
      okText: 'Eliminar',
      okButtonProps: { danger: true },
      cancelText: 'Cancelar',
      onOk: async () => {
        try {
          await deleteCalendarEvent({ id });
          antdMessage.success('Evento eliminado');
          refresh();
        } catch (e: any) {
          antdMessage.error(e?.message || 'No se pudo eliminar');
        }
      },
    });
  }

  return (
    <DashboardLayout roleTitle="Admin" userName="Administrador" userRole="Administrador" menuGroups={menuGroups} breadcrumbs={['Admin', 'Calendario']}>
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Calendario Escolar</h1>
          <div className="text-sm text-gray-500">Eventos globales del ciclo (festivos, juntas, evaluaciones, etc.).</div>
        </div>
        <Button type="primary" onClick={() => setNewOpen(true)}>
          Nuevo evento
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1" title="Filtros">
          <div className="space-y-3">
            <div>
              <div className="text-xs text-gray-500 mb-1">Rango</div>
              <DatePicker.RangePicker
                className="w-full"
                value={[start, end]}
                onChange={(v) => {
                  if (!v || !v[0] || !v[1]) return;
                  setRange({ start: v[0].startOf('day'), end: v[1].endOf('day') });
                }}
              />
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Buscar</div>
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Título o descripción" />
            </div>
            <Button onClick={refresh} disabled={loading}>
              Refrescar
            </Button>
          </div>
        </Card>

        <Card className="lg:col-span-2" title={`Eventos (${filtered.length})`}>
          {loading ? (
            <div className="py-10 text-center text-gray-400">Cargando eventos...</div>
          ) : filtered.length === 0 ? (
            <div className="py-10 text-center text-gray-400">No hay eventos en el rango seleccionado.</div>
          ) : (
            <div className="space-y-3">
              {filtered.map((item) => (
                <div key={item.id} className="flex items-start justify-between gap-4 rounded-xl border border-gray-100 p-4">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-gray-900">{item.title}</div>
                    <div className="mt-1 text-sm text-gray-600">
                      <div>
                        {dayjs(item.startAt).format('YYYY-MM-DD HH:mm')}
                        {item.endAt ? ` → ${dayjs(item.endAt).format('YYYY-MM-DD HH:mm')}` : ''}
                        {item.allDay ? ' (Todo el día)' : ''}
                      </div>
                      {item.description ? <div className="text-gray-500">{item.description}</div> : null}
                    </div>
                  </div>
                  <Button danger onClick={() => handleDelete(item.id)}>
                    Eliminar
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Modal
        open={newOpen}
        title="Nuevo evento"
        okText="Crear"
        cancelText="Cancelar"
        confirmLoading={saving}
        onOk={handleCreate}
        onCancel={() => setNewOpen(false)}
      >
        <div className="space-y-3">
          <div>
            <div className="text-xs text-gray-500 mb-1">Título</div>
            <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Ej. Día festivo" />
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">Descripción (opcional)</div>
            <Input.TextArea
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Detalles del evento"
              autoSize={{ minRows: 2, maxRows: 5 }}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-500">Todo el día</div>
            <Switch checked={newAllDay} onChange={setNewAllDay} />
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">Inicio</div>
            <DatePicker
              showTime={!newAllDay}
              className="w-full"
              value={newStartAt}
              onChange={(v) => setNewStartAt(v)}
            />
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">Fin (opcional)</div>
            <DatePicker
              showTime={!newAllDay}
              className="w-full"
              value={newEndAt}
              onChange={(v) => setNewEndAt(v)}
              disabled={!newStartAt}
            />
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
