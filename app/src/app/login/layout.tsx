import React from 'react';

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-blue-50 via-gray-50 to-gray-100 flex flex-col justify-center py-10 sm:py-12">
      {/* Decorative animated blobs */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-blue-200/50 blur-3xl animate-blob" />
        <div className="absolute top-1/3 -right-24 h-80 w-80 rounded-full bg-indigo-200/40 blur-3xl animate-blob animation-delay-2000" />
        <div className="absolute -bottom-24 left-1/4 h-72 w-72 rounded-full bg-sky-200/40 blur-3xl animate-blob animation-delay-4000" />
      </div>

      <main className="relative w-full px-4 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
