import React from 'react';
import Link from 'next/link';

export default function UnderConstructionPage(props: {
  title: string;
  description?: string;
  backHref: string;
  backLabel?: string;
}) {
  return (
    <div className="max-w-3xl mx-auto py-16 px-6">
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-8">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined">construction</span>
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold text-amber-700 uppercase tracking-wide">En construcción</div>
            <h1 className="text-2xl font-bold text-gray-900 mt-1">{props.title}</h1>
            <p className="text-gray-600 mt-2">
              {props.description ?? 'Esta sección aún no está implementada. Estamos trabajando para tenerla lista pronto.'}
            </p>
            <div className="mt-6 flex gap-3">
              <Link
                href={props.backHref}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 transition-colors"
              >
                <span className="material-symbols-outlined text-base">arrow_back</span>
                {props.backLabel ?? 'Volver'}
              </Link>
              <Link
                href="/profile"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-gray-200 text-gray-700 text-sm font-semibold hover:bg-gray-50 transition-colors"
              >
                <span className="material-symbols-outlined text-base">person</span>
                Mi perfil
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
