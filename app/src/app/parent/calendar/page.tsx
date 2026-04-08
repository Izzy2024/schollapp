'use client';

import React, { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Button, Card, DatePicker, Input, List, message as antdMessage } from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import { listCalendarEvents } from '@/actions/calendar';
import { getMenuGroupsForRoles } from '@/lib/nav/menu';

type CalendarRow = Awaited<ReturnType<typeof listCalendarEvents>>[number];

const menuGroups = getMenuGroupsForRoles(['parent']);

function defaultRange(): { start: Dayjs; end: Dayjs } {
  const start = dayjs().startOf('month');
  const end = dayjs().endOf('month');
  return { start, end };
}

export default function ParentCalendarPage() {
  const [{ start, end }, setRange] = useState(defaultRange);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<CalendarRow[]>([]);
  const [query, setQuery] = useState('');

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

  return (
    <DashboardLayout roleTitle="Tutor / Padre" userName="Familia" userRole="Tutor" menuGroups={menuGroups} breadcrumbs={['Familia', 'Calendario']}>
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Calendario Escolar</h1>
          <div className="text-sm text-gray-500">Eventos globales del ciclo (solo lectura).</div>
        </div>
        <Button onClick={refresh} disabled={loading}>
          Refrescar
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
          </div>
        </Card>

        <Card className="lg:col-span-2" title={`Eventos (${filtered.length})`}>
          <List
            loading={loading}
            dataSource={filtered}
            renderItem={(item) => (
              <List.Item>
                <List.Item.Meta
                  title={<div className="font-medium">{item.title}</div>}
                  description={
                    <div className="text-sm text-gray-600">
                      <div>
                        {dayjs(item.startAt).format('YYYY-MM-DD HH:mm')}
                        {item.endAt ? ` → ${dayjs(item.endAt).format('YYYY-MM-DD HH:mm')}` : ''}
                        {item.allDay ? ' (Todo el día)' : ''}
                      </div>
                      {item.description ? <div className="text-gray-500">{item.description}</div> : null}
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        </Card>
      </div>
    </DashboardLayout>
  );
}
