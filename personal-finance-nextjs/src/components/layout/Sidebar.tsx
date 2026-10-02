'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  ListOrdered,
  ChartColumn,
  Target,
  Tags,
  Landmark,
  Wallet,
  PiggyBank,
  Settings,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useSidebar } from './SidebarContext';

interface NavItem {
  href: string;
  icon: LucideIcon;
  label: string;
}

interface NavGroup {
  heading: string;
  items: NavItem[];
}

// Menu chia nhóm có tiêu đề (như group heading bên e-learning)
const menuGroups: NavGroup[] = [
  {
    heading: 'Theo dõi',
    items: [
      { href: '/dashboard', icon: LayoutDashboard, label: 'Tổng quan' },
      { href: '/transactions', icon: ListOrdered, label: 'Giao dịch' },
      { href: '/reports', icon: ChartColumn, label: 'Thống kê' },
    ],
  },
  {
    heading: 'Kế hoạch',
    items: [
      { href: '/budgets', icon: Target, label: 'Ngân sách' },
      { href: '/goals', icon: PiggyBank, label: 'Mục tiêu tiết kiệm' },
    ],
  },
  {
    heading: 'Thiết lập',
    items: [
      { href: '/categories', icon: Tags, label: 'Danh mục & Quy tắc' },
      { href: '/accounts', icon: Landmark, label: 'Tài khoản' },
      { href: '/settings', icon: Settings, label: 'Cài đặt' },
    ],
  },
];

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function Sidebar() {
  const pathname = usePathname();
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
        <Link href="/dashboard" className="core-sidebar-logo" onClick={() => setMobileOpen(false)}>
          <span className="core-sidebar-logo-mark">
            <Wallet size={20} />
          </span>
          <span className="core-sidebar-logo-text">
            <strong>Chi tiêu cá nhân</strong>
            <small>Đọc email ngân hàng</small>
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
          {menuGroups.map((group) => (
            <div key={group.heading} className="core-menu-group">
              <div className="core-menu-heading">{group.heading}</div>
              {group.items.map((item) => {
                const active = isActivePath(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    title={collapsed ? item.label : undefined}
                    aria-current={active ? 'page' : undefined}
                    className={`core-menu-item${active ? ' core-menu-item--active' : ''}`}
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
