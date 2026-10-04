'use client';

import Sidebar from './Sidebar';
import TopBar from './TopBar';
import { SidebarProvider, useSidebar } from './SidebarContext';
import type { AppModuleId } from '@/config/modules';

// Khung trang của một module: header sticky + sidebar cố định + nội dung (class core-* trong app/layout.css)
function LayoutShell({ moduleId, children }: { moduleId: AppModuleId; children: React.ReactNode }) {
  const { collapsed, ready, mobileOpen, setMobileOpen } = useSidebar();

  const className = [
    'core-layout',
    collapsed ? 'core-layout--collapsed' : '',
    ready ? '' : 'core-layout--no-transition',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={className}>
      <TopBar moduleId={moduleId} />
      <div className="core-body">
        {/* Lớp phủ mờ khi mở drawer trên màn nhỏ */}
        <div
          className={`core-sidebar-overlay${mobileOpen ? ' core-sidebar-overlay--visible' : ''}`}
          onClick={() => setMobileOpen(false)}
          aria-hidden
        />
        <Sidebar moduleId={moduleId} />
        <main className="core-main">{children}</main>
      </div>
    </div>
  );
}

export default function MainLayout({ moduleId, children }: { moduleId: AppModuleId; children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <LayoutShell moduleId={moduleId}>{children}</LayoutShell>
    </SidebarProvider>
  );
}
