'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { logOut } from '@/actions/authActions';
import { getTenantProfile } from '@/actions/settings';
import NotificationsBell from './NotificationsBell';
import GlobalSearch from './GlobalSearch';

interface NavItem {
  key: string;
  icon: string; // Material Symbols icon name
  label: string;
  href: string;
  badge?: number;
}

interface MenuGroup {
  title: string;
  items: NavItem[];
}

interface DashboardLayoutProps {
  children: React.ReactNode;
  roleTitle: string;
  userName?: string;
  userRole?: string;
  menuGroups: MenuGroup[];
  breadcrumbs?: string[];
  headerAction?: React.ReactNode;
}

export default function DashboardLayout({
  children,
  userName = 'Usuario Activo',
  userRole = 'Administrador',
  menuGroups,
  breadcrumbs = [],
  headerAction,
}: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const pathname = usePathname();
  const router = useRouter();
  const [branding, setBranding] = useState({ name: 'APPSSCHOLL', logoUrl: '' });

  useEffect(() => {
    getTenantProfile()
      .then((profile) => setBranding({ name: profile.name || 'APPSSCHOLL', logoUrl: profile.logoUrl || '' }))
      .catch(() => {});
  }, []);

  return (
    <div className="h-screen overflow-hidden flex items-center justify-center p-3 bg-gray-200">
      <div className="w-full max-w-[1600px] h-[96vh] bg-[#F0F0F0] rounded-3xl shadow-2xl flex overflow-hidden border border-white/50 relative">
        {/* Sidebar */}
        <aside
          className={`${sidebarOpen ? 'w-72' : 'w-20'} flex flex-col flex-shrink-0 h-full overflow-y-auto pt-8 pb-6 px-6 transition-all duration-300 relative z-10`}
        >
          {/* Logo */}
          <div className="flex items-center justify-between mb-10">
            <Link href="/" className="flex items-center gap-3 no-underline">
              {branding.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={branding.logoUrl} alt={branding.name} className="w-10 h-10 rounded-xl object-cover shadow-lg flex-shrink-0" />
              ) : (
                <div className="w-10 h-10 bg-gray-900 text-white rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                  <span className="material-symbols-outlined text-xl">school</span>
                </div>
              )}
              {sidebarOpen && (
                <span className="font-bold text-lg tracking-tight text-gray-800">
                  {branding.name}
                </span>
              )}
            </Link>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-black/5 rounded-lg transition-colors text-gray-500"
            >
              <span className="material-symbols-outlined text-xl">
                {sidebarOpen ? 'left_panel_close' : 'left_panel_open'}
              </span>
            </button>
          </div>

          {/* Navigation Groups */}
          <div className="flex-1 space-y-6">
            {menuGroups.map((group, gi) => (
              <div key={gi} className="space-y-1">
                {sidebarOpen && (
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-3">
                    {group.title}
                  </h3>
                )}
                {group.items.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.key}
                      href={item.href}
                      className={`nav-item ${isActive ? 'active' : ''} ${!sidebarOpen ? 'justify-center px-0' : ''}`}
                      title={!sidebarOpen ? item.label : undefined}
                    >
                      <span className="material-symbols-outlined text-xl">{item.icon}</span>
                      {sidebarOpen && <span>{item.label}</span>}
                      {sidebarOpen && item.badge && (
                        <span className="ml-auto flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-gray-900 rounded-full">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            ))}
          </div>

          {/* User Profile */}
          <div className="mt-auto pt-4 relative group">
            <div
              className={`p-3 bg-white rounded-2xl shadow-sm border border-gray-200 flex items-center gap-3 cursor-pointer hover:bg-gray-50 transition-colors no-underline ${!sidebarOpen ? 'justify-center p-2' : ''}`}
            >
              <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
                {userName.charAt(0).toUpperCase()}
              </div>
              {sidebarOpen && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{userName}</p>
                  <p className="text-xs text-gray-500 truncate">{userRole}</p>
                </div>
              )}
              {sidebarOpen && (
                <span className="material-symbols-outlined text-gray-400 text-lg group-hover:rotate-180 transition-transform">expand_more</span>
              )}
            </div>
            
            {/* Dropdown Menu */}
            <div className="absolute bottom-full left-0 w-full mb-2 bg-white rounded-xl shadow-lg border border-gray-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 overflow-hidden z-50">
              <Link href="/profile" className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors border-b border-gray-100">
                <span className="material-symbols-outlined text-lg">person</span>
                Mi Perfil
              </Link>
              <button 
                onClick={async () => {
                  await logOut();
                  router.push('/login');
                  router.refresh();
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors text-left"
              >
                <span className="material-symbols-outlined text-lg">logout</span>
                Cerrar Sesión
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 bg-white m-3 rounded-2xl shadow-inner overflow-hidden flex flex-col relative border border-white/60">
          {/* Header */}
          <header className="h-16 border-b border-gray-100 flex items-center justify-between px-8 bg-white/80 backdrop-blur-md sticky top-0 z-20">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Link href="/" className="hover:text-gray-800 cursor-pointer no-underline text-gray-500">
                {branding.name}
              </Link>
              {breadcrumbs.map((crumb, i) => (
                <React.Fragment key={i}>
                  <span className="material-symbols-outlined text-base text-gray-300">chevron_right</span>
                  <span className={i === breadcrumbs.length - 1 ? 'font-medium text-gray-900' : 'hover:text-gray-800 cursor-pointer'}>
                    {crumb}
                  </span>
                </React.Fragment>
              ))}
            </div>
            <div className="flex items-center gap-4">
              <GlobalSearch />
              <NotificationsBell />
              {headerAction}
            </div>
          </header>

          {/* Page Content */}
          <div className="flex-1 overflow-y-auto p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
