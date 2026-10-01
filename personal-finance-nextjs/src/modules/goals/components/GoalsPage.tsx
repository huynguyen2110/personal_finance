'use client';

import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowDownUp, BadgeCheck, PiggyBank, PlusCircle, ShoppingCart, Wallet } from 'lucide-react';
import TreeSelect from '@/components/shared/TreeSelect';
import Header from '@/components/layout/Header';
import { errorMessage } from '@/lib/api-client';
import { formatVND } from '@/lib/money';
import { invalidateFinanceData } from '@/lib/query-client';
import { archiveGoal, useGoalsPage } from '../lib';
import type { ContributionInput, GoalDTO } from '../types';
import { PRIORITIES } from '../utils/goal-meta';
import GoalCard from './GoalCard';
import GoalsOverview from './GoalsOverview';
import GoalFormModal from './GoalFormModal';
import ContributionModal from './ContributionModal';
import HistoryModal from './HistoryModal';

type Tab = 'all' | 'active' | 'done' | 'long' | 'short' | 'archived';
type Sort = 'priority' | 'nearest' | 'amount' | 'progress';
// Tình trạng sử dụng tiền của quỹ: 'spent' gồm cả quỹ đã tiêu một phần
type SpendFilter = 'all' | 'unspent' | 'spent';

const SORTS: { value: Sort; label: string }[] = [
  { value: 'priority', label: 'Ưu tiên cao nhất' },
  { value: 'nearest', label: 'Gần về đích nhất' },
  { value: 'amount', label: 'Số tiền lớn nhất' },
  { value: 'progress', label: 'Tiến độ cao nhất' },
];

const COMPARE: Record<Sort, (a: GoalDTO, b: GoalDTO) => number> = {
  priority: (a, b) =>
    PRIORITIES[a.priority].rank - PRIORITIES[b.priority].rank ||
    (a.deadline ?? '9999').localeCompare(b.deadline ?? '9999') ||
    a.remaining - b.remaining,
  nearest: (a, b) => a.remaining - b.remaining,
  amount: (a, b) => b.targetAmount - a.targetAmount,
  progress: (a, b) => b.progress - a.progress,
};

const GRADE_STYLE: Record<string, string> = {
  'A+': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  A: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  B: 'bg-teal-50 text-teal-700 border-teal-200',
  C: 'bg-amber-100 text-amber-800 border-amber-200',
  D: 'bg-rose-50 text-rose-600 border-rose-200',
};
const GRADE_LABEL: Record<string, string> = { 'A+': 'Xuất sắc', A: 'Tốt', B: 'Khá', C: 'Cần cố gắng', D: 'Chưa đều đặn' };

export default function GoalsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useGoalsPage();
  const [tab, setTab] = useState<Tab>('all');
  const [sort, setSort] = useState<Sort>('priority');
  const [editing, setEditing] = useState<GoalDTO | 'new' | null>(null);
  const [spendFilter, setSpendFilter] = useState<SpendFilter>('all');
  const [depositing, setDepositing] = useState<{ goal: GoalDTO; preset?: number; kind?: ContributionInput['kind'] } | null>(null);
  const [history, setHistory] = useState<GoalDTO | null>(null);

  const reload = () => invalidateFinanceData(qc);
  const goals = useMemo(() => data?.goals ?? [], [data]);

  const groups = useMemo(() => {
    const visible = goals.filter((g) => !g.archivedAt);
    const active = visible.filter((g) => g.status !== 'done');
    return {
      all: visible,
      active,
      done: visible.filter((g) => g.status === 'done'),
      long: active.filter((g) => g.horizon === 'long'),
      short: active.filter((g) => g.horizon === 'short'),
      archived: goals.filter((g) => g.archivedAt),
    } satisfies Record<Tab, GoalDTO[]>;
  }, [goals]);

  const inTab = groups[tab];
  const unspent = inTab.filter((g) => g.spendStatus === 'unspent');
  const spent = inTab.filter((g) => g.spendStatus !== 'unspent');
  const filtered = spendFilter === 'unspent' ? unspent : spendFilter === 'spent' ? spent : inTab;
  const totals = {
    balance: filtered.reduce((s, g) => s + g.balance, 0),
    spent: filtered.reduce((s, g) => s + g.spent, 0),
  };

  // Mục tiêu đã xong luôn xuống cuối
  const list = [...filtered].sort((a, b) => Number(a.status === 'done') - Number(b.status === 'done') || COMPARE[sort](a, b));

  const spendOptions: { value: SpendFilter; label: string }[] = [
    { value: 'all', label: 'Tất cả' },
    { value: 'unspent', label: `Chưa tiêu (${unspent.length})` },
    { value: 'spent', label: `Đã tiêu (${spent.length})` },
  ];

  const tabs: { value: Tab; label: string; hideOnMobile?: boolean }[] = [
    { value: 'all', label: `Tất cả mục tiêu (${groups.all.length})` },
    { value: 'active', label: `Đang tích lũy (${groups.active.length})` },
    { value: 'done', label: `Đã hoàn thành (${groups.done.length})` },
    { value: 'long', label: `Dài hạn (> 1 năm)`, hideOnMobile: true },
    { value: 'short', label: `Ngắn hạn (≤ 1 năm)`, hideOnMobile: true },
    ...(groups.archived.length ? [{ value: 'archived' as Tab, label: `Đã lưu trữ (${groups.archived.length})` }] : []),
  ];

  async function onArchive(goal: GoalDTO, archived: boolean) {
    try {
      await archiveGoal(goal.id, archived);
      toast.success(archived ? 'Đã lưu trữ mục tiêu' : 'Đã đưa mục tiêu trở lại');
      if (!archived) setTab('all');
      reload();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  const discipline = data?.discipline;
  const suggestion = data?.surplus.suggestion;

  return (
    <div className="font-jakarta">
      <Header
        title="Mục tiêu Tiết kiệm & Tích lũy"
        subtitle="Lập kế hoạch, theo dõi tiến độ từng hũ tài chính và phân bổ phần thặng dư mỗi tháng"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {discipline && (
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold fin-num ${GRADE_STYLE[discipline.grade]}`}
                title={`Thực nạp ${Math.round(discipline.ratio * 100)}% so với kế hoạch nạp định kỳ (${discipline.goals} mục tiêu, tối đa 3 tháng gần nhất)`}
              >
                <BadgeCheck className="w-4 h-4" aria-hidden />
                Kỷ luật tài chính: {GRADE_LABEL[discipline.grade]} ({discipline.grade})
              </span>
            )}
            <button type="button" className="fin-btn fin-btn-primary" onClick={() => setEditing('new')} disabled={!data}>
              <PlusCircle className="w-[18px] h-[18px]" /> Tạo mục tiêu mới
            </button>
          </div>
        }
      />

      <div className="px-4 md:px-6 pb-8 flex flex-col gap-4 md:gap-6">
        {/* Thống kê: đang tiết kiệm bao nhiêu, quỹ duy trì, mục tiêu một lần, sức khỏe tài chính */}
        {data && goals.length > 0 && <GoalsOverview data={data.overview} />}

        {/* Bộ lọc + sắp xếp */}
        <div className="fin-card p-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
          <div className="flex items-center gap-1 overflow-x-auto py-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="tablist" aria-label="Lọc mục tiêu">
            {tabs.map((t) => (
              <button
                key={t.value}
                type="button"
                role="tab"
                aria-selected={tab === t.value}
                onClick={() => setTab(t.value)}
                className={`px-3.5 py-1.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors ${
                  tab === t.value ? 'bg-teal-700 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                } ${t.hideOnMobile ? 'hidden md:inline-block' : ''}`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1 justify-end shrink-0 px-1 text-xs text-slate-500 whitespace-nowrap">
            <ArrowDownUp className="w-4 h-4 text-slate-400" aria-hidden />
            Sắp xếp:
            <TreeSelect<Sort> ariaLabel="Sắp xếp" variant="ghost" size="sm" options={SORTS} value={sort} onChange={(v) => v && setSort(v)} />
          </div>
        </div>

        {/* Quỹ nào đã tiêu, quỹ nào chưa */}
        {goals.length > 0 && (
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 -mt-1 md:-mt-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-slate-500">Tình trạng tiêu:</span>
              <div className="inline-flex p-1 rounded-lg bg-white border border-slate-200 shadow-sm" role="radiogroup" aria-label="Lọc theo tình trạng tiêu">
                {spendOptions.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    role="radio"
                    aria-checked={spendFilter === o.value}
                    onClick={() => setSpendFilter(o.value)}
                    className={`px-3 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition-colors ${
                      spendFilter === o.value
                        ? o.value === 'spent'
                          ? 'bg-violet-600 text-white'
                          : 'bg-slate-800 text-white'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
            <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 fin-num">
              <span className="inline-flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5 text-teal-700" aria-hidden />
                Còn trong {filtered.length} quỹ: <strong className="text-slate-900">{formatVND(totals.balance)}</strong>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <ShoppingCart className="w-3.5 h-3.5 text-violet-600" aria-hidden />
                Đã tiêu: <strong className="text-violet-700">{formatVND(totals.spent)}</strong>
              </span>
            </p>
          </div>
        )}

        {isLoading || !data ? (
          <div className="flex flex-col gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="fin-card h-56 animate-pulse" />
            ))}
          </div>
        ) : goals.length === 0 ? (
          <section className="fin-card p-6 md:p-8 flex flex-col md:flex-row md:items-center gap-4">
            <span className="w-12 h-12 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
              <PiggyBank className="w-7 h-7" aria-hidden />
            </span>
            <div className="flex-1">
              <h2 className="text-[16px] font-semibold text-slate-900">Tạo mục tiêu tiết kiệm đầu tiên</h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Bắt đầu với <b>quỹ khẩn cấp</b> (3–6 tháng chi tiêu — web gợi ý số tiền từ chi tiêu thực tế của bạn), rồi đến các mục tiêu
                mua sắm, du lịch. Đặt thời hạn để web tính số cần nạp mỗi tháng và nhắc bạn đúng kỳ.
              </p>
            </div>
            <button type="button" className="fin-btn fin-btn-primary" onClick={() => setEditing('new')}>
              <PlusCircle className="w-4 h-4" /> Tạo mục tiêu
            </button>
          </section>
        ) : list.length === 0 ? (
          <p className="fin-card p-6 text-sm text-slate-500 text-center">
            {spendFilter === 'unspent'
              ? 'Không có quỹ nào chưa tiêu trong mục này.'
              : spendFilter === 'spent'
                ? 'Chưa có quỹ nào được tiêu trong mục này.'
                : 'Không có mục tiêu nào trong mục này.'}
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {list.map((g) => (
              <GoalCard
                key={g.id}
                goal={g}
                month={data.month}
                suggestion={suggestion && suggestion.goalId === g.id ? { amount: suggestion.amount, available: data.surplus.available } : null}
                onDeposit={(goal, preset) => setDepositing({ goal, preset })}
                onSpend={(goal) => setDepositing({ goal, kind: 'SPEND' })}
                onEdit={setEditing}
                onHistory={setHistory}
                onArchive={onArchive}
              />
            ))}
          </div>
        )}
      </div>

      {editing && data && (
        <GoalFormModal
          goal={editing === 'new' ? null : editing}
          month={data.month}
          avgMonthlyExpense={data.avgMonthlyExpense}
          onClose={() => setEditing(null)}
          onSaved={reload}
        />
      )}
      {depositing && (
        <ContributionModal
          goal={depositing.goal}
          preset={depositing.preset}
          initialKind={depositing.kind}
          onClose={() => setDepositing(null)}
          onSaved={reload}
        />
      )}
      {history && <HistoryModal goal={history} onClose={() => setHistory(null)} onChanged={reload} />}
    </div>
  );
}
