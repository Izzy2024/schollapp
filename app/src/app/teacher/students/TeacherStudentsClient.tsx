'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useRouter, useSearchParams } from 'next/navigation';
import { getTeacherStudentsData } from '@/actions/teacherStudents';
import { TEACHER_MENU_GROUPS } from '@/lib/teacherMenu';
import { message } from 'antd';

type StudentBase = { id: string; enrollmentId: string | null; firstName: string; lastName: string; curp: string; email: string | null };

export default function TeacherStudentsClient({ options, initialClassId, tenantSlug }: { 
  options: { classes: { id: string; name: string }[] };
  initialClassId: string;
  tenantSlug: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [classId, setClassId] = useState(initialClassId);
  const [students, setStudents] = useState<StudentBase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const urlClass = searchParams.get('class');
    if (urlClass && urlClass !== classId) setClassId(urlClass);
  }, [searchParams, classId]);

  useEffect(() => {
    if (!classId) return;

    setLoading(true);
    getTeacherStudentsData(classId, tenantSlug)
      .then(res => setStudents(res))
      .catch(e => {
        message.error(e.message || 'Error cargando alumnos');
      })
      .finally(() => setLoading(false));
      
      router.replace(`/teacher/students?class=${classId}`, { scroll: false });
  }, [classId, tenantSlug, router]);

  return (
    <DashboardLayout
      roleTitle="Appsschool"
      userName="Prof. García"
      userRole="Docente Senior"
      menuGroups={TEACHER_MENU_GROUPS}
      breadcrumbs={['Docentes', 'Mis Estudiantes']}
    >
      <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 flex flex-col h-full min-h-[600px] mt-[2px]">
        
        <div className="p-6 border-b border-gray-100 flex items-center gap-4 flex-wrap bg-gray-50/30">
          <h1 className="text-xl font-bold text-gray-900 mr-auto">Estudiantes por Grupo</h1>
          
          <div className="w-full md:w-auto flex items-center gap-2">
            <span className="text-sm font-medium text-gray-500">Materia:</span>
            <select 
              value={classId} 
              onChange={e => setClassId(e.target.value)}
              className="px-4 py-2 bg-white border border-gray-200 text-sm font-medium text-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm min-w-[250px]"
            >
              {options.classes.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="p-0 overflow-x-auto flex-1">
          {loading ? (
            <div className="p-12 text-center text-gray-400 font-medium">Cargando directorio de estudiantes...</div>
          ) : students.length === 0 ? (
            <div className="p-20 text-center flex flex-col items-center">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-3xl text-gray-300">group_off</span>
              </div>
              <h3 className="text-gray-900 font-bold mb-1">Grupo sin Matrícula</h3>
              <p className="text-sm text-gray-500 max-w-sm mb-6">No hay alumnos inscritos en esta materia todavía.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 tracking-wider uppercase border-b border-gray-100 w-16">N°</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 tracking-wider border-b border-gray-100">Alumno</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 tracking-wider border-b border-gray-100">Matrícula</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 tracking-wider border-b border-gray-100 hidden md:table-cell">CURP</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 tracking-wider border-b border-gray-100">Contacto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {students.map((st, index) => (
                  <tr key={st.id} className="hover:bg-indigo-50/30 transition-colors">
                    <td className="px-6 py-4 text-[13px] font-semibold text-gray-400">{index + 1}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-100 to-indigo-50 flex items-center justify-center text-indigo-700 font-bold text-xs uppercase shadow-sm">
                          {st.firstName.charAt(0)}{st.lastName.charAt(0)}
                        </div>
                        <div>
                          <p className="text-[14px] font-bold text-gray-900 leading-tight">
                            {st.lastName}, {st.firstName}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-[13px] font-medium text-gray-600 font-mono">
                      {st.enrollmentId || 'Sin asignar'}
                    </td>
                    <td className="px-6 py-4 text-[13px] text-gray-500 font-mono hidden md:table-cell">
                      {st.curp}
                    </td>
                    <td className="px-6 py-4 text-[13px]">
                      {st.email ? (
                         <div className="flex items-center gap-1.5 text-indigo-600 font-medium">
                           <span className="material-symbols-outlined text-[16px]">mail</span>
                           <a href={`mailto:${st.email}`} className="hover:underline">{st.email}</a>
                         </div>
                      ) : (
                         <span className="text-gray-400 italic">No especificado</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        
        <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between">
            <span className="text-sm text-gray-500 font-medium">Total de Estudiantes: <b className="text-gray-900">{students.length}</b></span>
            <span className="text-xs text-indigo-600 font-semibold bg-indigo-50 px-2 py-1 rounded-md">Modo Lectura</span>
        </div>
      </div>
    </DashboardLayout>
  );
}
