'use client';

import { useCallback, useRef, useState } from 'react';
import Link from 'next/link';
import { Check, House, LayoutGrid } from 'lucide-react';
import { APP_MODULES, type AppModuleId } from '@/config/modules';
import ModuleIcon from '@/modules/launcher/components/ModuleIcon';
import { useDismiss } from './useDismiss';

// Nút lưới ở header: về trang chủ (launcher) hoặc chuyển sang module khác
export default function ModuleSwitcher({ current }: { current: AppModuleId }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(ref, open, close);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        className="core-sidebar-toggle"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Chuyển module"
        title="Chuyển module"
      >
        <LayoutGrid size={18} />
      </button>

      {open && (
        <div className="header-right-menu !left-0 !right-auto !w-72" role="menu">
          <Link href="/" role="menuitem" className="header-right-menu-item" onClick={close}>
            <House size={16} /> Trang chủ
          </Link>
          <div className="my-1.5 border-t border-slate-100" />
          <p className="px-2 pb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">Module</p>
          {APP_MODULES.map((m) => (
            <Link key={m.id} href={m.home} role="menuitem" className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-slate-50" onClick={close} aria-current={m.id === current ? 'page' : undefined}>
              <ModuleIcon module={m} size="sm" />
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-semibold text-slate-900 truncate">{m.name}</span>
                <span className="block text-[11px] text-slate-500 truncate">{m.description}</span>
              </span>
              {m.id === current && <Check size={16} className="text-teal-700 shrink-0" aria-hidden />}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
