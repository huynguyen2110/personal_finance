'use client';

import Sidebar from './Sidebar';
import TopBar from './TopBar';
import { SidebarProvider, useSidebar } from './SidebarContext';

// Khung trang: header sticky + sidebar cố định + nội dung (class core-* trong app/layout.css)
function LayoutShell({ children }: { children: React.ReactNode }) {
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
      <TopBar />
      <div className="core-body">
        {/* Lớp phủ mờ khi mở drawer trên màn nhỏ */}
        <div
          className={`core-sidebar-overlay${mobileOpen ? ' core-sidebar-overlay--visible' : ''}`}
          onClick={() => setMobileOpen(false)}
          aria-hidden
        />
        <Sidebar />
        <main className="core-main">{children}</main>
      </div>
    </div>
  );
}

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <LayoutShell>{children}</LayoutShell>
    </SidebarProvider>
  );
}
