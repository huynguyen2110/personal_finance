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
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import { useSidebar } from './SidebarContext';

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Tổng quan' },
  { href: '/transactions', icon: ListOrdered, label: 'Giao dịch' },
  { href: '/reports', icon: ChartColumn, label: 'Thống kê' },
  { href: '/budgets', icon: Target, label: 'Ngân sách' },
  { href: '/goals', icon: PiggyBank, label: 'Mục tiêu tiết kiệm' },
  { href: '/categories', icon: Tags, label: 'Danh mục & Quy tắc' },
  { href: '/accounts', icon: Landmark, label: 'Tài khoản' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { collapsed, toggleCollapsed, mobileOpen, setMobileOpen } = useSidebar();

  return (
    <aside
      className={`fixed left-0 top-0 h-screen bg-white/95 backdrop-blur-xl border-r border-slate-200
        z-50 flex flex-col transition-[width,transform] duration-300
        w-[240px] ${collapsed ? 'md:w-[72px]' : 'md:w-[240px]'}
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}
    >
      <div className="flex items-center gap-3 px-4 h-16 border-b border-slate-200">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center flex-shrink-0">
          <Wallet className="w-5 h-5 text-white" />
        </div>
        <div className={`min-w-0 ${collapsed ? 'md:hidden' : ''}`}>
          <h1 className="text-sm font-bold text-text font-heading truncate">Chi tiêu cá nhân</h1>
          <p className="text-[10px] text-text-muted">Đọc email ngân hàng</p>
        </div>
        <button
          onClick={() => setMobileOpen(false)}
          className="ml-auto md:hidden btn-icon !p-1.5"
          aria-label="Đóng menu"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              title={item.label}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200
                ${isActive
                  ? 'bg-primary/10 text-primary border border-primary/20'
                  : 'text-text-secondary hover:bg-surface-light hover:text-text border border-transparent'
                }
                ${collapsed ? 'md:justify-center' : ''}
              `}
            >
              <item.icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-primary' : ''}`} />
              <span className={`text-sm font-medium ${collapsed ? 'md:hidden' : ''}`}>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <button
        onClick={toggleCollapsed}
        className="hidden md:flex items-center justify-center h-12 border-t border-slate-200
          text-text-muted hover:text-text hover:bg-slate-100 transition-all duration-200"
        aria-label="Thu gọn menu"
      >
        {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>
    </aside>
  );
}
