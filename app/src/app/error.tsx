'use client';

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-sm w-full bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
        <span className="material-symbols-outlined text-4xl text-gray-300">inbox</span>
        <h2 className="mt-3 text-lg font-semibold text-gray-900">No hay información disponible</h2>
        <p className="mt-1 text-sm text-gray-500">Todavía no hay datos para esta sección, o algo salió mal al cargarla.</p>
        <button
          onClick={() => reset()}
          className="mt-5 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800"
        >
          Reintentar
        </button>
      </div>
    </div>
  );
}
