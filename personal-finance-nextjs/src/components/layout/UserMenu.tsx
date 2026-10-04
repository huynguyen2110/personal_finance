'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, KeyRound, LogOut } from 'lucide-react';
import { getStoredUser, type StoredUser } from '@/lib/auth-storage';
import { logout } from '@/modules/auth/lib';
import ChangePasswordModal from '@/modules/auth/components/ChangePasswordModal';
import { useDismiss } from './useDismiss';

// Avatar + dropdown tài khoản (dùng chung cho header của launcher và của từng module)
export default function UserMenu() {
  const [user, setUser] = useState<StoredUser | null>(null);
  const [open, setOpen] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(ref, open, close);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage chỉ đọc được sau khi mount
    setUser(getStoredUser());
  }, []);

  const initials = user?.username ? user.username.slice(0, 2).toUpperCase() : '?';

  return (
    <div className="header-right" ref={ref}>
      <button type="button" className="header-right-user" onClick={() => setOpen((v) => !v)} aria-haspopup="menu" aria-expanded={open} aria-label="Tài khoản">
        <span className="header-right-avatar">{initials}</span>
        <ChevronDown className="header-right-user-arrow" size={14} />
      </button>

      {open && (
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
            className="header-right-menu-item"
            onClick={() => {
              setOpen(false);
              setChangingPassword(true);
            }}
          >
            <KeyRound size={16} />
            Đổi mật khẩu
          </button>
          <button type="button" role="menuitem" className="header-right-menu-item header-right-menu-item--danger" onClick={() => logout()}>
            <LogOut size={16} />
            Đăng xuất
          </button>
        </div>
      )}
      {/* Portal ra body: header là stacking context (z-index) nên modal đặt bên trong sẽ bị sidebar đè */}
      {changingPassword && createPortal(<ChangePasswordModal onClose={() => setChangingPassword(false)} />, document.body)}
    </div>
  );
}
