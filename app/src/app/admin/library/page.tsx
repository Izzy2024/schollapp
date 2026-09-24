'use client';

import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { getBooks, createBook, deleteBook, checkoutBook, returnBook, getActiveLoans, type BookRow, type LoanRow } from '@/actions/library';
import { getStudents } from '@/actions/students';
import { App } from 'antd';
import { getMenuGroupsForRoles } from '@/lib/nav/menu';

const menuGroups = getMenuGroupsForRoles(['admin']);

export default function LibraryPage() {
  const { message } = App.useApp();
  const [tab, setTab] = useState<'catalog' | 'loans'>('catalog');
  const [books, setBooks] = useState<BookRow[]>([]);
  const [loans, setLoans] = useState<LoanRow[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const [addFormOpen, setAddFormOpen] = useState(false);
  const [addForm, setAddForm] = useState({ title: '', author: '', isbn: '', category: '', totalCopies: '1' });

  const [checkoutBookId, setCheckoutBookId] = useState<string | null>(null);
  const [studentSearch, setStudentSearch] = useState('');
  const [studentOptions, setStudentOptions] = useState<{ id: string; fullName: string }[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [dueDate, setDueDate] = useState('');

  const loadBooks = async () => {
    setLoading(true);
    try {
      setBooks(await getBooks(search || undefined));
    } catch (e: any) {
      message.error(e.message || 'Error al cargar catálogo');
    } finally {
      setLoading(false);
    }
  };

  const loadLoans = async () => {
    setLoading(true);
    try {
      setLoans(await getActiveLoans());
    } catch (e: any) {
      message.error(e.message || 'Error al cargar préstamos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tab === 'catalog') loadBooks();
    else loadLoans();
  }, [tab]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (tab === 'catalog') loadBooks();
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

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

  const handleAddBook = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await createBook({
        title: addForm.title,
        author: addForm.author || undefined,
        isbn: addForm.isbn || undefined,
        category: addForm.category || undefined,
        totalCopies: Number(addForm.totalCopies) || 1,
      });
      if ('error' in res) {
        message.error(res.error);
      } else {
        message.success('Libro agregado');
        setAddFormOpen(false);
        setAddForm({ title: '', author: '', isbn: '', category: '', totalCopies: '1' });
        loadBooks();
      }
    } catch (e: any) {
      message.error(e.message || 'Error al agregar libro');
    }
  };

  const handleDeleteBook = async (id: string) => {
    if (!confirm('¿Eliminar este libro del catálogo?')) return;
    try {
      const res = await deleteBook(id);
      if ('error' in res) message.error(res.error);
      else {
        message.success('Libro eliminado');
        loadBooks();
      }
    } catch (e: any) {
      message.error(e.message || 'Error al eliminar');
    }
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkoutBookId || !selectedStudentId || !dueDate) {
      message.error('Completa todos los campos');
      return;
    }
    try {
      const res = await checkoutBook(checkoutBookId, selectedStudentId, new Date(dueDate).toISOString());
      if ('error' in res) {
        message.error(res.error);
      } else {
        message.success('Préstamo registrado');
        setCheckoutBookId(null);
        setSelectedStudentId('');
        setStudentSearch('');
        setDueDate('');
        loadBooks();
      }
    } catch (e: any) {
      message.error(e.message || 'Error al prestar');
    }
  };

  const handleReturn = async (loanId: string) => {
    try {
      const res = await returnBook(loanId);
      if ('error' in res) message.error(res.error);
      else {
        message.success('Devolución registrada');
        loadLoans();
      }
    } catch (e: any) {
      message.error(e.message || 'Error al registrar devolución');
    }
  };

  return (
    <DashboardLayout roleTitle="Admin / Control Escolar" userName="Administrador" userRole="Administrador" menuGroups={menuGroups} breadcrumbs={['Admin', 'Biblioteca']}>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Biblioteca</h1>
        {tab === 'catalog' && (
          <button onClick={() => setAddFormOpen(true)} className="flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800">
            <span className="material-symbols-outlined text-lg">add</span>
            Agregar libro
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6 flex">
        <button onClick={() => setTab('catalog')} className={`flex-1 py-3 text-sm font-medium border-b-2 ${tab === 'catalog' ? 'border-blue-600 text-blue-600 bg-blue-50/50' : 'border-transparent text-gray-500'}`}>
          Catálogo
        </button>
        <button onClick={() => setTab('loans')} className={`flex-1 py-3 text-sm font-medium border-b-2 ${tab === 'loans' ? 'border-blue-600 text-blue-600 bg-blue-50/50' : 'border-transparent text-gray-500'}`}>
          Préstamos activos
        </button>
      </div>

      {tab === 'catalog' ? (
        <>
          <input
            type="text"
            placeholder="Buscar por título o autor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full max-w-md mb-4 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
          />
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            {loading ? (
              <div className="p-12 text-center text-gray-500">Cargando...</div>
            ) : books.length === 0 ? (
              <div className="p-12 text-center text-gray-500">Sin libros en el catálogo.</div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50/50 text-gray-600 font-medium border-b border-gray-100">
                  <tr>
                    <th className="px-5 py-3">Título</th>
                    <th className="px-5 py-3">Autor</th>
                    <th className="px-5 py-3">Categoría</th>
                    <th className="px-5 py-3 text-center">Disponibles</th>
                    <th className="px-5 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {books.map((b) => (
                    <tr key={b.id}>
                      <td className="px-5 py-3 font-medium text-gray-900">{b.title}</td>
                      <td className="px-5 py-3 text-gray-600">{b.author || '—'}</td>
                      <td className="px-5 py-3 text-gray-600">{b.category || '—'}</td>
                      <td className="px-5 py-3 text-center">{b.availableCopies}/{b.totalCopies}</td>
                      <td className="px-5 py-3 text-right">
                        <button
                          onClick={() => setCheckoutBookId(b.id)}
                          disabled={b.availableCopies < 1}
                          className="text-xs text-blue-600 hover:underline mr-3 disabled:text-gray-300"
                        >
                          Prestar
                        </button>
                        <button onClick={() => handleDeleteBook(b.id)} className="text-xs text-red-600 hover:underline">
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-gray-500">Cargando...</div>
          ) : loans.length === 0 ? (
            <div className="p-12 text-center text-gray-500">No hay préstamos activos.</div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50/50 text-gray-600 font-medium border-b border-gray-100">
                <tr>
                  <th className="px-5 py-3">Libro</th>
                  <th className="px-5 py-3">Alumno</th>
                  <th className="px-5 py-3">Vence</th>
                  <th className="px-5 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loans.map((l) => (
                  <tr key={l.id}>
                    <td className="px-5 py-3 font-medium text-gray-900">{l.bookTitle}</td>
                    <td className="px-5 py-3 text-gray-600">{l.studentName}</td>
                    <td className="px-5 py-3">
                      <span className={l.isOverdue ? 'text-red-600 font-semibold' : 'text-gray-600'}>
                        {new Date(l.dueDate).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                        {l.isOverdue ? ' (vencido)' : ''}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button onClick={() => handleReturn(l.id)} className="text-xs text-blue-600 hover:underline">
                        Registrar devolución
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {addFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-lg font-bold text-gray-900">Agregar libro</h3>
              <button onClick={() => setAddFormOpen(false)} className="text-gray-400 hover:text-gray-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleAddBook} className="p-6 space-y-4">
              <input required placeholder="Título *" value={addForm.title} onChange={(e) => setAddForm({ ...addForm, title: e.target.value })} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg" />
              <input placeholder="Autor" value={addForm.author} onChange={(e) => setAddForm({ ...addForm, author: e.target.value })} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg" />
              <div className="grid grid-cols-2 gap-3">
                <input placeholder="ISBN" value={addForm.isbn} onChange={(e) => setAddForm({ ...addForm, isbn: e.target.value })} className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg" />
                <input placeholder="Categoría" value={addForm.category} onChange={(e) => setAddForm({ ...addForm, category: e.target.value })} className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg" />
              </div>
              <input type="number" min={1} placeholder="Copias" value={addForm.totalCopies} onChange={(e) => setAddForm({ ...addForm, totalCopies: e.target.value })} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg" />
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

      {checkoutBookId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-lg font-bold text-gray-900">Prestar libro</h3>
              <button onClick={() => setCheckoutBookId(null)} className="text-gray-400 hover:text-gray-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleCheckout} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Alumno</label>
                <input
                  type="text"
                  placeholder="Buscar alumno..."
                  value={selectedStudentId ? studentOptions.find((s) => s.id === selectedStudentId)?.fullName ?? studentSearch : studentSearch}
                  onChange={(e) => {
                    setStudentSearch(e.target.value);
                    setSelectedStudentId('');
                  }}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg"
                />
                {studentOptions.length > 0 && !selectedStudentId && (
                  <div className="mt-1 border border-gray-200 rounded-lg max-h-40 overflow-y-auto">
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de devolución</label>
                <input type="date" required value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setCheckoutBookId(null)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">
                  Cancelar
                </button>
                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800">
                  Confirmar préstamo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
