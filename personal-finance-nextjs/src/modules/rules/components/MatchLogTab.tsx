'use client';

import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  CircleCheck,
  CircleDashed,
  Download,
  Hand,
  History,
  Lock,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  WandSparkles,
  X,
  Landmark,
} from 'lucide-react';
import CategoryIcon from '@/components/shared/CategoryIcon';
import DatePicker from '@/components/shared/DatePicker';
import TreeSelect from '@/components/shared/TreeSelect';
import { errorMessage } from '@/lib/api-client';
import { invalidateFinanceData } from '@/lib/query-client';
import { normalizeText } from '@/lib/text';
import { formatVND } from '@/lib/money';
import { addMonths, currentMonthVN, formatMonthLabel, formatVNDateTime, monthRange } from '@/lib/dates';
import type { CategoryDTO } from '@/modules/categories/types';
import { useMonthStartDay } from '@/modules/settings/lib';
import { exportTransactions, useTransactions } from '@/modules/transactions/lib';
import type { TransactionDTO, TransactionFilters } from '@/modules/transactions/types';
import { reapplyRules } from '../lib';
import type { RuleDTO } from '../types';
import { findMatchingRule, matchSpan } from '../utils/rule-match';
import RuleFromTxnModal from './RuleFromTxnModal';
import { IconBtn, Segmented } from './RulesTab';

export type LogStatus = 'ALL' | 'RULE' | 'ACCOUNT' | 'MANUAL' | 'NONE';
type Source = 'ALL' | 'EMAIL' | 'MANUAL' | 'IMPORT';

const SOURCE_LABEL: Record<TransactionDTO['source'], string> = { EMAIL: 'Email NH', MANUAL: 'Nhập tay', IMPORT: 'Nhập file' };
const PAGE_SIZES = [15, 30, 50] as const;

interface Props {
  categories: CategoryDTO[];
  rules: RuleDTO[];
  // Bộ lọc trạng thái đặt sẵn khi nhảy sang tab này từ nơi khác (cha đổi `key` để áp lại)
  initialStatus?: LogStatus;
}

export default function MatchLogTab({ categories, rules, initialStatus = 'ALL' }: Props) {
  const qc = useQueryClient();
  const reload = () => invalidateFinanceData(qc);

  // Tháng tài chính (ngày bắt đầu tháng trong cài đặt); chưa chọn thì là tháng hiện tại
  const sd = useMonthStartDay();
  const [monthOverride, setMonthOverride] = useState<string | null>(null);
  const month = monthOverride ?? currentMonthVN(sd);
  const setMonth = (next: string | ((prev: string) => string)) => setMonthOverride(typeof next === 'function' ? next(month) : next);
  const [qInput, setQInput] = useState('');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<LogStatus>(initialStatus);
  const [source, setSource] = useState<Source>('ALL');
  const [pageSize, setPageSize] = useState<number>(15);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [ruleFromTxn, setRuleFromTxn] = useState<TransactionDTO | null>(null);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setQ(qInput.trim()), 300);
    return () => clearTimeout(t);
  }, [qInput]);

  // Trang gắn với chữ ký bộ lọc: đổi bộ lọc → tự về trang 1 (không cần effect)
  const filterKey = `${month}|${q}|${status}|${source}|${pageSize}`;
  const [pageState, setPageState] = useState({ key: filterKey, page: 1 });
  const page = pageState.key === filterKey ? pageState.page : 1;
  const setPage = (next: number | ((prev: number) => number)) =>
    setPageState((prev) => {
      const cur = prev.key === filterKey ? prev.page : 1;
      return { key: filterKey, page: typeof next === 'function' ? next(cur) : next };
    });

  const { from, to } = monthRange(month, sd);
  const baseFilters: TransactionFilters = useMemo(
    () => ({ from, to, q: q || undefined, source: source === 'ALL' ? undefined : source }),
    [from, to, q, source]
  );
  const { data, isFetching } = useTransactions({
    ...baseFilters,
    categorizedBy: status === 'ALL' ? undefined : status,
    page,
    pageSize,
    sort: 'date_desc',
  });
  // Đếm theo cách phân loại (chỉ cần `total`, pageSize nhỏ nhất server cho phép là 10)
  const ruleCount = useCategorizedCount(from, to, 'RULE');
  const accountCount = useCategorizedCount(from, to, 'ACCOUNT');
  const manualCount = useCategorizedCount(from, to, 'MANUAL');
  const noneCount = useCategorizedCount(from, to, 'NONE');
  const totalMonth = ruleCount !== undefined && manualCount !== undefined && noneCount !== undefined ? ruleCount + manualCount + noneCount : undefined;
  const autoPct = totalMonth ? (ruleCount ?? 0) / totalMonth : 0;

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const focus = items.find((t) => t.id === selectedId) ?? items[0] ?? null;
  const focusRule = focus ? findMatchingRule(rules, focus.content, focus.direction, focus.accountId) : null;
  const isCurrent = month === currentMonthVN(sd);

  async function reapply() {
    setApplying(true);
    try {
      const r = await reapplyRules(false);
      toast.success(r.changed ? `Đã phân loại thêm ${r.changed} giao dịch` : 'Không có giao dịch nào thay đổi');
      reload();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setApplying(false);
    }
  }

  return (
    <>
      {/* KPI */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Kpi label={`Tổng giao dịch ${formatMonthLabel(month)}`} icon={<History className="w-4 h-4" />} iconClass="bg-slate-100 text-teal-700">
          <p className="text-[28px] leading-9 font-bold tracking-[-0.02em] text-slate-900 fin-num">
            {totalMonth ?? '—'} <span className="text-sm font-semibold text-slate-500">giao dịch</span>
          </p>
          <p className="text-xs text-slate-500">Mọi nguồn: email ngân hàng, nhập tay, nhập file</p>
        </Kpi>
        <Kpi label="Khớp tự động" icon={<CircleCheck className="w-4 h-4" />} iconClass="bg-emerald-50 text-emerald-700">
          <p className="text-[28px] leading-9 font-bold tracking-[-0.02em] text-slate-900 fin-num">
            {ruleCount ?? '—'}{' '}
            <span className="text-sm font-semibold text-emerald-700">{totalMonth ? `${(autoPct * 100).toFixed(1).replace('.', ',')}%` : ''}</span>
          </p>
          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden" role="progressbar" aria-valuenow={Math.round(autoPct * 100)} aria-valuemin={0} aria-valuemax={100} aria-label="Tỷ lệ khớp tự động">
            <div className="h-full bg-emerald-600 rounded-full transition-[width] duration-500" style={{ width: `${autoPct * 100}%` }} />
          </div>
        </Kpi>
        <Kpi label="Chưa phân loại" icon={<TriangleAlert className="w-4 h-4" />} iconClass={noneCount ? 'bg-amber-100 text-amber-800' : 'bg-emerald-50 text-emerald-700'}>
          <p className={`text-[28px] leading-9 font-bold tracking-[-0.02em] fin-num ${noneCount ? 'text-amber-700' : 'text-slate-900'}`}>
            {noneCount ?? '—'} <span className="text-sm font-semibold text-slate-500">chưa khớp quy tắc nào</span>
          </p>
          {noneCount ? (
            <button type="button" className="text-xs font-semibold text-amber-800 underline underline-offset-2 self-start" onClick={() => setStatus('NONE')}>
              Xử lý ngay
            </button>
          ) : (
            <p className="text-xs text-emerald-700 inline-flex items-center gap-1">
              <CircleCheck className="w-3.5 h-3.5" aria-hidden /> Mọi giao dịch đều có danh mục
            </p>
          )}
        </Kpi>
        <Kpi label="Gán tay (khóa)" icon={<Hand className="w-4 h-4" />} iconClass="bg-slate-100 text-slate-600">
          <p className="text-[28px] leading-9 font-bold tracking-[-0.02em] text-slate-900 fin-num">
            {manualCount ?? '—'} <span className="text-sm font-semibold text-slate-500">giao dịch</span>
          </p>
          <p className="text-xs text-slate-500 inline-flex items-center gap-1">
            <Lock className="w-3.5 h-3.5" aria-hidden /> Không bao giờ bị quy tắc ghi đè
          </p>
        </Kpi>
      </section>

      {/* Bộ lọc */}
      <section className="fin-card p-3 flex flex-col gap-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
          <div className="relative flex-1 min-w-0">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden />
            <input
              className="input-field !pl-9 !pr-9 !py-2 !rounded-lg !bg-slate-50 focus:!bg-white"
              placeholder="Tìm theo nội dung chuyển khoản, ghi chú, mã tham chiếu…"
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Escape' && setQInput('')}
              aria-label="Tìm trong nhật ký"
            />
            {qInput && (
              <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-slate-400 hover:text-slate-700" onClick={() => setQInput('')} aria-label="Xóa tìm kiếm">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center bg-slate-100 border border-slate-200 p-0.5 rounded-lg">
              <button type="button" className="p-1.5 rounded-md text-slate-600 hover:bg-white" onClick={() => setMonth((m) => addMonths(m, -1))} aria-label="Tháng trước">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <DatePicker mode="month" variant="ghost" ariaLabel="Chọn tháng" value={month} onChange={(v) => v && setMonth(v)} className="text-xs hover:!bg-white" />
              <button type="button" className="p-1.5 rounded-md text-slate-600 hover:bg-white" onClick={() => setMonth((m) => addMonths(m, 1))} aria-label="Tháng sau">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            {!isCurrent && (
              <button type="button" className="fin-btn fin-btn-ghost fin-btn-sm" onClick={() => setMonthOverride(null)}>
                Về tháng này
              </button>
            )}
            <Segmented
              value={source}
              onChange={setSource}
              options={[
                ['ALL', 'Mọi nguồn'],
                ['EMAIL', 'Email NH'],
                ['MANUAL', 'Nhập tay'],
                ['IMPORT', 'Nhập file'],
              ]}
              label="Lọc theo nguồn"
            />
            <button type="button" className="fin-btn fin-btn-outline fin-btn-sm" onClick={() => exportTransactions({ ...baseFilters, categorizedBy: status === 'ALL' ? undefined : status })} title="Xuất Excel theo bộ lọc hiện tại">
              <Download className="w-4 h-4 text-slate-400" aria-hidden /> Xuất Excel
            </button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="fin-label mr-1">Bộ lọc nhanh:</span>
          <Pill active={status === 'ALL'} onClick={() => setStatus('ALL')} count={totalMonth}>
            Tất cả
          </Pill>
          <Pill active={status === 'RULE'} onClick={() => setStatus('RULE')} count={ruleCount} dot="bg-emerald-600">
            Khớp tự động
          </Pill>
          <Pill active={status === 'ACCOUNT'} onClick={() => setStatus('ACCOUNT')} count={accountCount} dot="bg-violet-500">
            Theo tài khoản
          </Pill>
          <Pill active={status === 'NONE'} onClick={() => setStatus('NONE')} count={noneCount} dot="bg-amber-500" warn={!!noneCount}>
            Chưa phân loại
          </Pill>
          <Pill active={status === 'MANUAL'} onClick={() => setStatus('MANUAL')} count={manualCount} dot="bg-slate-400">
            Gán tay
          </Pill>
        </div>
      </section>

      {/* Bảng nhật ký */}
      <section className={`fin-card overflow-hidden flex flex-col transition-opacity ${isFetching && data ? 'opacity-70' : ''}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[960px] border-collapse">
            <thead>
              <tr className="text-left bg-slate-50 border-b border-slate-200">
                <th className="fin-label py-2.5 px-4 w-40 font-bold">Thời gian / Nguồn</th>
                <th className="fin-label py-2.5 px-4 font-bold">Nội dung giao dịch gốc</th>
                <th className="fin-label py-2.5 px-4 w-52 font-bold">Quy tắc khớp</th>
                <th className="fin-label py-2.5 px-4 w-48 font-bold">Danh mục được gán</th>
                <th className="fin-label py-2.5 px-4 w-36 font-bold">Trạng thái</th>
                <th className="fin-label py-2.5 px-4 w-20 text-right font-bold">Tác vụ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!data && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-sm text-slate-500">
                    Đang tải nhật ký…
                  </td>
                </tr>
              )}
              {data && items.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-sm text-slate-500">
                    Không có giao dịch nào trong {formatMonthLabel(month)} khớp bộ lọc.
                  </td>
                </tr>
              )}
              {items.map((t) => {
                const matched = findMatchingRule(rules, t.content, t.direction, t.accountId);
                const span = matched ? matchSpan(matched, t.content) : null;
                const pendingRow = t.categorizedBy === 'NONE';
                const isFocus = focus?.id === t.id;
                return (
                  <tr
                    key={t.id}
                    onClick={() => setSelectedId(t.id)}
                    className={`relative cursor-pointer transition-colors ${
                      pendingRow ? 'bg-amber-50/60 hover:bg-amber-50' : isFocus ? 'bg-teal-50/60' : 'hover:bg-slate-50'
                    }`}
                    aria-selected={isFocus}
                  >
                    <td className="py-3.5 px-4 align-top">
                      <div className="flex flex-col gap-1">
                        <span className={`text-sm font-semibold fin-num ${pendingRow ? 'text-amber-800' : 'text-slate-900'}`}>{formatVNDateTime(t.transactionDate)}</span>
                        <div className="flex items-center gap-1.5 text-[11px]">
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold">{SOURCE_LABEL[t.source]}</span>
                          {t.excludeFromStats && <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">Loại khỏi TK</span>}
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 align-top">
                      <div className="flex flex-col gap-1.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-semibold shrink-0 truncate max-w-40">{t.account.name}</span>
                          <span className={`text-sm font-bold fin-num ${t.direction === 'IN' ? 'text-emerald-700' : 'text-slate-900'}`}>
                            {t.direction === 'IN' ? '+' : '-'}
                            {formatVND(t.amount)}
                          </span>
                        </div>
                        <p className="p-2 rounded-lg bg-slate-50 border border-slate-200 font-mono text-[12px] text-slate-800 leading-relaxed break-all line-clamp-2" title={t.content}>
                          <Highlighted content={t.content} span={span} />
                        </p>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 align-top">
                      {matched ? (
                        <div className="flex flex-col gap-1 min-w-0">
                          <code className="font-mono text-[12px] font-semibold text-teal-800 truncate" title={matched.pattern}>
                            {matched.matchType === 'REGEX' ? `/${matched.pattern}/i` : matched.pattern}
                          </code>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 font-bold uppercase tracking-wider fin-num">Ưu tiên {matched.priority}</span>
                            <span>{matched.matchType === 'REGEX' ? 'Regex' : 'Từ khóa'}</span>
                          </div>
                          {t.categorizedBy === 'RULE' && matched.categoryId !== t.categoryId && (
                            <span className="text-[11px] text-amber-700 inline-flex items-center gap-1">
                              <TriangleAlert className="w-3 h-3" aria-hidden /> Quy tắc hiện tại gán khác — chạy lại để cập nhật
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-col gap-0.5 text-xs text-slate-500">
                          <span className="inline-flex items-center gap-1">
                            <CircleDashed className="w-3.5 h-3.5" aria-hidden /> Không quy tắc nào khớp
                          </span>
                          {t.categorizedBy === 'RULE' && <span className="text-[11px] text-slate-400">Quy tắc đã gán có thể đã sửa/xóa</span>}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 align-top">
                      {t.category ? (
                        <div className="flex items-center gap-2 min-w-0">
                          <CategoryIcon icon={t.category.icon} color={t.category.color} />
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-900 leading-tight truncate">{t.category.name}</p>
                            <p className="text-xs text-slate-500">{t.category.kind === 'INCOME' ? 'Danh mục thu' : 'Danh mục chi'}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                            <TriangleAlert className="w-4 h-4" aria-hidden />
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-amber-800 leading-tight">Chưa phân loại</p>
                            <p className="text-xs text-amber-700">{matched ? 'Chạy lại quy tắc để gán' : 'Cần tạo quy tắc hoặc gán tay'}</p>
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 align-top">
                      <StatusBadge status={t.categorizedBy} />
                    </td>
                    <td className="py-3.5 px-4 align-top text-right">
                      {pendingRow ? (
                        <button type="button" className="fin-btn fin-btn-sm bg-amber-600 hover:bg-amber-700 text-white whitespace-nowrap" onClick={(e) => { e.stopPropagation(); setRuleFromTxn(t); }}>
                          Gán mục
                        </button>
                      ) : (
                        <IconBtn label="Tạo quy tắc từ giao dịch này" onClick={() => setRuleFromTxn(t)}>
                          <WandSparkles className="w-4 h-4" />
                        </IconBtn>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Phân trang */}
        <div className="px-4 py-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span>
              Hiển thị <strong className="text-slate-800 fin-num">{total ? (page - 1) * pageSize + 1 : 0}–{Math.min(page * pageSize, total)}</strong> trên{' '}
              <strong className="text-slate-800 fin-num">{total}</strong> kết quả
            </span>
            <span className="text-slate-300">|</span>
            <span className="inline-flex items-center gap-1">
              Dòng mỗi trang:
              <TreeSelect<number>
                ariaLabel="Dòng mỗi trang"
                variant="ghost"
                size="sm"
                className="fin-num"
                options={PAGE_SIZES.map((n) => ({ value: n, label: String(n) }))}
                value={pageSize}
                onChange={(v) => v && setPageSize(v)}
              />
            </span>
          </div>
          <div className="flex items-center gap-1">
            <PageBtn label="Trang đầu" disabled={page === 1} onClick={() => setPage(1)}>
              <ChevronsLeft className="w-4 h-4" />
            </PageBtn>
            <PageBtn label="Trang trước" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="w-4 h-4" />
            </PageBtn>
            {pageWindow(page, totalPages).map((p) => (
              <button
                key={p}
                type="button"
                aria-current={p === page ? 'page' : undefined}
                onClick={() => setPage(p)}
                className={`w-8 h-8 rounded-lg text-xs font-semibold fin-num transition-colors ${p === page ? 'bg-teal-700 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                {p}
              </button>
            ))}
            <PageBtn label="Trang sau" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              <ChevronRight className="w-4 h-4" />
            </PageBtn>
            <PageBtn label="Trang cuối" disabled={page >= totalPages} onClick={() => setPage(totalPages)}>
              <ChevronsRight className="w-4 h-4" />
            </PageBtn>
          </div>
        </div>
      </section>

      {/* Giải thích cách khớp + nguyên tắc dữ liệu */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        <div className="lg:col-span-2 fin-card p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-jakarta text-[15px] font-semibold text-slate-900 inline-flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" aria-hidden /> Cơ chế khớp quy tắc (giao dịch đang chọn)
            </h2>
            <span className="fin-label px-2 py-0.5 rounded bg-slate-100">Bấm một dòng để xem</span>
          </div>
          {focus ? (
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs text-slate-500">
                <span className="fin-label">Nội dung gốc</span>
                <span className="fin-num">{formatVNDateTime(focus.transactionDate)} · {focus.account.name}</span>
              </div>
              <p className="bg-white p-3 rounded-lg font-mono text-[13px] text-slate-900 border border-slate-200 break-all">
                <Highlighted content={focus.content} span={focusRule ? matchSpan(focusRule, focus.content) : null} />
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <Step n={1} title="Chuẩn hóa">
                  Bỏ dấu, viết HOA, gộp khoảng trắng: <code className="font-mono text-[11px] text-teal-800 break-all">{normalizeText(focus.content)}</code>
                </Step>
                <Step n={2} title="Dò quy tắc theo ưu tiên">
                  {focusRule ? (
                    <>
                      Khớp <strong className="text-teal-800 font-mono">{focusRule.matchType === 'REGEX' ? `/${focusRule.pattern}/i` : focusRule.pattern}</strong>{' '}
                      (ưu tiên <span className="fin-num">{focusRule.priority}</span>, chỉ xét quy tắc {focus.direction === 'IN' ? 'danh mục thu' : 'danh mục chi'})
                    </>
                  ) : (
                    <>Không quy tắc {focus.direction === 'IN' ? 'thu' : 'chi'} nào đang bật khớp nội dung này.</>
                  )}
                </Step>
                <Step n={3} title="Kết quả">
                  {focus.categorizedBy === 'MANUAL' ? (
                    <>
                      Bạn đã gán tay <strong className="text-slate-900">{focus.category?.name}</strong> — quy tắc không ghi đè.
                    </>
                  ) : focus.category ? (
                    <>
                      Gán vào <strong className="text-emerald-700">{focus.category.name}</strong>
                      {focusRule && focusRule.categoryId !== focus.categoryId && <span className="text-amber-700"> (quy tắc hiện tại sẽ gán khác)</span>}
                    </>
                  ) : focusRule ? (
                    <>
                      Sẽ gán <strong className="text-emerald-700">{focusRule.category.name}</strong> khi chạy lại quy tắc.
                    </>
                  ) : (
                    <>Giữ ở &ldquo;Chưa phân loại&rdquo; — hãy tạo quy tắc hoặc gán tay.</>
                  )}
                </Step>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500">Chưa có giao dịch nào để phân tích.</p>
          )}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500">
            <span className="inline-flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" aria-hidden /> Phân tích này chỉ để giải thích, không làm thay đổi dữ liệu.
            </span>
            {focus && (
              <button type="button" className="text-teal-700 font-semibold hover:underline inline-flex items-center gap-1 self-start" onClick={() => setRuleFromTxn(focus)}>
                Tạo quy tắc từ giao dịch này <ArrowRight className="w-3.5 h-3.5" aria-hidden />
              </button>
            )}
          </div>
        </div>

        <div className="fin-card p-4 flex flex-col justify-between gap-4">
          <div className="flex flex-col gap-3">
            <h2 className="font-jakarta text-[15px] font-semibold text-slate-900 inline-flex items-center gap-2">
              <Lock className="w-4 h-4 text-teal-700" aria-hidden /> Nguyên tắc bảo vệ dữ liệu
            </h2>
            <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
              <CircleCheck className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" aria-hidden />
              <div>
                <strong className="text-slate-900 block">Gán tay là khóa cứng</strong>
                <span className="text-slate-600">Giao dịch bạn tự chọn danh mục không bao giờ bị quy tắc tự động ghi đè.</span>
              </div>
            </div>
            <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
              <Sparkles className="w-4 h-4 text-teal-700 mt-0.5 shrink-0" aria-hidden />
              <div>
                <strong className="text-slate-900 block">Học từ chỉnh sửa</strong>
                <span className="text-slate-600">Từ bất kỳ dòng nào, bấm biểu tượng đũa thần để tạo quy tắc từ chính nội dung đó.</span>
              </div>
            </div>
          </div>
          <button type="button" className="fin-btn fin-btn-outline w-full justify-center" disabled={applying} onClick={reapply}>
            <RefreshCw className={`w-4 h-4 text-slate-400 ${applying ? 'animate-spin' : ''}`} aria-hidden />
            {applying ? 'Đang chạy…' : 'Chạy lại quy tắc cho giao dịch chưa phân loại'}
          </button>
        </div>
      </section>

      <RuleFromTxnModal transaction={ruleFromTxn} categories={categories} onClose={() => setRuleFromTxn(null)} onDone={reload} />
    </>
  );
}

// Đếm giao dịch theo cách phân loại trong kỳ (chỉ cần `total`; pageSize nhỏ nhất server cho phép là 10)
function useCategorizedCount(from: string, to: string, categorizedBy: Exclude<LogStatus, 'ALL'>): number | undefined {
  return useTransactions({ from, to, categorizedBy, pageSize: 10 }).data?.total;
}

// ─── Thành phần nhỏ ───

function Kpi({ label, icon, iconClass, children }: { label: string; icon: React.ReactNode; iconClass: string; children: React.ReactNode }) {
  return (
    <div className="fin-card p-4 flex flex-col gap-2 min-w-0">
      <div className="flex items-center justify-between">
        <span className="fin-label truncate">{label}</span>
        <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${iconClass}`} aria-hidden>
          {icon}
        </span>
      </div>
      {children}
    </div>
  );
}

function Pill({ active, onClick, count, dot, warn, children }: { active: boolean; onClick: () => void; count?: number; dot?: string; warn?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`px-2.5 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 transition-colors border ${
        active ? 'bg-teal-700 border-teal-700 text-white shadow-sm' : warn ? 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
      }`}
    >
      {dot && !active && <span className={`w-1.5 h-1.5 rounded-full ${dot}`} aria-hidden />}
      {children}
      {count !== undefined && <span className={`text-[10px] fin-num ${active ? 'opacity-80' : 'text-slate-400'}`}>({count})</span>}
    </button>
  );
}

function StatusBadge({ status }: { status: TransactionDTO['categorizedBy'] }) {
  if (status === 'RULE')
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
        <CircleCheck className="w-3.5 h-3.5" aria-hidden /> Tự động
      </span>
    );
  if (status === 'MANUAL')
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold">
        <Hand className="w-3.5 h-3.5" aria-hidden /> Gán tay
      </span>
    );
  if (status === 'ACCOUNT')
    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-50 border border-violet-200 text-violet-700 text-xs font-semibold"
        title="Không khớp quy tắc nào, gán theo nhóm chi tiêu duy nhất của tài khoản"
      >
        <Landmark className="w-3.5 h-3.5" aria-hidden /> Theo tài khoản
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 border border-amber-200 text-amber-800 text-xs font-semibold">
      <TriangleAlert className="w-3.5 h-3.5" aria-hidden /> Cần duyệt
    </span>
  );
}

function Highlighted({ content, span }: { content: string; span: [number, number] | null }) {
  if (!span) return <>{content}</>;
  const [a, b] = span;
  return (
    <>
      {content.slice(0, a)}
      <mark className="bg-teal-100 text-teal-900 px-0.5 rounded font-semibold">{content.slice(a, b)}</mark>
      {content.slice(b)}
    </>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="p-2.5 rounded-lg bg-white border border-slate-200 flex flex-col gap-1 min-w-0">
      <span className="fin-label">
        {n}. {title}
      </span>
      <span className="text-xs text-slate-700 leading-relaxed break-words">{children}</span>
    </div>
  );
}

function PageBtn({ label, disabled, onClick, children }: { label: string; disabled: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-label={label} disabled={disabled} onClick={onClick} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition-colors">
      {children}
    </button>
  );
}

// Cửa sổ tối đa 5 số trang quanh trang hiện tại
function pageWindow(page: number, totalPages: number): number[] {
  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
  const end = Math.min(totalPages, start + 4);
  const out: number[] = [];
  for (let p = start; p <= end; p++) out.push(p);
  return out;
}
