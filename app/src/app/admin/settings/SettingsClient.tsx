'use client';

import React, { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { updateTenantProfile, importStudentsCsv } from '@/actions/settings';
import { ADMIN_MENU_GROUPS } from '@/lib/adminMenu';
import { message } from 'antd';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function SettingsClient({ initProfile, tenantSlug }: { 
  initProfile: { id: string, name: string, slug: string, domain: string, logoUrl: string } | null;
  tenantSlug: string;
}) {
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState<'profile' | 'modules' | 'import'>('modules');
  const [profileData, setProfileData] = useState({
    name: initProfile?.name || '',
    domain: initProfile?.domain || '',
    logoUrl: initProfile?.logoUrl || ''
  });
  const [savingProfile, setSavingProfile] = useState(false);

  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [importLogs, setImportLogs] = useState<string[]>([]);
  const [importMessage, setImportMessage] = useState<string | null>(null);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!initProfile?.id) return;
    setSavingProfile(true);
    try {
      await updateTenantProfile(initProfile.id, profileData);
      message.success('Perfil de colegio actualizado');
    } catch (err: any) {
      message.error(err.message || 'Error al guardar');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleCsvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setCsvFile(e.target.files[0]);
    }
  };

  const processCsv = async () => {
    if (!csvFile) return;
    setUploading(true);
    setImportLogs([]);
    setImportMessage(null);
    
    try {
      const text = await csvFile.text();
      const res = await importStudentsCsv(tenantSlug, text);
      if (res.success) {
        message.success(res.message);
        setImportMessage(res.message);
        setImportLogs(res.logs || []);
        if (res.logs && res.logs.length === 0) setCsvFile(null);
      }
    } catch (err: any) {
      message.error(err.message || 'Error importando');
      setImportMessage(err.message || 'Error desconocido');
    } finally {
      setUploading(false);
    }
  };

  return (
    <DashboardLayout
      roleTitle="Appsschool"
      userName="Admin Demo"
      userRole="Administrador"
      menuGroups={ADMIN_MENU_GROUPS}
      breadcrumbs={['Admin', 'Configuración de la Escuela']}
    >
      <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 flex flex-col h-full min-h-[600px] mt-[2px]">
        
        {/* Header Options */}
        <div className="p-6 border-b border-gray-100 bg-gray-50/30">
          <h1 className="text-xl font-bold text-gray-900 mb-6">Configuración de la Plataforma</h1>
          
          <div className="flex bg-gray-100 p-1 rounded-xl w-fit">
            <button 
              onClick={() => setActiveTab('modules')}
              className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'modules' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Módulos del Sistema
            </button>
            <button 
              onClick={() => setActiveTab('profile')}
              className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'profile' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Perfil del Colegio
            </button>
            <button 
              onClick={() => setActiveTab('import')}
              className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'import' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Importador Masivo
            </button>
          </div>
        </div>

        {/* Content Views */}
        <div className="p-8 flex-1 bg-gray-50/20">
          
          {/* TAB 1: MODULES DIRECTORY */}
          {activeTab === 'modules' && (
            <div className="max-w-4xl space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 
                 {/* Academic */}
                 <Link href="/admin/academic" className="group">
                   <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:border-indigo-300 hover:shadow-md transition-all">
                     <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center mb-4 text-indigo-600 group-hover:scale-110 transition-transform">
                       <span className="material-symbols-outlined text-2xl">event_note</span>
                     </div>
                     <h3 className="text-lg font-bold text-gray-900 mb-1">Años Académicos</h3>
                     <p className="text-sm text-gray-500">Configura ciclos, periodos (trimestres, semestres) y fechas de inicio o fin de ciclo general.</p>
                   </div>
                 </Link>

                 <Link href="/admin/classes" className="group">
                   <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:border-teal-300 hover:shadow-md transition-all">
                     <div className="w-12 h-12 bg-teal-50 rounded-full flex items-center justify-center mb-4 text-teal-600 group-hover:scale-110 transition-transform">
                       <span className="material-symbols-outlined text-2xl">account_tree</span>
                     </div>
                     <h3 className="text-lg font-bold text-gray-900 mb-1">Estructura Escolar</h3>
                     <p className="text-sm text-gray-500">Gestión de niveles, grados y grupos activos (ej. 1° Sección A).</p>
                   </div>
                 </Link>

                 <Link href="/admin/subjects" className="group">
                   <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:border-purple-300 hover:shadow-md transition-all">
                     <div className="w-12 h-12 bg-purple-50 rounded-full flex items-center justify-center mb-4 text-purple-600 group-hover:scale-110 transition-transform">
                       <span className="material-symbols-outlined text-2xl">menu_book</span>
                     </div>
                     <h3 className="text-lg font-bold text-gray-900 mb-1">Catálogo de Materias</h3>
                     <p className="text-sm text-gray-500">Crea materias y asígnalas a los diferentes grupos incluyendo la asignación de docentes responsables.</p>
                   </div>
                 </Link>
                 
                 <Link href="/admin/staff" className="group">
                   <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:border-blue-300 hover:shadow-md transition-all">
                     <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mb-4 text-blue-600 group-hover:scale-110 transition-transform">
                       <span className="material-symbols-outlined text-2xl">switch_account</span>
                     </div>
                     <h3 className="text-lg font-bold text-gray-900 mb-1">Personal (Staff)</h3>
                     <p className="text-sm text-gray-500">Directorio de docentes y administrativos. Creación de perfiles, modificación de datos y reseteos.</p>
                   </div>
                 </Link>

              </div>
            </div>
          )}

          {/* TAB 2: PROFILE */}
          {activeTab === 'profile' && (
            <div className="max-w-2xl bg-white p-8 rounded-2xl border border-gray-200 shadow-sm">
                <h2 className="text-lg font-bold text-gray-900 mb-6">Información General de la Sucursal</h2>
                
                <form onSubmit={handleProfileSubmit} className="space-y-5">
                   <div>
                     <label className="block text-sm font-semibold text-gray-700 mb-1">Nombre Oficial del Colegio</label>
                     <input 
                       type="text" 
                       required 
                       value={profileData.name} 
                       onChange={e => setProfileData({...profileData, name: e.target.value})} 
                       className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all outline-none" 
                     />
                   </div>

                   <div>
                     <label className="block text-sm font-semibold text-gray-700 mb-1">Dominio Institucional (Opcional)</label>
                     <input 
                       type="text" 
                       placeholder="demo-school.com"
                       value={profileData.domain} 
                       onChange={e => setProfileData({...profileData, domain: e.target.value})} 
                       className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all outline-none" 
                     />
                   </div>

                   <div>
                     <label className="block text-sm font-semibold text-gray-700 mb-1">URL del Logotipo (Opcional)</label>
                     <input 
                       type="url" 
                       placeholder="https://..."
                       value={profileData.logoUrl} 
                       onChange={e => setProfileData({...profileData, logoUrl: e.target.value})} 
                       className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all outline-none" 
                     />
                     <p className="text-xs text-gray-400 mt-1 italic">Provee un enlace directo a la imagen. (jpg, png, svg)</p>
                   </div>
                   
                   <hr className="my-6 border-gray-100" />
                   
                   <button 
                     type="submit" 
                     disabled={savingProfile}
                     className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-md w-full"
                   >
                     {savingProfile ? 'Actualizando...' : 'Guardar Cambios'}
                   </button>
                </form>
            </div>
          )}

          {/* TAB 3: IMPORT MASIVO */}
          {activeTab === 'import' && (
             <div className="max-w-2xl bg-white p-8 rounded-2xl border border-gray-200 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                   <div className="w-10 h-10 bg-orange-50 text-orange-600 rounded-full flex items-center justify-center">
                     <span className="material-symbols-outlined">upload_file</span>
                   </div>
                   <div>
                     <h2 className="text-lg font-bold text-gray-900">Importación Masiva de Estudiantes</h2>
                     <p className="text-sm text-gray-500">Carga un .csv estructurado para insertar alumnos rápidamente.</p>
                   </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-6 font-mono text-xs text-gray-600 overflow-x-auto">
                   <p className="font-bold mb-2">Formato esperado (CSV):</p>
                   MATRICULA,NOMBRES,APELLIDOS,CURP,CORREO<br/>
                   A001,Juan,Perez,CURP12345,juan@mail.com<br/>
                   A002,Maria,Gomez,,<br/>
                </div>

                <div className="border-2 border-dashed border-gray-300 rounded-2xl p-8 hover:bg-gray-50 transition-colors text-center relative mb-4">
                  <input 
                    type="file" 
                    accept=".csv" 
                    onChange={handleCsvChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                  />
                  <div className="pointer-events-none">
                     <span className="material-symbols-outlined text-4xl text-gray-300 mb-2">cloud_upload</span>
                     <p className="text-sm font-bold text-gray-900 mb-1">
                       {csvFile ? csvFile.name : 'Arrastra y suelta tu archivo CSV aquí'}
                     </p>
                     <p className="text-xs text-gray-500">Solo archivos separados por comas (.csv)</p>
                  </div>
                </div>

                <button 
                  onClick={processCsv}
                  disabled={!csvFile || uploading}
                  className="px-6 py-2.5 bg-gray-900 text-white font-bold rounded-xl hover:bg-gray-800 disabled:opacity-50 transition-colors shadow-md w-full"
                >
                  {uploading ? 'Procesando archivo...' : 'Comenzar Importación'}
                </button>

                {importMessage && (
                  <div className="mt-6 p-4 rounded-xl border border-gray-200 bg-white">
                    <p className="text-sm font-bold text-gray-900 mb-2">{importMessage}</p>
                    {importLogs.length > 0 && (
                      <ul className="text-xs text-red-600 space-y-1 list-disc pl-4 font-mono">
                        {importLogs.map((lg, i) => <li key={i}>{lg}</li>)}
                      </ul>
                    )}
                  </div>
                )}
             </div>
          )}

        </div>
      </div>
    </DashboardLayout>
  );
}
