'use client';

import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import {
  getAssets,
  createAsset,
  assignAsset,
  returnAsset,
  sendToMaintenance,
  retireAsset,
  getAssetLog,
  type AssetRow,
  type AssetLogRow,
} from '@/actions/inventory';
import { getStaffList } from '@/actions/staff';
import { App } from 'antd';
import { getMenuGroupsForRoles } from '@/lib/nav/menu';

const menuGroups = getMenuGroupsForRoles(['admin']);

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  available: { label: 'Disponible', className: 'bg-green-100 text-green-800' },
  assigned: { label: 'Asignado', className: 'bg-indigo-100 text-indigo-800' },
  maintenance: { label: 'Mantenimiento', className: 'bg-amber-100 text-amber-800' },
  retired: { label: 'Dado de baja', className: 'bg-gray-100 text-gray-600' },
};

export default function InventoryPage() {
  const { message } = App.useApp();
  const [assets, setAssets] = useState<AssetRow[]>([]);
  const [search, setSearch] = useState('');
  const [staffOptions, setStaffOptions] = useState<{ id: string; fullName: string }[]>([]);
  const [addFormOpen, setAddFormOpen] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', category: '', serialNumber: '', location: '' });

  const [expandedAssetId, setExpandedAssetId] = useState<string | null>(null);
  const [log, setLog] = useState<AssetLogRow[]>([]);
  const [assignStaffId, setAssignStaffId] = useState('');
  const [maintenanceNotes, setMaintenanceNotes] = useState('');

  const loadAssets = async () => setAssets(await getAssets(search || undefined));

  useEffect(() => {
    loadAssets();
    getStaffList().then((res) => setStaffOptions(res.staff.map((s: any) => ({ id: s.id, fullName: s.fullName }))));
  }, []);

  useEffect(() => {
    const t = setTimeout(loadAssets, 300);
    return () => clearTimeout(t);
  }, [search]);

  const handleAddAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await createAsset(addForm);
    if ('error' in res) message.error(res.error);
    else {
      message.success('Activo agregado');
      setAddFormOpen(false);
      setAddForm({ name: '', category: '', serialNumber: '', location: '' });
      loadAssets();
    }
  };

  const toggleExpand = async (assetId: string) => {
    if (expandedAssetId === assetId) {
      setExpandedAssetId(null);
      return;
    }
    setExpandedAssetId(assetId);
    setLog(await getAssetLog(assetId));
  };

  const refresh = async (assetId: string) => {
    loadAssets();
    setLog(await getAssetLog(assetId));
  };

  const handleAssign = async (assetId: string) => {
    if (!assignStaffId) {
      message.error('Selecciona un empleado');
      return;
    }
    const res = await assignAsset(assetId, assignStaffId);
    if ('error' in res) message.error(res.error);
    else {
      message.success('Activo asignado');
      setAssignStaffId('');
      refresh(assetId);
    }
  };

  const handleReturn = async (assetId: string) => {
    await returnAsset(assetId);
    refresh(assetId);
  };

  const handleMaintenance = async (assetId: string) => {
    await sendToMaintenance(assetId, maintenanceNotes || undefined);
    setMaintenanceNotes('');
    refresh(assetId);
  };

  const handleRetire = async (assetId: string) => {
    if (!confirm('¿Dar de baja este activo?')) return;
    await retireAsset(assetId);
    refresh(assetId);
  };

  return (
    <DashboardLayout roleTitle="Admin / Control Escolar" userName="Administrador" userRole="Administrador" menuGroups={menuGroups} breadcrumbs={['Admin', 'Inventario']}>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Inventario de Activos</h1>
        <button onClick={() => setAddFormOpen(true)} className="flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800">
          <span className="material-symbols-outlined text-lg">add</span>
          Nuevo activo
        </button>
      </div>

      <input
        type="text"
        placeholder="Buscar por nombre o número de serie..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full max-w-md mb-4 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
      />

      <div className="space-y-3">
        {assets.map((a) => {
          const statusInfo = STATUS_LABEL[a.status] ?? { label: a.status, className: 'bg-gray-100 text-gray-700' };
          return (
            <div key={a.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <button onClick={() => toggleExpand(a.id)} className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-50">
                <div>
                  <h3 className="font-bold text-gray-900">{a.name}</h3>
                  <p className="text-sm text-gray-500">
                    {a.category || 'Sin categoría'} {a.serialNumber ? `· S/N ${a.serialNumber}` : ''} {a.location ? `· ${a.location}` : ''}
                    {a.assignedToStaffName ? ` · Asignado a ${a.assignedToStaffName}` : ''}
                  </p>
                </div>
                <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${statusInfo.className}`}>{statusInfo.label}</span>
              </button>

              {expandedAssetId === a.id && (
                <div className="border-t border-gray-100 p-5 space-y-4">
                  <div className="flex flex-wrap gap-2 items-center">
                    {a.status !== 'assigned' && a.status !== 'retired' && (
                      <>
                        <select value={assignStaffId} onChange={(e) => setAssignStaffId(e.target.value)} className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm">
                          <option value="">Empleado...</option>
                          {staffOptions.map((s) => (
                            <option key={s.id} value={s.id}>{s.fullName}</option>
                          ))}
                        </select>
                        <button onClick={() => handleAssign(a.id)} className="px-3 py-1.5 bg-gray-900 text-white rounded-lg text-sm">Asignar</button>
                      </>
                    )}
                    {a.status === 'assigned' && (
                      <button onClick={() => handleReturn(a.id)} className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm">Registrar devolución</button>
                    )}
                    {a.status !== 'retired' && (
                      <>
                        <input placeholder="Notas de mantenimiento" value={maintenanceNotes} onChange={(e) => setMaintenanceNotes(e.target.value)} className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm flex-1 min-w-[160px]" />
                        <button onClick={() => handleMaintenance(a.id)} className="px-3 py-1.5 bg-amber-100 text-amber-800 rounded-lg text-sm">Enviar a mantenimiento</button>
                        <button onClick={() => handleRetire(a.id)} className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-sm">Dar de baja</button>
                      </>
                    )}
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Historial</h4>
                    <div className="space-y-1">
                      {log.map((l) => (
                        <div key={l.id} className="flex items-center justify-between text-xs bg-gray-50 rounded-lg px-3 py-2">
                          <span>{l.action}{l.notes ? ` · ${l.notes}` : ''}</span>
                          <span className="text-gray-400">{new Date(l.occurredAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}</span>
                        </div>
                      ))}
                      {log.length === 0 && <p className="text-xs text-gray-400">Sin movimientos.</p>}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {assets.length === 0 && (
          <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-gray-200 text-gray-500">
            Sin activos registrados.
          </div>
        )}
      </div>

      {addFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-lg font-bold text-gray-900">Nuevo activo</h3>
              <button onClick={() => setAddFormOpen(false)} className="text-gray-400 hover:text-gray-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleAddAsset} className="p-6 space-y-4">
              <input required placeholder="Nombre *" value={addForm.name} onChange={(e) => setAddForm({ ...addForm, name: e.target.value })} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg" />
              <div className="grid grid-cols-2 gap-3">
                <input placeholder="Categoría" value={addForm.category} onChange={(e) => setAddForm({ ...addForm, category: e.target.value })} className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg" />
                <input placeholder="Número de serie" value={addForm.serialNumber} onChange={(e) => setAddForm({ ...addForm, serialNumber: e.target.value })} className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg" />
              </div>
              <input placeholder="Ubicación" value={addForm.location} onChange={(e) => setAddForm({ ...addForm, location: e.target.value })} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg" />
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
