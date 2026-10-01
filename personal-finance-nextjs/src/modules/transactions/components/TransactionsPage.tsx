'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpDown,
  ArrowUpRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Download,
  EyeOff,
  Hand,
  Landmark,
  Link2,
  Mail,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Tag,
  Trash2,
  TriangleAlert,
  Wallet,
  Wand2,
  X,
  Zap,
} from 'lucide-react';
import Header from '@/components/layout/Header';
import CategoryIcon from '@/components/shared/CategoryIcon';
import CategorySelect from '@/components/shared/CategorySelect';
import ConfirmModal from '@/components/shared/ConfirmModal';
import { useQueryClient } from '@tanstack/react-query';
import TransactionFormModal from './TransactionFormModal';
import RuleFromTxnModal from '@/modules/rules/components/RuleFromTxnModal';
import { useAccounts } from '@/modules/accounts/lib';
import { bankBrand } from '@/modules/accounts/lib/brand';
import { useCategories } from '@/modules/categories/lib';
import { errorMessage } from '@/lib/api-client';
import { invalidateFinanceData } from '@/lib/query-client';
import { bulkUpdateTransactions, deleteTransaction, exportTransactions, updateTransaction, useTransactions } from '../lib';
import { formatVND } from '@/lib/money';
import { addMonths, currentMonthVN, formatMonthLabel, formatVNDate, formatVNDateTime, monthRange } from '@/lib/dates';
import type { TransactionDTO } from '../types';

const FILTER_KEYS = ['from', 'to', 'accountId', 'direction', 'categoryId', 'q', 'source', 'excluded', 'transfer', 'min', 'max', 'sort'] as const;
type FilterKey = (typeof FILTER_KEYS)[number];
type Filters = Partial<Record<FilterKey, string>>;
// Tham số URL có thể ghi: bộ lọc + phân trang
type ParamPatch = Partial<Record<FilterKey | 'page' | 'pageSize', string | undefined>>;

// Các khóa do hàng "chip" nhanh điều khiển (không tính vào số đếm của chip)
const CHIP_KEYS = ['transfer', 'source', 'min', 'excluded'] as const;
const BIG_AMOUNT = '1000000';

const SOURCE_LABEL = { EMAIL: 'Email ngân hàng', MANUAL: 'Nhập tay', IMPORT: 'Nhập dữ liệu' } as const;
const PAGE_SIZES = [10, 25, 50, 100] as const;
const DEFAULT_PAGE_SIZE = 50;

const fmtNum = (n: number) => new Intl.NumberFormat('vi-VN').format(n);
const pct = (v: number) => `${(v * 100).toFixed(1).replace('.', ',')}%`;

// ───────── Kỳ xem nhanh (từ/đến ngày) ─────────
type Period = 'all' | 'this_month' | 'last_month' | 'last_3_months' | 'this_year' | 'custom';
const PRESET_PERIODS: Period[] = ['this_month', 'last_month', 'last_3_months', 'this_year'];

function periodRange(p: Period): { from?: string; to?: string } {
  const cur = currentMonthVN();
  switch (p) {
    case 'this_month':
      return monthRange(cur);
    case 'last_month':
      return monthRange(addMonths(cur, -1));
    case 'last_3_months':
      return { from: monthRange(addMonths(cur, -2)).from, to: monthRange(cur).to };
    case 'this_year': {
      const y = cur.slice(0, 4);
      return { from: `${y}-01-01`, to: `${y}-12-31` };
    }
    default:
      return {};
  }
}

function detectPeriod(from?: string, to?: string): Period {
  if (!from && !to) return 'all';
  for (const p of PRESET_PERIODS) {
    const r = periodRange(p);
    if (r.from === from && r.to === to) return p;
  }
  return 'custom';
}

function periodLabel(p: Period, from?: string, to?: string): string {
  const cur = currentMonthVN();
  switch (p) {
    case 'all':
      return 'Toàn bộ thời gian';
    case 'this_month':
      return `Tháng ${formatMonthLabel(cur).slice(1)}`;
    case 'last_month':
      return `Tháng ${formatMonthLabel(addMonths(cur, -1)).slice(1)}`;
    case 'last_3_months':
      return '3 tháng gần đây';
    case 'this_year':
      return `Năm ${cur.slice(0, 4)}`;
    default:
      if (from && to) return `${formatVNDate(from)} – ${formatVNDate(to)}`;
      if (from) return `Từ ${formatVNDate(from)}`;
      if (to) return `Đến ${formatVNDate(to)}`;
      return 'Tùy chỉnh';
  }
}

// ───────── Thành phần nhỏ ─────────
function Kpi({
  label,
  icon: Icon,
  iconClass,
  bar,
  children,
}: {
  label: string;
  icon: typeof Wallet;
  iconClass: string;
  bar?: { ratio: number; className: string };
  children: React.ReactNode;
}) {
  return (
    <div className="fin-card p-4 pb-5 flex flex-col justify-between gap-2 min-w-0 relative overflow-hidden">
      <div className="flex items-center justify-between">
        <span className="fin-label">{label}</span>
        <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${iconClass}`}>
          <Icon className="w-4 h-4" aria-hidden />
        </span>
      </div>
      {children}
      {bar && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-100" aria-hidden>
          <div className={`h-full ${bar.className}`} style={{ width: `${Math.min(100, Math.max(0, bar.ratio * 100))}%` }} />
        </div>
      )}
    </div>
  );
}

function Amount({ value, sign, className = 'text-slate-900' }: { value: number; sign?: '+' | '−'; className?: string }) {
  return (
    <p className={`text-[26px] leading-9 font-bold tracking-[-0.02em] fin-num truncate ${className}`} title={formatVND(value)}>
      {sign ?? (value < 0 ? '−' : '')}
      {fmtNum(Math.abs(value))} <span className="text-sm font-semibold text-slate-500">₫</span>
    </p>
  );
}

// Nhãn tài khoản: ngân hàng = chữ viết tắt + màu nhận diện, tiền mặt = icon ví
function AccountTag({ account }: { account: TransactionDTO['account'] }) {
  if (account.type === 'CASH') {
    return (
      <span
        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[11px] font-bold max-w-[9rem]"
        title={account.name}
      >
        <Wallet className="w-3 h-3 shrink-0" aria-hidden /> <span className="truncate">{account.name}</span>
      </span>
    );
  }
  const b = bankBrand(account.name);
  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-bold tracking-wide max-w-[9rem] truncate"
      style={{ backgroundColor: `${b.color}14`, color: b.color }}
      title={account.name}
    >
      {account.name}
    </span>
  );
}

function Chip({
  active,
  tone = 'neutral',
  icon: Icon,
  count,
  onClick,
  children,
}: {
  active: boolean;
  tone?: 'neutral' | 'warn' | 'teal';
  icon?: typeof Wallet;
  count?: number;
  onClick: () => void;
  children: React.ReactNode;
}) {
  const idle =
    tone === 'warn'
      ? 'bg-slate-50 text-amber-700 hover:bg-amber-50'
      : tone === 'teal'
        ? 'bg-slate-50 text-teal-700 hover:bg-teal-50'
        : 'bg-slate-50 text-slate-600 hover:bg-slate-100';
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors border ${
        active ? 'bg-teal-700 border-teal-700 text-white shadow-sm' : `${idle} border-slate-200`
      }`}
    >
      {Icon && <Icon className="w-3.5 h-3.5" aria-hidden />}
      <span>{children}</span>
      {count !== undefined && (
        <span className={`px-1.5 py-px rounded-full text-[10px] fin-num ${active ? 'bg-white/20' : 'bg-slate-200/70 text-slate-700'}`}>
          {fmtNum(count)}
        </span>
      )}
    </button>
  );
}

// Ô lọc có icon bên trái
function FilterSelect({
  icon: Icon,
  className = '',
  children,
  ...rest
}: React.SelectHTMLAttributes<HTMLSelectElement> & { icon: typeof Wallet }) {
  return (
    <div className={`relative ${className}`}>
      <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" aria-hidden />
      <select {...rest} className="select-field !py-2 !pl-9 !text-[13px] !rounded-lg !bg-slate-50 hover:!bg-white">
        {children}
      </select>
    </div>
  );
}

// Cột "Phân loại": giao dịch được gán danh mục bằng cách nào
function CategorizedBadge({ t, onCreateRule }: { t: TransactionDTO; onCreateRule: () => void }) {
  if (t.transferPair) {
    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[11px] font-semibold"
        title="Đã ghép cặp với giao dịch đối ứng ở tài khoản kia"
      >
        <Link2 className="w-3 h-3" aria-hidden /> Khớp cặp đối ứng
      </span>
    );
  }
  if (t.categorizedBy === 'RULE') {
    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 text-[11px] font-semibold"
        title="Danh mục được gán tự động theo quy tắc"
      >
        <Zap className="w-3 h-3" aria-hidden /> Theo quy tắc
      </span>
    );
  }
  if (t.categorizedBy === 'MANUAL') {
    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-semibold"
        title="Bạn đã chọn danh mục này"
      >
        <Hand className="w-3 h-3" aria-hidden /> Chọn tay
      </span>
    );
  }
  return (
    <button
      type="button"
      className="fin-btn fin-btn-outline fin-btn-sm !text-teal-700"
      onClick={onCreateRule}
      title="Tạo quy tắc tự phân loại từ giao dịch này"
    >
      <Plus className="w-3.5 h-3.5" aria-hidden /> Tạo quy tắc
    </button>
  );
}

// Danh sách số trang: 1 … (p−1) p (p+1) … N
function pageItems(page: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const set = new Set<number>([1, total, page - 1, page, page + 1].filter((p) => p >= 1 && p <= total));
  const sorted = [...set].sort((a, b) => a - b);
  const out: (number | '…')[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push('…');
    out.push(p);
  });
  return out;
}

export default function TransactionsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: accounts = [] } = useAccounts();
  const { data: categories = [] } = useCategories();
  const qc = useQueryClient();

  // Bộ lọc lấy từ URL (để link từ Tổng quan / chia sẻ được)
  const filters: Filters = useMemo(() => {
    const f: Filters = {};
    for (const k of FILTER_KEYS) {
      const v = searchParams.get(k);
      if (v) f[k] = v;
    }
    return f;
  }, [searchParams]);
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const pageSize = (PAGE_SIZES as readonly number[]).includes(Number(searchParams.get('pageSize')))
    ? Number(searchParams.get('pageSize'))
    : DEFAULT_PAGE_SIZE;

  const { data, isFetching: loading, error } = useTransactions({ ...filters, page, pageSize });

  // Số đếm cho các chip nhanh: giữ nguyên các chiều khác (kỳ, tài khoản, tìm kiếm…), bỏ chính các khóa chip
  const countBase = useMemo(() => {
    const b: Filters = { ...filters };
    for (const k of CHIP_KEYS) delete b[k];
    if (b.categoryId === 'none') delete b.categoryId;
    delete b.sort;
    return b;
  }, [filters]);
  const { data: noneData } = useTransactions({ ...countBase, categoryId: 'none', pageSize: 10 });
  const { data: transferData } = useTransactions({ ...countBase, transfer: '1', pageSize: 10 });
  const { data: emailData } = useTransactions({ ...countBase, source: 'EMAIL', pageSize: 10 });
  const { data: allData } = useTransactions({ ...countBase, pageSize: 10 });

  const [exporting, setExporting] = useState(false);
  const [search, setSearch] = useState(filters.q ?? '');
  const [customPeriod, setCustomPeriod] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [editing, setEditing] = useState<TransactionDTO | null>(null);
  const [creating, setCreating] = useState(false);
  const [ruleFor, setRuleFor] = useState<TransactionDTO | null>(null);
  const [deleting, setDeleting] = useState<TransactionDTO | null>(null);
  const [bulkCategory, setBulkCategory] = useState<number | null>(null);

  const setParams = useCallback(
    (patch: ParamPatch, keepPage = false) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v) next.set(k, v);
        else next.delete(k);
      }
      if (!keepPage) next.delete('page');
      router.replace(`/transactions${next.toString() ? `?${next}` : ''}`, { scroll: false });
    },
    [router, searchParams]
  );

  // Tìm kiếm: debounce 400ms
  useEffect(() => {
    if ((filters.q ?? '') === search) return;
    const t = setTimeout(() => setParams({ q: search.trim() || undefined }), 400);
    return () => clearTimeout(t);
  }, [search, filters.q, setParams]);

  useEffect(() => {
    if (error) toast.error(errorMessage(error));
  }, [error]);

  // Đổi bộ lọc / trang thì bỏ chọn
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- đồng bộ lựa chọn với danh sách đang xem
    setSelected(new Set());
  }, [filters, page, pageSize]);

  const reload = () => invalidateFinanceData(qc);

  async function onExport() {
    setExporting(true);
    try {
      await exportTransactions(filters);
    } catch (e) {
      toast.error(errorMessage(e, 'Không tải được file Excel'));
    } finally {
      setExporting(false);
    }
  }

  async function changeCategory(t: TransactionDTO, categoryId: number | null) {
    try {
      await updateTransaction(t.id, { categoryId });
      toast.success('Đã đổi danh mục');
      reload();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  async function bulk(payload: { categoryId?: number | null; excludeFromStats?: boolean }) {
    try {
      const r = await bulkUpdateTransactions({ ids: [...selected], ...payload });
      toast.success(`Đã cập nhật ${r.updated} giao dịch${r.skipped ? ` (bỏ qua ${r.skipped} không khớp loại thu/chi)` : ''}`);
      setBulkCategory(null);
      reload();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  async function remove(t: TransactionDTO) {
    try {
      await deleteTransaction(t.id);
      toast.success('Đã xóa giao dịch');
      reload();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  function resetAll() {
    setSearch('');
    setCustomPeriod(false);
    router.replace('/transactions');
  }

  // ───────── Dẫn xuất hiển thị ─────────
  const period = detectPeriod(filters.from, filters.to);
  const showCustomDates = customPeriod || period === 'custom';
  const curPeriodLabel = periodLabel(period, filters.from, filters.to);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const rangeFrom = data && data.total ? (data.page - 1) * data.pageSize + 1 : 0;
  const rangeTo = data ? Math.min(data.total, (data.page - 1) * data.pageSize + data.items.length) : 0;
  const allSelected = !!data?.items.length && data.items.every((t) => selected.has(t.id));
  const hasFilters = FILTER_KEYS.some((k) => k !== 'sort' && filters[k]);

  const chipNone = filters.categoryId === 'none';
  const anyChip = chipNone || CHIP_KEYS.some((k) => !!filters[k]);
  const toggleChip = (patch: ParamPatch, active: boolean) =>
    setParams(active ? Object.fromEntries(Object.keys(patch).map((k) => [k, undefined])) : patch);

  const sumIn = data?.sumIn ?? 0;
  const sumOut = data?.sumOut ?? 0;
  const net = sumIn - sumOut;
  const savingRate = sumIn > 0 ? net / sumIn : 0;
  const outShare = sumIn > 0 ? sumOut / sumIn : 0;

  const baseTotal = allData?.total ?? 0;
  const noneCount = noneData?.total ?? 0;
  const emailCount = emailData?.total ?? 0;
  const classifiedRatio = baseTotal > 0 ? (baseTotal - noneCount) / baseTotal : 1;

  return (
    <div className="font-jakarta">
      <Header
        title="Giao dịch"
        subtitle={data ? `${fmtNum(data.total)} giao dịch · ${curPeriodLabel}` : 'Sổ giao dịch từ email ngân hàng và nhập tay'}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className="fin-btn fin-btn-outline" onClick={onExport} disabled={exporting}>
              <Download className="w-4 h-4 text-slate-400" aria-hidden />{' '}
              <span className="hidden sm:inline">{exporting ? 'Đang xuất…' : 'Xuất Excel'}</span>
            </button>
            <button type="button" className="fin-btn fin-btn-primary" onClick={() => setCreating(true)}>
              <Plus className="w-4 h-4" aria-hidden /> Thêm giao dịch
            </button>
          </div>
        }
      />

      <div className="px-4 md:px-6 pb-8 flex flex-col gap-4 md:gap-6">
        {/* ───── 4 KPI theo bộ lọc hiện tại ───── */}
        {!data ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="fin-card h-32 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <Kpi
              label="Tiền vào (Thu nhập)"
              icon={ArrowDownLeft}
              iconClass="bg-blue-50 text-income"
              bar={{ ratio: sumIn > 0 ? 1 : 0, className: 'bg-income' }}
            >
              <Amount value={sumIn} sign="+" className="text-income" />
              <div className="flex items-center justify-between gap-2 text-xs text-slate-600">
                <span className="truncate">{curPeriodLabel}</span>
                {filters.direction === 'OUT' && <span className="text-slate-400">Đang lọc chỉ chi</span>}
              </div>
            </Kpi>

            <Kpi label="Tiền ra (Chi tiêu)" icon={ArrowUpRight} iconClass="bg-orange-50 text-expense" bar={{ ratio: outShare, className: 'bg-expense' }}>
              <Amount value={sumOut} sign="−" />
              <div className="flex items-center justify-between gap-2 text-xs text-slate-600">
                <span className="truncate">{curPeriodLabel}</span>
                {sumIn > 0 && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] font-semibold fin-num ${
                      outShare > 1 ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {pct(outShare)} tiền vào
                  </span>
                )}
              </div>
            </Kpi>

            <Kpi
              label="Dòng tiền ròng"
              icon={Wallet}
              iconClass="bg-teal-50 text-teal-700"
              bar={{ ratio: Math.max(0, savingRate), className: net >= 0 ? 'bg-teal-600' : 'bg-rose-500' }}
            >
              <Amount value={net} className={net >= 0 ? 'text-teal-700' : 'text-rose-600'} />
              <div className="flex items-center justify-between gap-2 text-xs text-slate-600">
                <span>{sumIn > 0 ? `Tỷ lệ tiết kiệm: ${pct(savingRate)}` : 'Chưa có tiền vào trong kỳ'}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                    net >= 0 ? 'bg-teal-50 text-teal-700' : 'bg-rose-50 text-rose-700'
                  }`}
                >
                  {net >= 0 ? 'Thặng dư' : 'Thâm hụt'}
                </span>
              </div>
            </Kpi>

            <Kpi label="Phân loại tự động" icon={Sparkles} iconClass="bg-slate-100 text-teal-700" bar={{ ratio: classifiedRatio, className: 'bg-teal-600' }}>
              <div className="flex items-baseline gap-2 min-w-0">
                <span className="text-[26px] leading-9 font-bold tracking-[-0.02em] fin-num text-slate-900">{pct(classifiedRatio)}</span>
                <span className="text-xs font-medium text-slate-500 truncate fin-num">
                  {fmtNum(baseTotal - noneCount)} / {fmtNum(baseTotal)} đã có danh mục
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 text-xs">
                {noneCount > 0 ? (
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 font-semibold text-amber-700 hover:underline"
                    onClick={() => setParams({ categoryId: 'none' })}
                  >
                    <TriangleAlert className="w-3.5 h-3.5" aria-hidden /> {fmtNum(noneCount)} cần phân loại
                  </button>
                ) : (
                  <span className="text-teal-700 font-semibold">Tất cả đã có danh mục</span>
                )}
                <span className="inline-flex items-center gap-1 text-slate-500 fin-num">
                  <Mail className="w-3.5 h-3.5" aria-hidden /> {fmtNum(emailCount)} từ email
                </span>
              </div>
            </Kpi>
          </div>
        )}

        {/* ───── Bộ lọc: tầng 1 (ô chọn) + tầng 2 (chip nhanh, sắp xếp) ───── */}
        <section className="fin-card p-4 flex flex-col gap-3">
          {/* ≤ md: ô tìm kiếm chiếm cả hàng, 4 ô chọn chia 2×2; ≥ lg: tất cả trên một hàng 12 cột */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
            <div className="sm:col-span-2 lg:col-span-4 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" aria-hidden />
              <input
                className="input-field !py-2 !pl-9 !pr-9 !text-[13px] !rounded-lg !bg-slate-50 focus:!bg-white"
                placeholder="Tìm theo nội dung, ghi chú, mã tham chiếu…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Tìm kiếm"
              />
              {search && (
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                  onClick={() => setSearch('')}
                  aria-label="Xóa tìm kiếm"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <FilterSelect
              icon={CalendarDays}
              className="lg:col-span-2"
              aria-label="Kỳ"
              value={showCustomDates ? 'custom' : period}
              onChange={(e) => {
                const p = e.target.value as Period;
                if (p === 'custom') {
                  setCustomPeriod(true);
                  return;
                }
                setCustomPeriod(false);
                const r = periodRange(p);
                setParams({ from: r.from, to: r.to });
              }}
            >
              <option value="all">Toàn bộ thời gian</option>
              <option value="this_month">Tháng này</option>
              <option value="last_month">Tháng trước</option>
              <option value="last_3_months">3 tháng gần đây</option>
              <option value="this_year">Năm nay</option>
              <option value="custom">Tùy chỉnh ngày…</option>
            </FilterSelect>

            <FilterSelect
              icon={ArrowUpDown}
              className="lg:col-span-2"
              aria-label="Thu/chi"
              value={filters.direction ?? ''}
              onChange={(e) => setParams({ direction: e.target.value || undefined })}
            >
              <option value="">Tất cả dòng tiền</option>
              <option value="OUT">Tiền ra (Chi tiêu)</option>
              <option value="IN">Tiền vào (Thu nhập)</option>
            </FilterSelect>

            <FilterSelect
              icon={Landmark}
              className="lg:col-span-2"
              aria-label="Tài khoản"
              value={filters.accountId ?? ''}
              onChange={(e) => setParams({ accountId: e.target.value || undefined })}
            >
              <option value="">Tất cả tài khoản ({accounts.length})</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </FilterSelect>

            <FilterSelect
              icon={Tag}
              className="lg:col-span-2"
              aria-label="Danh mục"
              value={filters.categoryId ?? ''}
              onChange={(e) => setParams({ categoryId: e.target.value || undefined })}
            >
              <option value="">Tất cả danh mục</option>
              <option value="none">⚠ Chưa phân loại</option>
              <optgroup label="Chi">
                {categories
                  .filter((c) => c.kind === 'EXPENSE')
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.parentId ? `   └ ${c.name}` : c.name}
                    </option>
                  ))}
              </optgroup>
              <optgroup label="Thu">
                {categories
                  .filter((c) => c.kind === 'INCOME')
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.parentId ? `   └ ${c.name}` : c.name}
                    </option>
                  ))}
              </optgroup>
            </FilterSelect>
          </div>

          {showCustomDates && (
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 animate-fadeIn">
              <span className="font-semibold">Khoảng ngày:</span>
              <input
                type="date"
                aria-label="Từ ngày"
                className="input-field !w-auto !py-1.5 !text-[13px] !rounded-lg"
                value={filters.from ?? ''}
                max={filters.to}
                onChange={(e) => setParams({ from: e.target.value || undefined })}
              />
              <span aria-hidden>→</span>
              <input
                type="date"
                aria-label="Đến ngày"
                className="input-field !w-auto !py-1.5 !text-[13px] !rounded-lg"
                value={filters.to ?? ''}
                min={filters.from}
                onChange={(e) => setParams({ to: e.target.value || undefined })}
              />
              <button
                type="button"
                className="fin-btn fin-btn-ghost fin-btn-sm"
                onClick={() => {
                  setCustomPeriod(false);
                  setParams({ from: undefined, to: undefined });
                }}
              >
                <X className="w-3.5 h-3.5" aria-hidden /> Bỏ khoảng ngày
              </button>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100">
            <div className="flex flex-wrap items-center gap-2">
              <Chip
                active={!anyChip}
                count={allData?.total}
                onClick={() =>
                  setParams({
                    categoryId: chipNone ? undefined : filters.categoryId,
                    transfer: undefined,
                    source: undefined,
                    min: undefined,
                    excluded: undefined,
                  })
                }
              >
                Tất cả
              </Chip>
              <Chip active={chipNone} tone="warn" icon={TriangleAlert} count={noneData?.total} onClick={() => toggleChip({ categoryId: 'none' }, chipNone)}>
                Chưa phân loại
              </Chip>
              <Chip
                active={filters.transfer === '1'}
                icon={ArrowLeftRight}
                count={transferData?.total}
                onClick={() => toggleChip({ transfer: '1' }, filters.transfer === '1')}
              >
                Chuyển nội bộ
              </Chip>
              <Chip
                active={filters.source === 'EMAIL'}
                tone="teal"
                icon={Mail}
                count={emailData?.total}
                onClick={() => toggleChip({ source: 'EMAIL' }, filters.source === 'EMAIL')}
              >
                Từ email ngân hàng
              </Chip>
              <Chip active={filters.min === BIG_AMOUNT} onClick={() => toggleChip({ min: BIG_AMOUNT }, filters.min === BIG_AMOUNT)}>
                Giao dịch lớn (≥ 1.000.000 ₫)
              </Chip>
              <Chip active={filters.excluded === '1'} icon={EyeOff} onClick={() => toggleChip({ excluded: '1' }, filters.excluded === '1')}>
                Loại khỏi thống kê
              </Chip>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <label className="flex items-center gap-1.5 text-slate-500">
                <span className="font-semibold text-slate-700">Sắp xếp</span>
                <select
                  aria-label="Sắp xếp"
                  className="select-field !w-auto !py-1.5 !pl-2.5 !pr-8 !text-xs !rounded-lg !border-transparent !bg-transparent font-semibold !text-teal-700 hover:!bg-slate-50"
                  value={filters.sort ?? 'date_desc'}
                  onChange={(e) => setParams({ sort: e.target.value === 'date_desc' ? undefined : e.target.value })}
                >
                  <option value="date_desc">Mới nhất trước</option>
                  <option value="date_asc">Cũ nhất trước</option>
                  <option value="amount_desc">Số tiền lớn nhất</option>
                  <option value="amount_asc">Số tiền nhỏ nhất</option>
                </select>
              </label>
              {hasFilters && (
                <>
                  <span className="h-3.5 w-px bg-slate-200" aria-hidden />
                  <button type="button" className="px-2 py-1 rounded text-rose-600 font-semibold hover:bg-rose-50" onClick={resetAll}>
                    Đặt lại
                  </button>
                </>
              )}
            </div>
          </div>
        </section>

        {/* ───── Bảng giao dịch ───── */}
        <section className={`fin-card overflow-hidden flex flex-col transition-opacity ${loading && data ? 'opacity-60' : ''}`}>
          {/* Thanh công cụ: chọn hàng loạt + phạm vi đang xem */}
          <div className="px-4 py-2.5 bg-slate-50/70 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 min-h-[52px]">
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded accent-teal-700 cursor-pointer"
                  aria-label="Chọn tất cả trang này"
                  checked={allSelected}
                  disabled={!data?.items.length}
                  onChange={() => setSelected(allSelected ? new Set() : new Set(data?.items.map((t) => t.id) ?? []))}
                />
                <span className="text-xs font-semibold text-slate-600">
                  {selected.size > 0 ? `Đã chọn ${selected.size}` : `Chọn tất cả trang này${data ? ` (${data.items.length})` : ''}`}
                </span>
              </label>
              {selected.size > 0 && (
                <div className="flex flex-wrap items-center gap-2 pl-3 border-l border-slate-200 animate-fadeIn">
                  <div className="w-52">
                    <CategorySelect
                      categories={categories}
                      value={bulkCategory}
                      onChange={setBulkCategory}
                      placeholder="Chọn danh mục…"
                      className="select-field !py-1.5 !text-xs !rounded-lg"
                    />
                  </div>
                  <button
                    type="button"
                    className="fin-btn fin-btn-primary fin-btn-sm"
                    disabled={!bulkCategory}
                    onClick={() => bulk({ categoryId: bulkCategory })}
                  >
                    <Tag className="w-3.5 h-3.5" aria-hidden /> Gán danh mục
                  </button>
                  <button type="button" className="fin-btn fin-btn-outline fin-btn-sm" onClick={() => bulk({ categoryId: null })}>
                    Bỏ phân loại
                  </button>
                  <button type="button" className="fin-btn fin-btn-outline fin-btn-sm" onClick={() => bulk({ excludeFromStats: true })}>
                    <EyeOff className="w-3.5 h-3.5" aria-hidden /> Loại khỏi thống kê
                  </button>
                  <button type="button" className="fin-btn fin-btn-outline fin-btn-sm" onClick={() => bulk({ excludeFromStats: false })}>
                    Tính lại vào thống kê
                  </button>
                  <button
                    type="button"
                    className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200/70 hover:text-slate-900"
                    onClick={() => setSelected(new Set())}
                    aria-label="Bỏ chọn"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500 fin-num">
              {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin text-teal-700" aria-hidden />}
              {data && data.total > 0 && (
                <span>
                  Đang xem{' '}
                  <b className="text-slate-900">
                    {fmtNum(rangeFrom)} – {fmtNum(rangeTo)}
                  </b>{' '}
                  trong {fmtNum(data.total)}
                </span>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            {/* table-fixed: cột giữ đúng bề rộng khai báo, cột "Nội dung" nhận phần còn lại và tự cắt chữ */}
            <table className="w-full table-fixed text-left border-collapse min-w-[1120px]">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-[11px] font-bold uppercase tracking-[0.06em]">
                  <th className="py-3 pl-4 pr-2 w-10">
                    <span className="sr-only">Chọn</span>
                  </th>
                  <th className="py-3 px-3 w-40">Thời gian & Nguồn</th>
                  <th className="py-3 px-3">Nội dung</th>
                  <th className="py-3 px-3 w-56">Danh mục</th>
                  <th className="py-3 px-3 text-right w-36">Số tiền</th>
                  <th className="py-3 px-3 text-center w-36">Phân loại</th>
                  <th className="py-3 pl-2 pr-4 text-right w-24">Tác vụ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {!data &&
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={7} className="px-4 py-3">
                        <div className="h-9 rounded-lg bg-slate-100 animate-pulse" />
                      </td>
                    </tr>
                  ))}
                {data && data.items.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-14 text-center">
                      <div className="flex flex-col items-center gap-2 text-slate-500">
                        <span className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center">
                          <Search className="w-5 h-5 text-slate-400" aria-hidden />
                        </span>
                        <p className="text-sm font-semibold text-slate-700">Không có giao dịch nào khớp bộ lọc</p>
                        {hasFilters ? (
                          <button type="button" className="text-xs font-semibold text-teal-700 hover:underline" onClick={resetAll}>
                            Đặt lại bộ lọc
                          </button>
                        ) : (
                          <p className="text-xs">Giao dịch sẽ xuất hiện khi đọc được email ngân hàng hoặc bạn nhập tay.</p>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
                {data?.items.map((t) => {
                  const isTransfer = !!t.transferPair;
                  const uncategorized = !isTransfer && t.categoryId === null;
                  const [datePart, timePart] = formatVNDateTime(t.transactionDate).split(' ');
                  return (
                    <tr
                      key={t.id}
                      className={`group transition-colors ${
                        selected.has(t.id) ? 'bg-teal-50/60' : uncategorized ? 'bg-amber-50/40 hover:bg-amber-50/70' : 'hover:bg-slate-50/70'
                      } ${t.excludeFromStats || isTransfer ? 'opacity-75 hover:opacity-100' : ''}`}
                    >
                      <td className="py-3 pl-4 pr-2 align-top">
                        <input
                          type="checkbox"
                          className="w-4 h-4 mt-1 rounded accent-teal-700 cursor-pointer"
                          aria-label={`Chọn giao dịch ${t.id}`}
                          checked={selected.has(t.id)}
                          onChange={() =>
                            setSelected((s) => {
                              const n = new Set(s);
                              if (n.has(t.id)) n.delete(t.id);
                              else n.add(t.id);
                              return n;
                            })
                          }
                        />
                      </td>

                      <td className="py-3 px-3 align-top whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          <span className="fin-num text-[13px] text-slate-900">
                            <b className="font-semibold">{datePart}</b> <span className="text-slate-500">{timePart}</span>
                          </span>
                          <div className="flex items-center gap-1.5">
                            <AccountTag account={t.account} />
                            {t.source === 'EMAIL' ? (
                              <Mail className="w-3.5 h-3.5 text-teal-700" aria-label="Từ email ngân hàng" />
                            ) : (
                              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{SOURCE_LABEL[t.source]}</span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-3 align-top">
                        <div className="flex flex-col min-w-0">
                          <p
                            className={`text-[14px] font-semibold truncate transition-colors ${
                              isTransfer ? 'text-slate-500' : 'text-slate-900 group-hover:text-teal-700'
                            }`}
                            title={t.content}
                          >
                            {t.content || '(không có nội dung)'}
                          </p>
                          <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5 min-w-0">
                            {t.transferPair ? (
                              <span
                                className="inline-flex items-center gap-1 text-teal-700 whitespace-nowrap shrink-0 max-w-full truncate"
                                title={`Chuyển khoản nội bộ với ${t.transferPair.account.name} lúc ${formatVNDateTime(t.transferPair.transactionDate)}`}
                              >
                                <Link2 className="w-3.5 h-3.5 shrink-0" aria-hidden />
                                {t.direction === 'OUT' ? 'Sang' : 'Từ'} {t.transferPair.account.name} · tự loại khỏi thu/chi
                              </span>
                            ) : uncategorized ? (
                              <span className="inline-flex items-center gap-1 text-amber-700 font-medium whitespace-nowrap shrink-0">
                                <TriangleAlert className="w-3.5 h-3.5 shrink-0" aria-hidden /> Chưa khớp quy tắc tự động nào
                              </span>
                            ) : t.excludeFromStats ? (
                              <span className="inline-flex items-center gap-1 text-slate-500 whitespace-nowrap shrink-0">
                                <EyeOff className="w-3.5 h-3.5 shrink-0" aria-hidden /> Loại khỏi thống kê
                              </span>
                            ) : null}
                            {t.referenceCode && <span className="fin-num truncate">Ref {t.referenceCode}</span>}
                            {t.note && (
                              <span className="italic truncate" title={t.note}>
                                {t.note}
                              </span>
                            )}
                          </p>
                        </div>
                      </td>

                      <td className="py-3 px-3 align-top">
                        {isTransfer ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-xs font-semibold">
                            <ArrowLeftRight className="w-3.5 h-3.5" aria-hidden /> Chuyển nội bộ
                          </span>
                        ) : (
                          <div className="relative">
                            <span className="absolute left-1.5 top-1/2 -translate-y-1/2 pointer-events-none">
                              <CategoryIcon icon={t.category?.icon} color={t.category?.color} size="sm" />
                            </span>
                            <CategorySelect
                              categories={categories}
                              value={t.categoryId}
                              direction={t.direction}
                              onChange={(id) => changeCategory(t, id)}
                              placeholder="Chọn danh mục…"
                              className={`select-field !py-1.5 !pl-10 !pr-8 !text-xs !rounded-lg font-medium ${
                                uncategorized ? '!border-dashed !border-amber-400 !text-amber-700 !bg-white' : '!bg-slate-50 !border-slate-200 hover:!bg-white'
                              }`}
                              ariaLabel={`Danh mục của giao dịch ${t.id}`}
                            />
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-3 align-top text-right whitespace-nowrap">
                        <span
                          className={`text-[15px] font-bold fin-num ${
                            isTransfer ? 'text-slate-400 line-through font-medium' : t.direction === 'IN' ? 'text-income' : 'text-slate-900'
                          }`}
                        >
                          {t.direction === 'IN' ? '+' : '−'}
                          {formatVND(t.amount)}
                        </span>
                      </td>

                      <td className="py-3 px-3 align-top text-center">
                        <CategorizedBadge t={t} onCreateRule={() => setRuleFor(t)} />
                      </td>

                      <td className="py-3 pl-2 pr-4 align-top">
                        <div className="flex justify-end gap-0.5 text-slate-400">
                          {/* Dòng chưa phân loại đã có nút "Tạo quy tắc" ở cột Phân loại */}
                          {(isTransfer || t.categorizedBy !== 'NONE') && (
                            <button
                              type="button"
                              className="p-1.5 rounded-lg hover:bg-slate-100 hover:text-slate-900 transition-colors"
                              title="Tạo quy tắc từ giao dịch này"
                              aria-label="Tạo quy tắc"
                              onClick={() => setRuleFor(t)}
                            >
                              <Wand2 className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            type="button"
                            className="p-1.5 rounded-lg hover:bg-slate-100 hover:text-slate-900 transition-colors"
                            title="Chi tiết / sửa"
                            aria-label="Sửa"
                            onClick={() => setEditing(t)}
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          {t.source === 'MANUAL' && (
                            <button
                              type="button"
                              className="p-1.5 rounded-lg hover:bg-rose-50 hover:text-rose-600 transition-colors"
                              title="Xóa"
                              aria-label="Xóa"
                              onClick={() => setDeleting(t)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Chân bảng: số dòng mỗi trang + phân trang */}
          {data && data.total > 0 && (
            <div className="px-4 py-3 bg-slate-50/60 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
              <label className="flex items-center gap-2">
                <span>Hiển thị</span>
                <select
                  aria-label="Số dòng mỗi trang"
                  className="select-field !w-auto !py-1 !pl-2.5 !pr-7 !text-xs !rounded-md fin-num"
                  value={pageSize}
                  onChange={(e) => setParams({ pageSize: e.target.value === String(DEFAULT_PAGE_SIZE) ? undefined : e.target.value })}
                >
                  {PAGE_SIZES.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
                <span>dòng mỗi trang</span>
              </label>

              <nav className="flex items-center gap-1" aria-label="Phân trang">
                <button
                  type="button"
                  className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200/70 hover:text-slate-900 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
                  disabled={page <= 1}
                  onClick={() => setParams({ page: String(page - 1) }, true)}
                  aria-label="Trang trước"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {pageItems(page, totalPages).map((p, i) =>
                  p === '…' ? (
                    <span key={`e${i}`} className="px-1 text-slate-400" aria-hidden>
                      …
                    </span>
                  ) : (
                    <button
                      key={p}
                      type="button"
                      aria-current={p === page ? 'page' : undefined}
                      className={`w-8 h-8 rounded-lg text-[13px] font-semibold fin-num flex items-center justify-center transition-colors ${
                        p === page ? 'bg-teal-700 text-white shadow-sm' : 'text-slate-700 hover:bg-slate-200/70'
                      }`}
                      onClick={() => setParams({ page: p === 1 ? undefined : String(p) }, true)}
                    >
                      {p}
                    </button>
                  )
                )}
                <button
                  type="button"
                  className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200/70 hover:text-slate-900 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
                  disabled={page >= totalPages}
                  onClick={() => setParams({ page: String(page + 1) }, true)}
                  aria-label="Trang sau"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </nav>
            </div>
          )}
        </section>
      </div>

      <TransactionFormModal
        isOpen={creating || !!editing}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        onSaved={() => reload()}
        accounts={accounts}
        categories={categories}
        transaction={editing}
      />
      <RuleFromTxnModal transaction={ruleFor} categories={categories} onClose={() => setRuleFor(null)} onDone={reload} />
      <ConfirmModal
        isOpen={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && remove(deleting)}
        title="Xóa giao dịch"
        message={`Xóa giao dịch nhập tay "${deleting?.content ?? ''}"? Không thể hoàn tác.`}
        confirmText="Xóa"
      />
    </div>
  );
}
