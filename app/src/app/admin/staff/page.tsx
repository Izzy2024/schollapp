'use client';

import React, { useEffect, useState, useRef } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { getStaffList, createStaff } from '@/actions/staff';
import { App } from 'antd';
import { getMenuGroupsForRoles } from '@/lib/nav/menu';

const menuGroups = getMenuGroupsForRoles(['admin']);

type StaffMember = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  roleLabel: string;
  isActive: boolean;
  classesCount: number;
  classesPreview: string;
};

export default function StaffPage() {
  const { message } = App.useApp();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    roleLabel: 'Docente',
  });
  const [newCredentials, setNewCredentials] = useState<{ email: string; tempPassword: string } | null>(null);

  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const loadData = async (currentPage = page, currentSearch = search) => {
    setLoading(true);
    try {
      const res = await getStaffList(currentSearch, currentPage, pageSize);
      setStaff(res.staff);
      setTotal(res.total);
      setPage(res.page);
    } catch (error: any) {
      message.error(error.message || 'Error al cargar docentes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      loadData(1, search);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [search]);

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > Math.ceil(total / pageSize)) return;
    loadData(newPage, search);
  };

  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName) {
      message.error('El nombre completo es requerido');
      return;
    }
    try {
      const res = await createStaff(formData);
      
      if ('error' in res) {
        message.error((res as any).error);
      } else {
        message.success('Docente registrado con éxito');
        setModalOpen(false);
        setFormData({ fullName: '', email: '', phone: '', roleLabel: 'Docente' });
        if (res.credentials) setNewCredentials(res.credentials);
        loadData(1, search);
      }
    } catch (error: any) {
      message.error(error.message || 'Error al guardar docente');
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <DashboardLayout
      roleTitle="Admin / Control Escolar"
      userName="Administrador"
      userRole="Administrador"
      menuGroups={menuGroups}
      breadcrumbs={['Admin', 'Docentes']}
    >
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-900">Docentes / Staff</h1>
          <span className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm font-bold">
            {total} Registrados
          </span>
        </div>
        <button 
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors shadow-lg"
        >
          <span className="material-symbols-outlined text-lg">person_add</span>
          Nuevo Docente
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[200px] relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">search</span>
          <input 
            type="text" 
            placeholder="Buscar por nombre o correo..."
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6">
        {loading ? (
          <div className="p-12 text-center text-gray-500">Cargando...</div>
        ) : staff.length === 0 ? (
          <div className="p-12 text-center text-gray-500">No se encontraron docentes.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-gray-50/50 text-gray-600 font-medium border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4">Nombre Completo</th>
                  <th className="px-6 py-4">Rol Asignado</th>
                  <th className="px-6 py-4">Contacto</th>
                  <th className="px-6 py-4">Clases Asignadas</th>
                  <th className="px-6 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-800">
                {staff.map(s => (
                  <tr key={s.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-xs">
                          {s.fullName.charAt(0).toUpperCase()}
                        </div>
                        {s.fullName}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-lg text-xs font-semibold">{s.roleLabel}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs text-gray-600 flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">mail</span> {s.email}</span>
                        {s.phone !== '—' && <span className="text-xs text-gray-600 flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">call</span> {s.phone}</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {s.classesCount > 0 ? (
                        <div className="flex flex-col">
                          <span className="font-semibold text-gray-900">{s.classesCount} clase(s)</span>
                          <span className="text-xs text-gray-500 max-w-[200px] truncate" title={s.classesPreview}>{s.classesPreview}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">Sin clases</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-gray-400 hover:text-blue-600 p-2 rounded-lg hover:bg-blue-50 transition-colors" title="Ver Perfil">
                        <span className="material-symbols-outlined text-xl">visibility</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!loading && total > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Mostrando <span className="font-medium text-gray-900">{(page - 1) * pageSize + 1}</span> a <span className="font-medium text-gray-900">{Math.min(page * pageSize, total)}</span> de <span className="font-medium text-gray-900">{total}</span> docentes
          </p>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => handlePageChange(page - 1)}
              disabled={page === 1}
              className="px-4 py-2 border border-gray-200 bg-white rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Anterior
            </button>
            <span className="text-sm font-medium text-gray-600 min-w-[5rem] text-center">
              Pág {page} de {totalPages}
            </span>
            <button 
              onClick={() => handlePageChange(page + 1)}
              disabled={page >= totalPages}
              className="px-4 py-2 border border-gray-200 bg-white rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}

      {/* Modal Alta Docente */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-lg font-bold text-gray-900">Registrar Docente</h3>
              <button 
                onClick={() => setModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-6 flex-1">
              <form id="staff-form" onSubmit={handleSaveStaff} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre Completo <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="text" 
                    value={formData.fullName}
                    onChange={e => setFormData({...formData, fullName: e.target.value})}
                    required
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white transition-all"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Correo Electrónico
                    </label>
                    <input 
                      type="email" 
                      value={formData.email}
                      onChange={e => setFormData({...formData, email: e.target.value})}
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Teléfono
                    </label>
                    <input 
                      type="tel" 
                      value={formData.phone}
                      onChange={e => setFormData({...formData, phone: e.target.value})}
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rol / Puesto
                  </label>
                  <input 
                    type="text" 
                    value={formData.roleLabel}
                    onChange={e => setFormData({...formData, roleLabel: e.target.value})}
                    placeholder="Ej. Docente, Titular, Coordinador"
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white transition-all"
                  />
                </div>
              </form>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/50">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="staff-form"
                className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors shadow-lg shadow-gray-900/20"
              >
                Guardar Docente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Credenciales generadas */}
      {newCredentials && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
              <h3 className="text-lg font-bold text-gray-900">Acceso generado</h3>
            </div>
            <div className="p-6 space-y-3">
              <p className="text-sm text-gray-600">
                Comparte estas credenciales con el docente. La contraseña no se volverá a mostrar.
              </p>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-1 font-mono text-sm">
                <div><span className="text-gray-500">Correo:</span> {newCredentials.email}</div>
                <div><span className="text-gray-500">Contraseña temporal:</span> {newCredentials.tempPassword}</div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end bg-gray-50/50">
              <button
                onClick={() => setNewCredentials(null)}
                className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
