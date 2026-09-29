'use client';

import { LogOut, Menu } from 'lucide-react';
import { useEffect, useState } from 'react';
import { logout } from '@/app/login/actions';
import { useSidebar } from './SidebarContext';

interface HeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export default function Header({ title, subtitle, actions }: HeaderProps) {
  const [username, setUsername] = useState<string | null>(null);
  const { setMobileOpen } = useSidebar();

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data && setUsername(data.username))
      .catch(() => {});
  }, []);

  return (
    <header className="flex flex-wrap items-center justify-between min-h-16 px-4 md:px-6 py-3 gap-3">
      <div className="flex items-center gap-2 min-w-0">
        <button
          onClick={() => setMobileOpen(true)}
          className="btn-icon md:hidden flex-shrink-0"
          aria-label="Mở menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="min-w-0">
          <h1 className="text-lg md:text-xl font-bold text-text font-heading truncate">{title}</h1>
          {subtitle && <p className="text-xs md:text-sm text-text-secondary mt-0.5 truncate">{subtitle}</p>}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 md:gap-3">
        {actions}
        {username && (
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center">
              <span className="text-xs font-bold text-white">{username.slice(0, 2).toUpperCase()}</span>
            </div>
            <form action={logout}>
              <button type="submit" className="btn-icon" title="Đăng xuất" aria-label="Đăng xuất">
                <LogOut className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}
      </div>
    </header>
  );
}
