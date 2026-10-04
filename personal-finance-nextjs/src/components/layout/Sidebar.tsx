'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { X } from 'lucide-react';
import { activeNavHref, getModule, type AppModuleId } from '@/config/modules';
import { useSidebar } from './SidebarContext';

// Menu của module đang mở (nhóm có tiêu đề), lấy từ src/config/modules.ts
export default function Sidebar({ moduleId }: { moduleId: AppModuleId }) {
  const pathname = usePathname();
  const mod = getModule(moduleId);
  const active = activeNavHref(pathname, mod);
  const { collapsed, mobileOpen, setMobileOpen } = useSidebar();

  const className = [
    'core-sidebar',
    collapsed ? 'core-sidebar--collapsed' : '',
    mobileOpen ? 'core-sidebar--mobile-open' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <aside className={className} aria-label="Menu chính">
      <div className="core-sidebar-header">
        <Link href={mod.home} className="core-sidebar-logo" onClick={() => setMobileOpen(false)}>
          <span className="core-sidebar-logo-mark" style={{ background: `linear-gradient(135deg, ${mod.from}, ${mod.to})` }}>
            <mod.icon size={20} />
          </span>
          <span className="core-sidebar-logo-text">
            <strong>{mod.name}</strong>
          </span>
        </Link>
        <button
          type="button"
          className="core-sidebar-close-mobile"
          onClick={() => setMobileOpen(false)}
          aria-label="Đóng menu"
        >
          <X size={20} />
        </button>
      </div>

      <nav className="core-sidebar-menu">
        <div className="core-menu">
          {mod.nav.map((group) => (
            <div key={group.heading} className="core-menu-group">
              <div className="core-menu-heading">{group.heading}</div>
              {group.items.map((item) => {
                const isActive = item.href === active;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    title={collapsed ? item.label : undefined}
                    aria-current={isActive ? 'page' : undefined}
                    className={`core-menu-item${isActive ? ' core-menu-item--active' : ''}`}
                  >
                    <span className="core-menu-item-icon">
                      <item.icon />
                    </span>
                    <span className="core-menu-item-label">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </div>
      </nav>
    </aside>
  );
}
