'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';

// Nhớ trạng thái thu gọn giữa các lần tải trang (giống core-sidebar-collapsed bên e-learning)
const STORAGE_KEY = 'pf_sidebar_collapsed';

interface SidebarContextValue {
  // Thu gọn sidebar trên màn rộng (>1024px)
  collapsed: boolean;
  toggleCollapsed: () => void;
  // Đã đọc xong trạng thái từ localStorage (trước đó tắt animation để không nhảy)
  ready: boolean;
  // Mở/đóng drawer trên màn nhỏ (≤1024px)
  mobileOpen: boolean;
  setMobileOpen: (v: boolean) => void;
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

function safeRead(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [ready, setReady] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage chỉ đọc được sau khi mount
    setCollapsed(safeRead());
    setReady(true);
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
      } catch {
        // localStorage bị chặn (chế độ riêng tư) thì bỏ qua
      }
      return next;
    });
  }, []);

  return (
    <SidebarContext.Provider value={{ collapsed, toggleCollapsed, ready, mobileOpen, setMobileOpen }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar(): SidebarContextValue {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error('useSidebar must be used within SidebarProvider');
  return ctx;
}
