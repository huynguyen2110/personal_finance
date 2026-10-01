'use client';

import Sidebar from './Sidebar';
import { SidebarProvider, useSidebar } from './SidebarContext';

function LayoutShell({ children }: { children: React.ReactNode }) {
  const { collapsed, mobileOpen, setMobileOpen } = useSidebar();

  return (
    <div className="min-h-screen bg-surface-dark">
      <Sidebar />

      {/* Lớp phủ mờ khi mở drawer trên mobile */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          aria-hidden
        />
      )}

      <main
        className={`transition-all duration-300 min-h-screen
          ${collapsed ? 'md:ml-[72px]' : 'md:ml-[240px]'}`}
      >
        {children}
      </main>
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
