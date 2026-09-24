'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getNotifications, type NotificationItem } from '@/actions/notifications';

export default function NotificationsBell() {
  const pathname = usePathname();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [open, setOpen] = useState(false);

  // Se recalcula al navegar, igual que el resto de la app (revalidatePath). Sin polling.
  useEffect(() => {
    getNotifications()
      .then((res) => setItems(res.items))
      .catch(() => setItems([]));
  }, [pathname]);

  return (
    <div className="relative">
      <button
        className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg relative"
        onClick={() => setOpen((v) => !v)}
        aria-label="Notificaciones"
      >
        <span className="material-symbols-outlined">notifications</span>
        {items.length > 0 && (
          <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white" />
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-100 z-40 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 text-sm font-medium text-gray-900">Notificaciones</div>
            {items.length === 0 ? (
              <div className="px-4 py-6 text-sm text-gray-400 text-center">Todo al día</div>
            ) : (
              items.map((n) => (
                <Link
                  key={n.key}
                  href={n.href}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 no-underline border-b border-gray-50 last:border-0"
                >
                  <span className="material-symbols-outlined text-gray-400">{n.icon}</span>
                  <span className="flex-1 text-sm text-gray-700">{n.label}</span>
                  <span className="text-xs font-semibold text-white bg-red-500 rounded-full px-2 py-0.5">{n.count}</span>
                </Link>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
