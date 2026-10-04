'use client';

import Link from 'next/link';
import { Menu } from 'lucide-react';
import { getModule, type AppModuleId } from '@/config/modules';
import { useSidebar } from './SidebarContext';
import SidebarToggleIcon from './SidebarToggleIcon';
import ModuleSwitcher from './ModuleSwitcher';
import UserMenu from './UserMenu';

// Header của một module (tham khảo CoreLayout e-learning): trái = thu gọn/hamburger + chuyển module, phải = tài khoản
export default function TopBar({ moduleId }: { moduleId: AppModuleId }) {
  const { collapsed, toggleCollapsed, setMobileOpen } = useSidebar();
  const mod = getModule(moduleId);

  return (
    <header className="core-header">
      <div className="core-header-inner">
        <div className="core-header-left">
          <button type="button" className="core-sidebar-toggle core-header-hamburger" onClick={() => setMobileOpen(true)} aria-label="Mở menu">
            <Menu size={20} />
          </button>
          <button
            type="button"
            className="core-sidebar-toggle core-header-sidebar-toggle"
            onClick={toggleCollapsed}
            aria-label={collapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
            title={collapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
          >
            <SidebarToggleIcon collapsed={collapsed} />
          </button>
          <ModuleSwitcher current={moduleId} />
          <Link href={mod.home} className="core-header-mobile-logo">
            <span className="core-sidebar-logo-mark" style={{ background: `linear-gradient(135deg, ${mod.from}, ${mod.to})` }}>
              <mod.icon size={16} />
            </span>
            {mod.name}
          </Link>
        </div>

        <div className="core-header-right">
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
