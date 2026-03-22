'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Bell, GitBranch, FolderOpen,
  FlaskConical, Settings, LogOut, Shield, ChevronLeft,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useUIStore } from '@/stores/uiStore';
import { clsx } from 'clsx';

const NAV_CORE = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/alerts', label: 'Alerts', icon: Bell, badge: true },
  { href: '/graph-explorer', label: 'Graph Explorer', icon: GitBranch },
];

const NAV_INVESTIGATION = [
  { href: '/cases', label: 'Cases', icon: FolderOpen },
  { href: '/simulator', label: 'Simulator', icon: FlaskConical },
  { href: '/admin', label: 'Admin', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { sidebarCollapsed, setSidebarCollapsed } = useUIStore();

  return (
    <aside
      className={clsx(
        'flex flex-col h-screen bg-bg-1 border-r border-border sticky top-0 transition-all duration-300 z-40',
        sidebarCollapsed ? 'w-16' : 'w-56'
      )}
    >
      {/* Logo */}
      <div className={clsx(
        'flex items-center gap-3 px-4 py-5 border-b border-border',
        sidebarCollapsed && 'justify-center px-2'
      )}>
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-accent/20 border border-accent/30 flex items-center justify-center">
          <Shield size={15} className="text-accent" />
        </div>
        {!sidebarCollapsed && (
          <div>
            <p className="text-sm font-bold font-display text-text tracking-wide">AnomaNet</p>
            <p className="text-[9px] font-mono text-text-3 uppercase tracking-widest">FIU Intelligence</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-6">
        <div>
          {!sidebarCollapsed && (
            <p className="section-label px-2 mb-2">Core</p>
          )}
          <div className="space-y-0.5">
            {NAV_CORE.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(href + '/');
              return (
                <Link
                  key={href}
                  href={href}
                  title={sidebarCollapsed ? label : undefined}
                  className={clsx(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150',
                    sidebarCollapsed && 'justify-center px-0',
                    active
                      ? 'text-text bg-accent/10 border border-accent/20'
                      : 'text-text-2 hover:text-text hover:bg-surface-2'
                  )}
                >
                  <Icon size={16} className={active ? 'text-accent' : ''} />
                  {!sidebarCollapsed && <span>{label}</span>}
                </Link>
              );
            })}
          </div>
        </div>

        <div>
          {!sidebarCollapsed && (
            <p className="section-label px-2 mb-2">Investigation</p>
          )}
          <div className="space-y-0.5">
            {NAV_INVESTIGATION.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(href + '/');
              return (
                <Link
                  key={href}
                  href={href}
                  title={sidebarCollapsed ? label : undefined}
                  className={clsx(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150',
                    sidebarCollapsed && 'justify-center px-0',
                    active
                      ? 'text-text bg-accent/10 border border-accent/20'
                      : 'text-text-2 hover:text-text hover:bg-surface-2'
                  )}
                >
                  <Icon size={16} className={active ? 'text-accent' : ''} />
                  {!sidebarCollapsed && <span>{label}</span>}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* User footer */}
      <div className="border-t border-border p-3 space-y-1">
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-text-3 hover:text-text hover:bg-surface-2 transition-colors text-xs"
        >
          <ChevronLeft size={14} className={clsx('transition-transform', sidebarCollapsed && 'rotate-180')} />
          {!sidebarCollapsed && <span>Collapse</span>}
        </button>

        {!sidebarCollapsed && user && (
          <div className="flex items-center gap-2 px-3 py-2">
            <div className="w-7 h-7 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center text-[11px] font-bold text-accent">
              {user.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-text truncate">{user.name}</p>
              <p className="text-[10px] text-text-3 capitalize">{user.role.toLowerCase()}</p>
            </div>
            <button onClick={logout} className="text-text-3 hover:text-danger transition-colors">
              <LogOut size={13} />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
