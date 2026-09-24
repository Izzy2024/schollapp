import React from 'react';

export default function ActivarLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 selection:bg-blue-100 selection:text-blue-900">
      {children}
    </div>
  );
}
