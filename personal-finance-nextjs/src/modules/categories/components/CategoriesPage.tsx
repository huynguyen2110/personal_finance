'use client';

import { useCallback, useState } from 'react';
import { FolderTree, History, ListChecks, type LucideIcon } from 'lucide-react';
import Header from '@/components/layout/Header';
import MatchLogTab, { type LogStatus } from '@/modules/rules/components/MatchLogTab';
import RulesTab from '@/modules/rules/components/RulesTab';
import { useRules } from '@/modules/rules/lib';
import { useTransactions } from '@/modules/transactions/lib';
import { useCategories } from '../lib';
import CategoryTreeTab from './CategoryTreeTab';

type Tab = 'rules' | 'tree' | 'logs';

const TABS: { key: Tab; label: string; Icon: LucideIcon }[] = [
  { key: 'rules', label: 'Quy tắc tự động', Icon: ListChecks },
  { key: 'tree', label: 'Cây danh mục', Icon: FolderTree },
  { key: 'logs', label: 'Nhật ký khớp', Icon: History },
];

export default function CategoriesPage() {
  const [tab, setTab] = useState<Tab>('rules');
  const [logPreset, setLogPreset] = useState<{ status: LogStatus; key: number } | null>(null);
  const { data: categories = [] } = useCategories();
  const { data: rules = [] } = useRules();
  // Giao dịch chưa phân loại (mới nhất trước) — dùng cho số "chờ xử lý" và gợi ý quy tắc
  const { data: pendingData } = useTransactions({ categoryId: 'none', pageSize: 10, sort: 'date_desc' });
  const pending = { items: pendingData?.items ?? [], total: pendingData?.total ?? 0 };
  const activeRules = rules.filter((r) => r.isActive).length;

  const goToPending = useCallback(() => {
    setLogPreset({ status: 'NONE', key: Date.now() });
    setTab('logs');
  }, []);

  const counts: Record<Tab, number> = { rules: rules.length, tree: categories.length, logs: pending.total };

  return (
    <div className="font-jakarta">
      <Header title="Danh mục & Quy tắc" subtitle="Cấu trúc phân loại thu – chi và bộ quy tắc tự động nhận diện giao dịch từ nội dung chuyển khoản" />

      <div className="px-4 md:px-6 pb-8 flex flex-col gap-4 md:gap-6">
        {/* Thanh tab */}
        <section className="fin-card p-1.5 flex flex-col md:flex-row md:items-center justify-between gap-2">
          <div className="flex items-center gap-1 p-0.5 rounded-xl bg-slate-100 overflow-x-auto" role="tablist" aria-label="Khu vực">
            {TABS.map(({ key, label, Icon }) => {
              const active = tab === key;
              const warn = key === 'logs' && pending.total > 0;
              return (
                <button
                  key={key}
                  role="tab"
                  aria-selected={active}
                  onClick={() => setTab(key)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors ${
                    active ? 'bg-teal-700 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                  }`}
                >
                  <Icon className="w-4 h-4" aria-hidden />
                  {label}
                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] font-bold fin-num leading-none ${
                      active ? 'bg-white/20 text-white' : warn ? 'bg-amber-100 text-amber-800' : 'bg-white text-slate-600'
                    }`}
                  >
                    {counts[key]}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="hidden lg:flex items-center gap-2 pr-2 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-700" aria-hidden />
              Quy tắc đang bật: <strong className="text-slate-900 fin-num">{activeRules}/{rules.length}</strong>
            </span>
            <span className="text-slate-300">|</span>
            <button type="button" className="inline-flex items-center gap-1.5 hover:text-slate-900" onClick={goToPending}>
              <span className={`w-1.5 h-1.5 rounded-full ${pending.total ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} aria-hidden />
              Chờ phân loại: <strong className={`fin-num ${pending.total ? 'text-amber-800' : 'text-slate-900'}`}>{pending.total}</strong>
            </button>
          </div>
        </section>

        {tab === 'rules' && <RulesTab categories={categories} rules={rules} pending={pending} onGoToTree={() => setTab('tree')} onGoToPending={goToPending} />}
        {tab === 'tree' && <CategoryTreeTab categories={categories} rules={rules} />}
        {tab === 'logs' && <MatchLogTab key={logPreset?.key ?? 0} categories={categories} rules={rules} initialStatus={logPreset?.status} />}
      </div>
    </div>
  );
}
