'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, LogOut, Menu, Wallet } from 'lucide-react';
import { getStoredUser, type StoredUser } from '@/lib/auth-storage';
import { logout } from '@/modules/auth/lib';
import { useSidebar } from './SidebarContext';
import SidebarToggleIcon from './SidebarToggleIcon';

// Header toàn cục (tham khảo CoreLayout e-learning): trái = nút thu gọn/hamburger, phải = tài khoản
export default function TopBar() {
  const { collapsed, toggleCollapsed, setMobileOpen } = useSidebar();
  const [user, setUser] = useState<StoredUser | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage chỉ đọc được sau khi mount
    setUser(getStoredUser());
  }, []);

  // Đóng dropdown khi bấm ra ngoài hoặc nhấn Esc
  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

  const initials = user?.username ? user.username.slice(0, 2).toUpperCase() : '?';

  return (
    <header className="core-header">
      <div className="core-header-inner">
        <div className="core-header-left">
          <button
            type="button"
            className="core-sidebar-toggle core-header-hamburger"
            onClick={() => setMobileOpen(true)}
            aria-label="Mở menu"
          >
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
          <Link href="/dashboard" className="core-header-mobile-logo">
            <span className="core-sidebar-logo-mark">
              <Wallet size={16} />
            </span>
            Chi tiêu cá nhân
          </Link>
        </div>

        <div className="core-header-right">
          <div className="header-right" ref={menuRef}>
            <button
              type="button"
              className="header-right-user"
              onClick={() => setMenuOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-label="Tài khoản"
            >
              <span className="header-right-avatar">{initials}</span>
              <ChevronDown className="header-right-user-arrow" size={14} />
            </button>

            {menuOpen && (
              <div className="header-right-menu" role="menu">
                <div className="header-right-menu-profile">
                  <span className="header-right-avatar header-right-avatar--lg">{initials}</span>
                  <div className="min-w-0">
                    <strong>{user?.username ?? 'Người dùng'}</strong>
                    <small>Đang đăng nhập</small>
                  </div>
                </div>
                <button
                  type="button"
                  role="menuitem"
                  className="header-right-menu-item header-right-menu-item--danger"
                  onClick={() => logout()}
                >
                  <LogOut size={16} />
                  Đăng xuất
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
