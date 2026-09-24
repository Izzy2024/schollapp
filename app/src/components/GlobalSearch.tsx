'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { globalSearch, type SearchResult } from '@/actions/search';

export default function GlobalSearch() {
  const [enabled, setEnabled] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    globalSearch('')
      .then((res) => setEnabled(res.enabled))
      .catch(() => setEnabled(false));
  }, []);

  // Se consulta al dejar de teclear; sin debounce cada letra dispararía un round-trip.
  useEffect(() => {
    const q = query.trim();
    const timer = setTimeout(() => {
      if (q.length < 2) {
        setResults([]);
        return;
      }
      globalSearch(q)
        .then((res) => setResults(res.results))
        .catch(() => setResults([]));
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  if (!enabled) return null;

  return (
    <div className="relative hidden lg:block">
      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">search</span>
      <input
        className="pl-10 pr-4 py-2 bg-gray-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-gray-900 w-64 text-gray-900 placeholder-gray-400 outline-none"
        placeholder="Buscar alumno o personal..."
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
      />

      {open && query.trim().length >= 2 && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute left-0 mt-2 w-96 bg-white rounded-xl shadow-xl border border-gray-100 z-40 overflow-hidden max-h-96 overflow-y-auto">
            {results.length === 0 ? (
              <div className="px-4 py-6 text-sm text-gray-400 text-center">Sin resultados</div>
            ) : (
              results.map((r) => (
                <Link
                  key={`${r.kind}-${r.id}`}
                  href={r.href}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 no-underline border-b border-gray-50 last:border-0"
                >
                  <span className="material-symbols-outlined text-gray-400">
                    {r.kind === 'student' ? 'school' : 'badge'}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm text-gray-900 truncate">{r.title}</span>
                    <span className="block text-xs text-gray-400 truncate">{r.subtitle}</span>
                  </span>
                </Link>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
