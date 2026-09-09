'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getPublicApplicationInfo, submitApplication } from '@/actions/admissions';

type Info = { tenantName: string; gradeLevels: { id: string; name: string }[] };

export default function ApplyPage() {
  const { tenantSlug } = useParams();
  const [info, setInfo] = useState<Info | null | undefined>(undefined);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    dob: '',
    gradeLevelId: '',
    guardianName: '',
    guardianEmail: '',
    guardianPhone: '',
    notes: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    getPublicApplicationInfo(tenantSlug as string).then(setInfo);
  }, [tenantSlug]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError('El nombre y apellido son obligatorios.');
      return;
    }

    setIsPending(true);
    const result = await submitApplication(tenantSlug as string, form);
    setIsPending(false);

    if ('error' in result) {
      setError('Ocurrió un error al enviar la solicitud. Intenta de nuevo.');
      return;
    }

    setSubmitted(true);
  }

  if (info === undefined) {
    return <div className="text-center text-gray-400">Cargando...</div>;
  }

  if (info === null) {
    return <div className="text-center text-gray-500">Escuela no encontrada.</div>;
  }

  return (
    <div className="sm:mx-auto sm:w-full sm:max-w-lg">
      <div className="text-center">
        <h2 className="mt-2 text-3xl font-extrabold text-gray-900">Solicitud de admisión</h2>
        <p className="mt-2 text-sm text-gray-600">{info.tenantName}</p>
      </div>

      <div className="mt-8 bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
        {submitted ? (
          <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2 text-center">
            Solicitud enviada. La escuela se pondrá en contacto contigo.
          </div>
        ) : (
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Nombre del aspirante *</label>
                <input
                  required
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Apellido *</label>
                <input
                  required
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm sm:text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Fecha de nacimiento</label>
                <input
                  type="date"
                  value={form.dob}
                  onChange={(e) => setForm({ ...form, dob: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Grado al que aplica</label>
                <select
                  value={form.gradeLevelId}
                  onChange={(e) => setForm({ ...form, gradeLevelId: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm sm:text-sm"
                >
                  <option value="">Selecciona...</option>
                  {info.gradeLevels.map((g) => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <hr className="border-gray-100" />

            <div>
              <label className="block text-sm font-medium text-gray-700">Nombre del padre/tutor</label>
              <input
                value={form.guardianName}
                onChange={(e) => setForm({ ...form, guardianName: e.target.value })}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm sm:text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Correo del tutor</label>
                <input
                  type="email"
                  value={form.guardianEmail}
                  onChange={(e) => setForm({ ...form, guardianEmail: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Teléfono del tutor</label>
                <input
                  value={form.guardianPhone}
                  onChange={(e) => setForm({ ...form, guardianPhone: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Notas adicionales</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={3}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm sm:text-sm"
              />
            </div>

            {error && <div className="text-sm text-red-500 font-medium text-center">{error}</div>}

            <button
              type="submit"
              disabled={isPending}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              {isPending ? 'Enviando...' : 'Enviar solicitud'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
