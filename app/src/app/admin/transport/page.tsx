'use client';

import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import {
  getRoutes,
  createRoute,
  deleteRoute,
  getRouteDetail,
  addStop,
  deleteStop,
  assignStudentToRoute,
  unassignStudent,
  type RouteRow,
  type RouteDetail,
} from '@/actions/transport';
import { getStudents } from '@/actions/students';
import { App } from 'antd';
import { getMenuGroupsForRoles } from '@/lib/nav/menu';

const menuGroups = getMenuGroupsForRoles(['admin']);

export default function TransportPage() {
  const { message } = App.useApp();
  const [routes, setRoutes] = useState<RouteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [addFormOpen, setAddFormOpen] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', driverName: '', vehiclePlate: '', capacity: '' });

  const [expandedRouteId, setExpandedRouteId] = useState<string | null>(null);
  const [detail, setDetail] = useState<RouteDetail | null>(null);
  const [stopForm, setStopForm] = useState({ name: '', pickupTime: '', dropoffTime: '' });

  const [studentSearch, setStudentSearch] = useState('');
  const [studentOptions, setStudentOptions] = useState<{ id: string; fullName: string }[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedStopId, setSelectedStopId] = useState('');

  const loadRoutes = async () => {
    setLoading(true);
    try {
      setRoutes(await getRoutes());
    } catch (e: any) {
      message.error(e.message || 'Error al cargar rutas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRoutes();
  }, []);

  useEffect(() => {
    if (!studentSearch) {
      setStudentOptions([]);
      return;
    }
    const t = setTimeout(async () => {
      const res = await getStudents(undefined, studentSearch, undefined, undefined, 1, 10);
      setStudentOptions(res.students.map((s: any) => ({ id: s.id, fullName: s.fullName })));
    }, 300);
    return () => clearTimeout(t);
  }, [studentSearch]);

  const toggleExpand = async (routeId: string) => {
    if (expandedRouteId === routeId) {
      setExpandedRouteId(null);
      setDetail(null);
      return;
    }
    setExpandedRouteId(routeId);
    const res = await getRouteDetail(routeId);
    if ('error' in res) message.error(res.error);
    else setDetail(res);
  };

  const refreshDetail = async () => {
    if (!expandedRouteId) return;
    const res = await getRouteDetail(expandedRouteId);
    if (!('error' in res)) setDetail(res);
    loadRoutes();
  };

  const handleAddRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await createRoute({
        name: addForm.name,
        driverName: addForm.driverName || undefined,
        vehiclePlate: addForm.vehiclePlate || undefined,
        capacity: addForm.capacity ? Number(addForm.capacity) : undefined,
      });
      if ('error' in res) message.error(res.error);
      else {
        message.success('Ruta creada');
        setAddFormOpen(false);
        setAddForm({ name: '', driverName: '', vehiclePlate: '', capacity: '' });
        loadRoutes();
      }
    } catch (e: any) {
      message.error(e.message || 'Error al crear ruta');
    }
  };

  const handleDeleteRoute = async (id: string) => {
    if (!confirm('¿Eliminar esta ruta?')) return;
    const res = await deleteRoute(id);
    if ('error' in res) message.error(res.error);
    else {
      message.success('Ruta eliminada');
      loadRoutes();
    }
  };

  const handleAddStop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expandedRouteId) return;
    const res = await addStop(expandedRouteId, {
      name: stopForm.name,
      order: (detail?.stops.length ?? 0) + 1,
      pickupTime: stopForm.pickupTime || undefined,
      dropoffTime: stopForm.dropoffTime || undefined,
    });
    if ('error' in res) message.error(res.error);
    else {
      message.success('Parada agregada');
      setStopForm({ name: '', pickupTime: '', dropoffTime: '' });
      refreshDetail();
    }
  };

  const handleDeleteStop = async (stopId: string) => {
    await deleteStop(stopId);
    refreshDetail();
  };

  const handleAssign = async () => {
    if (!expandedRouteId || !selectedStudentId) {
      message.error('Selecciona un alumno');
      return;
    }
    const res = await assignStudentToRoute(selectedStudentId, expandedRouteId, selectedStopId || undefined);
    if ('error' in res) message.error(res.error);
    else {
      message.success('Alumno asignado');
      setSelectedStudentId('');
      setStudentSearch('');
      setSelectedStopId('');
      refreshDetail();
    }
  };

  const handleUnassign = async (studentId: string) => {
    await unassignStudent(studentId);
    refreshDetail();
  };

  return (
    <DashboardLayout roleTitle="Admin / Control Escolar" userName="Administrador" userRole="Administrador" menuGroups={menuGroups} breadcrumbs={['Admin', 'Transporte']}>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Transporte Escolar</h1>
        <button onClick={() => setAddFormOpen(true)} className="flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800">
          <span className="material-symbols-outlined text-lg">add</span>
          Nueva ruta
        </button>
      </div>

      {loading ? (
        <div className="py-12 text-center text-gray-500">Cargando...</div>
      ) : routes.length === 0 ? (
        <div className="py-12 text-center bg-white rounded-2xl border border-dashed border-gray-200">
          <span className="material-symbols-outlined text-5xl text-gray-200 mb-4 block">directions_bus</span>
          <p className="text-gray-500">Sin rutas registradas.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {routes.map((r) => (
            <div key={r.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between p-5">
                <button onClick={() => toggleExpand(r.id)} className="flex-1 text-left">
                  <h3 className="font-bold text-gray-900">{r.name}</h3>
                  <p className="text-sm text-gray-500">
                    {r.driverName || 'Sin conductor'} {r.vehiclePlate ? `· ${r.vehiclePlate}` : ''} · {r.stopCount} paradas · {r.assignedCount}
                    {r.capacity ? `/${r.capacity}` : ''} alumnos
                  </p>
                </button>
                <button onClick={() => handleDeleteRoute(r.id)} className="text-xs text-red-600 hover:underline">
                  Eliminar
                </button>
              </div>

              {expandedRouteId === r.id && detail && (
                <div className="border-t border-gray-100 p-5 space-y-6">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Paradas</h4>
                    <div className="space-y-1 mb-3">
                      {detail.stops.map((s) => (
                        <div key={s.id} className="flex items-center justify-between text-sm bg-gray-50 rounded-lg px-3 py-2">
                          <span>{s.name} {s.pickupTime ? `· recogida ${s.pickupTime}` : ''} {s.dropoffTime ? `· entrega ${s.dropoffTime}` : ''}</span>
                          <button onClick={() => handleDeleteStop(s.id)} className="text-xs text-red-600 hover:underline">Quitar</button>
                        </div>
                      ))}
                    </div>
                    <form onSubmit={handleAddStop} className="flex gap-2 flex-wrap">
                      <input required placeholder="Nombre de parada" value={stopForm.name} onChange={(e) => setStopForm({ ...stopForm, name: e.target.value })} className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm flex-1 min-w-[140px]" />
                      <input type="time" value={stopForm.pickupTime} onChange={(e) => setStopForm({ ...stopForm, pickupTime: e.target.value })} className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm" />
                      <input type="time" value={stopForm.dropoffTime} onChange={(e) => setStopForm({ ...stopForm, dropoffTime: e.target.value })} className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm" />
                      <button type="submit" className="px-3 py-1.5 bg-gray-900 text-white rounded-lg text-sm font-medium">Agregar</button>
                    </form>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Alumnos asignados</h4>
                    <div className="space-y-1 mb-3">
                      {detail.assignments.map((a) => (
                        <div key={a.id} className="flex items-center justify-between text-sm bg-gray-50 rounded-lg px-3 py-2">
                          <span>{a.studentName} {a.stopName ? `· ${a.stopName}` : ''}</span>
                          <button onClick={() => handleUnassign(a.studentId)} className="text-xs text-red-600 hover:underline">Quitar</button>
                        </div>
                      ))}
                      {detail.assignments.length === 0 && <p className="text-xs text-gray-400">Sin alumnos asignados.</p>}
                    </div>
                    <div className="flex gap-2 flex-wrap items-start">
                      <div className="relative flex-1 min-w-[160px]">
                        <input
                          type="text"
                          placeholder="Buscar alumno..."
                          value={selectedStudentId ? studentOptions.find((s) => s.id === selectedStudentId)?.fullName ?? studentSearch : studentSearch}
                          onChange={(e) => {
                            setStudentSearch(e.target.value);
                            setSelectedStudentId('');
                          }}
                          className="w-full px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                        />
                        {studentOptions.length > 0 && !selectedStudentId && (
                          <div className="absolute z-10 mt-1 w-full border border-gray-200 rounded-lg bg-white max-h-40 overflow-y-auto shadow-sm">
                            {studentOptions.map((s) => (
                              <button
                                key={s.id}
                                type="button"
                                onClick={() => {
                                  setSelectedStudentId(s.id);
                                  setStudentSearch(s.fullName);
                                }}
                                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                              >
                                {s.fullName}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <select value={selectedStopId} onChange={(e) => setSelectedStopId(e.target.value)} className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm">
                        <option value="">Sin parada</option>
                        {detail.stops.map((s) => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                      <button onClick={handleAssign} className="px-3 py-1.5 bg-gray-900 text-white rounded-lg text-sm font-medium">Asignar</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {addFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-lg font-bold text-gray-900">Nueva ruta</h3>
              <button onClick={() => setAddFormOpen(false)} className="text-gray-400 hover:text-gray-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleAddRoute} className="p-6 space-y-4">
              <input required placeholder="Nombre de la ruta *" value={addForm.name} onChange={(e) => setAddForm({ ...addForm, name: e.target.value })} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg" />
              <input placeholder="Conductor" value={addForm.driverName} onChange={(e) => setAddForm({ ...addForm, driverName: e.target.value })} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg" />
              <div className="grid grid-cols-2 gap-3">
                <input placeholder="Placa del vehículo" value={addForm.vehiclePlate} onChange={(e) => setAddForm({ ...addForm, vehiclePlate: e.target.value })} className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg" />
                <input type="number" min={1} placeholder="Capacidad" value={addForm.capacity} onChange={(e) => setAddForm({ ...addForm, capacity: e.target.value })} className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setAddFormOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">
                  Cancelar
                </button>
                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800">
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
