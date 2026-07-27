'use client';

import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import {
  getContracts,
  createContract,
  endContract,
  getPayrollPeriods,
  createPayrollPeriod,
  getPayrollEntries,
  addPayrollEntry,
  markEntryPaid,
  type ContractRow,
  type PayrollPeriodRow,
  type PayrollEntryRow,
} from '@/actions/hr';
import { getStaffList } from '@/actions/staff';
import { App } from 'antd';
import { getMenuGroupsForRoles } from '@/lib/nav/menu';

const menuGroups = getMenuGroupsForRoles(['admin']);

function formatMoney(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function HrPage() {
  const { message } = App.useApp();
  const [tab, setTab] = useState<'contracts' | 'payroll'>('contracts');

  // Contracts
  const [contracts, setContracts] = useState<ContractRow[]>([]);
  const [staffOptions, setStaffOptions] = useState<{ id: string; fullName: string }[]>([]);
  const [contractFormOpen, setContractFormOpen] = useState(false);
  const [contractForm, setContractForm] = useState({ staffId: '', position: '', salaryCents: '', contractType: 'full_time' as 'full_time' | 'part_time' | 'contract', startDateIso: '' });

  // Payroll
  const [periods, setPeriods] = useState<PayrollPeriodRow[]>([]);
  const [periodFormOpen, setPeriodFormOpen] = useState(false);
  const [periodForm, setPeriodForm] = useState({ name: '', startDateIso: '', endDateIso: '' });
  const [expandedPeriodId, setExpandedPeriodId] = useState<string | null>(null);
  const [entries, setEntries] = useState<PayrollEntryRow[]>([]);
  const [entryForm, setEntryForm] = useState({ staffId: '', grossCents: '', deductionsCents: '' });

  const loadContracts = async () => setContracts(await getContracts());
  const loadPeriods = async () => setPeriods(await getPayrollPeriods());

  useEffect(() => {
    loadContracts();
    loadPeriods();
    getStaffList().then((res) => setStaffOptions(res.staff.map((s: any) => ({ id: s.id, fullName: s.fullName }))));
  }, []);

  const handleCreateContract = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await createContract({
      staffId: contractForm.staffId,
      position: contractForm.position,
      salaryCents: Math.round(Number(contractForm.salaryCents) * 100),
      contractType: contractForm.contractType,
      startDateIso: new Date(contractForm.startDateIso).toISOString(),
    });
    if ('error' in res) message.error(res.error);
    else {
      message.success('Contrato creado');
      setContractFormOpen(false);
      setContractForm({ staffId: '', position: '', salaryCents: '', contractType: 'full_time', startDateIso: '' });
      loadContracts();
    }
  };

  const handleEndContract = async (id: string) => {
    if (!confirm('¿Finalizar este contrato?')) return;
    await endContract(id);
    loadContracts();
  };

  const handleCreatePeriod = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await createPayrollPeriod({
      name: periodForm.name,
      startDateIso: new Date(periodForm.startDateIso).toISOString(),
      endDateIso: new Date(periodForm.endDateIso).toISOString(),
    });
    if ('error' in res) message.error(res.error);
    else {
      message.success('Período creado');
      setPeriodFormOpen(false);
      setPeriodForm({ name: '', startDateIso: '', endDateIso: '' });
      loadPeriods();
    }
  };

  const toggleExpand = async (periodId: string) => {
    if (expandedPeriodId === periodId) {
      setExpandedPeriodId(null);
      return;
    }
    setExpandedPeriodId(periodId);
    const res = await getPayrollEntries(periodId);
    if ('error' in res) message.error(res.error);
    else setEntries(res);
  };

  const refreshEntries = async () => {
    if (!expandedPeriodId) return;
    const res = await getPayrollEntries(expandedPeriodId);
    if (!('error' in res)) setEntries(res);
    loadPeriods();
  };

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expandedPeriodId || !entryForm.staffId) {
      message.error('Selecciona un empleado');
      return;
    }
    const res = await addPayrollEntry(expandedPeriodId, {
      staffId: entryForm.staffId,
      grossCents: Math.round(Number(entryForm.grossCents) * 100),
      deductionsCents: Math.round(Number(entryForm.deductionsCents || '0') * 100),
    });
    if ('error' in res) message.error(res.error);
    else {
      message.success('Recibo agregado');
      setEntryForm({ staffId: '', grossCents: '', deductionsCents: '' });
      refreshEntries();
    }
  };

  const handleMarkPaid = async (entryId: string) => {
    await markEntryPaid(entryId);
    refreshEntries();
  };

  return (
    <DashboardLayout roleTitle="Admin / Control Escolar" userName="Administrador" userRole="Administrador" menuGroups={menuGroups} breadcrumbs={['Admin', 'RRHH']}>
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Recursos Humanos</h1>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6 flex">
        <button onClick={() => setTab('contracts')} className={`flex-1 py-3 text-sm font-medium border-b-2 ${tab === 'contracts' ? 'border-blue-600 text-blue-600 bg-blue-50/50' : 'border-transparent text-gray-500'}`}>
          Contratos
        </button>
        <button onClick={() => setTab('payroll')} className={`flex-1 py-3 text-sm font-medium border-b-2 ${tab === 'payroll' ? 'border-blue-600 text-blue-600 bg-blue-50/50' : 'border-transparent text-gray-500'}`}>
          Nómina
        </button>
      </div>

      {tab === 'contracts' ? (
        <>
          <div className="flex justify-end mb-4">
            <button onClick={() => setContractFormOpen(true)} className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800">
              + Nuevo contrato
            </button>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            {contracts.length === 0 ? (
              <div className="p-12 text-center text-gray-500">Sin contratos registrados.</div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50/50 text-gray-600 font-medium border-b border-gray-100">
                  <tr>
                    <th className="px-5 py-3">Empleado</th>
                    <th className="px-5 py-3">Puesto</th>
                    <th className="px-5 py-3">Tipo</th>
                    <th className="px-5 py-3 text-right">Salario</th>
                    <th className="px-5 py-3 text-center">Estado</th>
                    <th className="px-5 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {contracts.map((c) => (
                    <tr key={c.id}>
                      <td className="px-5 py-3 font-medium text-gray-900">{c.staffName}</td>
                      <td className="px-5 py-3 text-gray-600">{c.position}</td>
                      <td className="px-5 py-3 text-gray-600">{c.contractType === 'full_time' ? 'Tiempo completo' : c.contractType === 'part_time' ? 'Medio tiempo' : 'Contrato'}</td>
                      <td className="px-5 py-3 text-right">{formatMoney(c.salaryCents)}</td>
                      <td className="px-5 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${c.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                          {c.isActive ? 'Activo' : 'Finalizado'}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        {c.isActive && (
                          <button onClick={() => handleEndContract(c.id)} className="text-xs text-red-600 hover:underline">Finalizar</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="flex justify-end mb-4">
            <button onClick={() => setPeriodFormOpen(true)} className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800">
              + Nuevo período
            </button>
          </div>
          <div className="space-y-3">
            {periods.map((p) => (
              <div key={p.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <button onClick={() => toggleExpand(p.id)} className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-50">
                  <div>
                    <h3 className="font-bold text-gray-900">{p.name}</h3>
                    <p className="text-sm text-gray-500">{p.entryCount} recibos</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-xs font-semibold ${p.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                    {p.status === 'paid' ? 'Pagado' : 'Borrador'}
                  </span>
                </button>

                {expandedPeriodId === p.id && (
                  <div className="border-t border-gray-100 p-5 space-y-4">
                    <form onSubmit={handleAddEntry} className="flex gap-2 flex-wrap items-end">
                      <select value={entryForm.staffId} onChange={(e) => setEntryForm({ ...entryForm, staffId: e.target.value })} className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm">
                        <option value="">Empleado...</option>
                        {staffOptions.map((s) => (
                          <option key={s.id} value={s.id}>{s.fullName}</option>
                        ))}
                      </select>
                      <input type="number" step="0.01" placeholder="Salario bruto" value={entryForm.grossCents} onChange={(e) => setEntryForm({ ...entryForm, grossCents: e.target.value })} className="w-32 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm" />
                      <input type="number" step="0.01" placeholder="Deducciones" value={entryForm.deductionsCents} onChange={(e) => setEntryForm({ ...entryForm, deductionsCents: e.target.value })} className="w-32 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm" />
                      <button type="submit" className="px-3 py-1.5 bg-gray-900 text-white rounded-lg text-sm">Agregar recibo</button>
                    </form>

                    <div className="space-y-2">
                      {entries.map((e) => (
                        <div key={e.id} className="flex items-center justify-between text-sm bg-gray-50 rounded-lg px-3 py-2">
                          <span>{e.staffName}</span>
                          <span className="text-gray-600">Bruto: {formatMoney(e.grossCents)} · Deducciones: {formatMoney(e.deductionsCents)}</span>
                          <span className="font-semibold">Neto: {formatMoney(e.netCents)}</span>
                          {e.paidAt ? (
                            <span className="text-xs text-green-600 font-semibold">Pagado</span>
                          ) : (
                            <button onClick={() => handleMarkPaid(e.id)} className="text-xs text-blue-600 hover:underline">Marcar pagado</button>
                          )}
                        </div>
                      ))}
                      {entries.length === 0 && <p className="text-sm text-gray-400">Sin recibos en este período.</p>}
                    </div>
                  </div>
                )}
              </div>
            ))}
            {periods.length === 0 && (
              <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-gray-200 text-gray-500">
                Sin períodos de nómina.
              </div>
            )}
          </div>
        </>
      )}

      {contractFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-lg font-bold text-gray-900">Nuevo contrato</h3>
              <button onClick={() => setContractFormOpen(false)} className="text-gray-400 hover:text-gray-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleCreateContract} className="p-6 space-y-4">
              <select required value={contractForm.staffId} onChange={(e) => setContractForm({ ...contractForm, staffId: e.target.value })} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                <option value="">Selecciona empleado...</option>
                {staffOptions.map((s) => (
                  <option key={s.id} value={s.id}>{s.fullName}</option>
                ))}
              </select>
              <input required placeholder="Puesto" value={contractForm.position} onChange={(e) => setContractForm({ ...contractForm, position: e.target.value })} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg" />
              <div className="grid grid-cols-2 gap-3">
                <input required type="number" step="0.01" placeholder="Salario" value={contractForm.salaryCents} onChange={(e) => setContractForm({ ...contractForm, salaryCents: e.target.value })} className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg" />
                <select value={contractForm.contractType} onChange={(e) => setContractForm({ ...contractForm, contractType: e.target.value as typeof contractForm.contractType })} className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                  <option value="full_time">Tiempo completo</option>
                  <option value="part_time">Medio tiempo</option>
                  <option value="contract">Contrato</option>
                </select>
              </div>
              <input required type="date" value={contractForm.startDateIso} onChange={(e) => setContractForm({ ...contractForm, startDateIso: e.target.value })} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg" />
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setContractFormOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">
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

      {periodFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-lg font-bold text-gray-900">Nuevo período de nómina</h3>
              <button onClick={() => setPeriodFormOpen(false)} className="text-gray-400 hover:text-gray-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleCreatePeriod} className="p-6 space-y-4">
              <input required placeholder="Nombre (ej. Enero 2026)" value={periodForm.name} onChange={(e) => setPeriodForm({ ...periodForm, name: e.target.value })} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg" />
              <div className="grid grid-cols-2 gap-3">
                <input required type="date" value={periodForm.startDateIso} onChange={(e) => setPeriodForm({ ...periodForm, startDateIso: e.target.value })} className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg" />
                <input required type="date" value={periodForm.endDateIso} onChange={(e) => setPeriodForm({ ...periodForm, endDateIso: e.target.value })} className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setPeriodFormOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">
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
