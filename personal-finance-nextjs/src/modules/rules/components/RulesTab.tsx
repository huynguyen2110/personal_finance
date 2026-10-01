'use client';

import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  Lightbulb,
  ListFilter,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Tags,
  Trash2,
  WandSparkles,
} from 'lucide-react';
import ConfirmModal from '@/components/shared/ConfirmModal';
import CategoryIcon from '@/components/shared/CategoryIcon';
import Switch from '@/components/shared/Switch';
import { errorMessage } from '@/lib/api-client';
import { invalidateFinanceData } from '@/lib/query-client';
import { normalizeText } from '@/lib/text';
import { formatVND } from '@/lib/money';
import { formatVNDateTime } from '@/lib/dates';
import type { Direction } from '@/types/common';
import type { CategoryDTO } from '@/modules/categories/types';
import type { TransactionDTO } from '@/modules/transactions/types';
import { deleteRule, reapplyRules, updateRule } from '../lib';
import type { RuleDTO } from '../types';
import { ruleKeywords } from '../utils/rule-match';
import { suggestKeyword } from '../utils/suggest-keyword';
import RuleModal from './RuleModal';
import RuleFromTxnModal from './RuleFromTxnModal';
import RuleTester from './RuleTester';

type Flow = 'ALL' | 'IN' | 'OUT';
type Status = 'ALL' | 'ON' | 'OFF';

interface Props {
  categories: CategoryDTO[];
  rules: RuleDTO[];
  // Giao dịch chưa phân loại (mới nhất trước) + tổng số
  pending: { items: TransactionDTO[]; total: number };
  onGoToTree: () => void;
  onGoToPending: () => void;
}

const MAX_CHIPS = 6;

export default function RulesTab({ categories, rules, pending, onGoToTree, onGoToPending }: Props) {
  const qc = useQueryClient();
  const reload = () => invalidateFinanceData(qc);

  const [search, setSearch] = useState('');
  const [flow, setFlow] = useState<Flow>('ALL');
  const [status, setStatus] = useState<Status>('ALL');
  const [editing, setEditing] = useState<RuleDTO | 'new' | null>(null);
  const [deleting, setDeleting] = useState<RuleDTO | null>(null);
  const [applying, setApplying] = useState<'pending' | 'all' | null>(null);
  const [seed, setSeed] = useState<{ content: string; direction: Direction; key: number } | null>(null);
  const [suggestIdx, setSuggestIdx] = useState(0);
  const [ruleFromTxn, setRuleFromTxn] = useState<TransactionDTO | null>(null);

  const categoryById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  const visible = useMemo(() => {
    const q = normalizeText(search);
    return rules.filter((r) => {
      if (flow !== 'ALL' && (r.category.kind === 'INCOME' ? 'IN' : 'OUT') !== flow) return false;
      if (status === 'ON' && !r.isActive) return false;
      if (status === 'OFF' && r.isActive) return false;
      if (q && !normalizeText(`${r.pattern} ${r.category.name}`).includes(q)) return false;
      return true;
    });
  }, [rules, search, flow, status]);

  const activeCount = rules.filter((r) => r.isActive).length;
  const coverage = useMemo(() => {
    const withRule = new Set(rules.map((r) => r.categoryId));
    const by = (kind: CategoryDTO['kind']) => {
      const list = categories.filter((c) => c.kind === kind);
      return { total: list.length, covered: list.filter((c) => withRule.has(c.id)).length };
    };
    return { expense: by('EXPENSE'), income: by('INCOME'), uncovered: categories.filter((c) => !withRule.has(c.id)).length };
  }, [categories, rules]);

  const suggestion = pending.items[suggestIdx] ?? pending.items[0] ?? null;

  async function toggle(r: RuleDTO, next: boolean) {
    try {
      await updateRule(r.id, { isActive: next });
      reload();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  async function remove(r: RuleDTO) {
    try {
      await deleteRule(r.id);
      toast.success('Đã xóa quy tắc');
      reload();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  async function reapply(includeRuleCategorized: boolean) {
    setApplying(includeRuleCategorized ? 'all' : 'pending');
    try {
      const r = await reapplyRules(includeRuleCategorized);
      toast.success(r.changed ? `Đã cập nhật ${r.changed} giao dịch` : 'Không có giao dịch nào thay đổi');
      reload();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setApplying(null);
    }
  }

  // Bấm "Thử": nạp từ khóa đầu tiên của quy tắc vào hộp cát bên phải
  function tryRule(r: RuleDTO) {
    const kw = ruleKeywords(r)[0] ?? '';
    setSeed({ content: r.matchType === 'REGEX' ? '' : kw, direction: r.category.kind === 'INCOME' ? 'IN' : 'OUT', key: Date.now() });
  }

  return (
    <>
      {/* Thanh lọc */}
      <section className="fin-card p-2.5 flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
        <div className="relative flex-1 min-w-0 lg:max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden />
          <input
            className="input-field !pl-9 !py-2 !rounded-lg !bg-slate-50 focus:!bg-white"
            placeholder="Tìm theo từ khóa, danh mục…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Tìm quy tắc"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Segmented
            value={flow}
            onChange={setFlow}
            options={[
              ['ALL', 'Mọi dòng tiền'],
              ['OUT', 'Tiền ra'],
              ['IN', 'Tiền vào'],
            ]}
            label="Lọc theo dòng tiền"
          />
          <Segmented
            value={status}
            onChange={setStatus}
            options={[
              ['ALL', 'Tất cả'],
              ['ON', 'Đang bật'],
              ['OFF', 'Đã tắt'],
            ]}
            label="Lọc theo trạng thái"
          />
          <button
            type="button"
            className={`fin-btn fin-btn-sm border ${
              pending.total ? 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
            }`}
            onClick={onGoToPending}
            title="Giao dịch chưa quy tắc nào khớp — bấm để xem trong Nhật ký"
          >
            <span className={`w-2 h-2 rounded-full ${pending.total ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} aria-hidden />
            Chờ xử lý
            <span className={`px-1.5 py-0.5 rounded-full text-[11px] font-bold leading-none fin-num ${pending.total ? 'bg-amber-500 text-white' : 'bg-emerald-600 text-white'}`}>
              {pending.total}
            </span>
          </button>
          <button type="button" className="fin-btn fin-btn-primary fin-btn-sm" onClick={() => setEditing('new')}>
            <Plus className="w-4 h-4" aria-hidden /> Thêm quy tắc
          </button>
        </div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-12 gap-4 md:gap-6 items-start">
        {/* Cột trái: bảng quy tắc */}
        <div className="xl:col-span-8 flex flex-col gap-4">
          <div className="fin-card overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <h2 className="font-jakarta text-[15px] font-semibold text-slate-900">Danh sách ưu tiên xử lý</h2>
                <span className="text-xs text-slate-500 hidden sm:inline">(Số nhỏ chạy trước, quy tắc đầu tiên khớp sẽ được dùng)</span>
              </div>
              <span className="text-xs text-slate-500 inline-flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-700" aria-hidden /> {activeCount}/{rules.length} đang bật
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[640px] border-collapse">
                <thead>
                  <tr className="text-left">
                    <th className="fin-label py-2.5 px-3 w-16 text-center font-bold">Ưu tiên</th>
                    <th className="fin-label py-2.5 px-4 font-bold">Từ khóa &amp; mẫu nhận diện</th>
                    <th className="fin-label py-2.5 px-3 w-44 font-bold">Gán vào danh mục</th>
                    <th className="fin-label py-2.5 px-3 w-20 text-center font-bold">Bật</th>
                    <th className="fin-label py-2.5 px-3 w-24 text-right font-bold">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visible.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-sm text-slate-500">
                        {rules.length === 0 ? (
                          <>
                            Chưa có quy tắc nào.{' '}
                            <button type="button" className="text-teal-700 font-semibold hover:underline" onClick={() => setEditing('new')}>
                              Tạo quy tắc đầu tiên
                            </button>
                          </>
                        ) : (
                          'Không có quy tắc nào khớp bộ lọc.'
                        )}
                      </td>
                    </tr>
                  )}
                  {visible.map((r) => {
                    const cat = categoryById.get(r.categoryId);
                    const income = r.category.kind === 'INCOME';
                    const kws = ruleKeywords(r);
                    return (
                      <tr key={r.id} className={`group hover:bg-slate-50 transition-colors ${r.isActive ? '' : 'opacity-60'}`}>
                        <td className="py-3.5 px-3 text-center align-top">
                          <span
                            className={`inline-flex items-center justify-center min-w-8 h-8 px-1.5 rounded-lg text-sm font-bold fin-num ${
                              r.priority < 100 ? 'bg-teal-50 text-teal-800' : 'bg-slate-100 text-slate-700'
                            }`}
                            title="Số nhỏ chạy trước"
                          >
                            {r.priority}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 align-top">
                          <div className="flex flex-col gap-1.5 min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              {r.matchType === 'REGEX' ? (
                                <>
                                  <code className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 font-mono text-[12px] break-all">/{r.pattern}/i</code>
                                  <span className="px-1.5 py-0.5 rounded-md bg-violet-50 text-violet-700 text-[10px] font-bold uppercase tracking-wider">Regex</span>
                                </>
                              ) : (
                                <>
                                  {kws.slice(0, MAX_CHIPS).map((w) => (
                                    <span key={w} className="px-2 py-0.5 rounded-md bg-teal-50 text-teal-800 text-[12px] font-bold tracking-wide">
                                      {w}
                                    </span>
                                  ))}
                                  {kws.length > MAX_CHIPS && (
                                    <span className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[11px] font-semibold" title={kws.slice(MAX_CHIPS).join(', ')}>
                                      +{kws.length - MAX_CHIPS} từ khóa
                                    </span>
                                  )}
                                </>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500">
                              {income ? (
                                <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                                  <ArrowDownLeft className="w-3.5 h-3.5" aria-hidden /> Tiền vào
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-rose-600 font-medium">
                                  <ArrowUpRight className="w-3.5 h-3.5" aria-hidden /> Tiền ra
                                </span>
                              )}
                              <span aria-hidden>•</span>
                              <span>{r.matchType === 'REGEX' ? 'Biểu thức chính quy' : `Khớp nguyên từ, ${kws.length} từ khóa`}</span>
                              {cat?._count && (
                                <>
                                  <span aria-hidden>•</span>
                                  <span>
                                    Danh mục có <strong className="text-slate-800 fin-num">{cat._count.transactions}</strong> giao dịch
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-3 align-top">
                          <div className="flex items-center gap-2 min-w-0">
                            <CategoryIcon icon={r.category.icon} color={r.category.color} />
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-slate-900 leading-tight truncate">{r.category.name}</p>
                              <p className={`text-xs ${income ? 'text-emerald-700' : 'text-slate-500'}`}>{income ? 'Danh mục thu' : 'Danh mục chi'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-3 text-center align-top">
                          <Switch checked={r.isActive} onChange={(v) => toggle(r, v)} label={`Bật quy tắc ${r.pattern}`} />
                        </td>
                        <td className="py-3.5 px-3 text-right align-top">
                          <div className="inline-flex items-center opacity-70 group-hover:opacity-100 transition-opacity">
                            <IconBtn label="Thử quy tắc này" onClick={() => tryRule(r)}>
                              <Play className="w-4 h-4" />
                            </IconBtn>
                            <IconBtn label="Chỉnh sửa" onClick={() => setEditing(r)}>
                              <Pencil className="w-4 h-4" />
                            </IconBtn>
                            <IconBtn label="Xóa" danger onClick={() => setDeleting(r)}>
                              <Trash2 className="w-4 h-4" />
                            </IconBtn>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
              <span>
                Hiển thị <strong className="text-slate-800 fin-num">{visible.length}</strong> trong tổng số{' '}
                <strong className="text-slate-800 fin-num">{rules.length}</strong> quy tắc tự động
              </span>
              <span className="inline-flex items-center gap-1.5">
                <ListFilter className="w-3.5 h-3.5" aria-hidden /> Sửa số ưu tiên để đổi thứ tự chạy
              </span>
            </div>
          </div>

          {/* Phân bố danh mục */}
          <div className="fin-card p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-jakarta text-[15px] font-semibold text-slate-900 inline-flex items-center gap-2">
                <Tags className="w-4 h-4 text-teal-700" aria-hidden /> Phân bố danh mục trong hệ thống
              </h2>
              <button type="button" className="text-xs font-semibold text-teal-700 hover:underline inline-flex items-center gap-1" onClick={onGoToTree}>
                Chuyển qua tab Cây danh mục <ArrowRight className="w-3.5 h-3.5" aria-hidden />
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Stat label="Danh mục chi" value={`${coverage.expense.total} nhóm`} hint={`${coverage.expense.covered} có quy tắc bao phủ`} />
              <Stat label="Danh mục thu" value={`${coverage.income.total} nhóm`} hint={`${coverage.income.covered} có quy tắc bao phủ`} />
              <Stat
                label="Chưa có quy tắc"
                value={`${coverage.uncovered} nhóm`}
                hint={coverage.uncovered ? 'Giao dịch sẽ phải gán tay' : 'Mọi danh mục đều được nhận diện'}
                tone={coverage.uncovered ? 'warn' : 'good'}
              />
              <Stat label="Quy tắc đã tắt" value={`${rules.length - activeCount}`} hint="Không tham gia phân loại" tone={rules.length - activeCount ? 'muted' : 'good'} />
            </div>
          </div>
        </div>

        {/* Cột phải: hộp cát & công cụ */}
        <div className="xl:col-span-4 flex flex-col gap-4">
          <RuleTester key={seed?.key ?? 0} rules={rules} initial={seed} />

          {/* Gợi ý từ giao dịch chưa phân loại */}
          <section className="fin-card p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4" aria-hidden />
                </span>
                <h2 className="font-jakarta text-[15px] font-semibold text-slate-900 truncate">Gợi ý quy tắc mới</h2>
              </div>
              <span className="fin-label px-2 py-0.5 rounded-md bg-slate-100">{pending.total} chờ gán</span>
            </div>

            {suggestion ? (
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 flex flex-col gap-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 break-words line-clamp-2" title={suggestion.content}>
                      {suggestion.content}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {suggestion.account.name} · {formatVNDateTime(suggestion.transactionDate)}
                    </p>
                  </div>
                  <span className={`text-sm font-bold fin-num shrink-0 ${suggestion.direction === 'IN' ? 'text-emerald-700' : 'text-rose-600'}`}>
                    {suggestion.direction === 'IN' ? '+' : '-'}
                    {formatVND(suggestion.amount)}
                  </span>
                </div>
                <div className="flex items-start gap-2 text-xs text-slate-600 bg-white border border-slate-200 p-2 rounded-lg">
                  <Lightbulb className="w-4 h-4 text-teal-700 shrink-0" aria-hidden />
                  <span>
                    Tạo từ khóa <strong className="text-teal-800">[{suggestKeyword(suggestion.content) || '…'}]</strong> để các giao dịch tương tự tự
                    động được phân loại?
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    className="fin-btn fin-btn-outline fin-btn-sm justify-center"
                    onClick={() => setSuggestIdx((i) => (i + 1) % Math.max(1, pending.items.length))}
                    disabled={pending.items.length < 2}
                  >
                    Bỏ qua
                  </button>
                  <button type="button" className="fin-btn fin-btn-primary fin-btn-sm justify-center" onClick={() => setRuleFromTxn(suggestion)}>
                    <Plus className="w-4 h-4" aria-hidden /> Tạo quy tắc
                  </button>
                </div>
              </div>
            ) : (
              <p className="flex items-start gap-2 text-xs text-slate-600">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden />
                Mọi giao dịch đều đã có danh mục. Khi có giao dịch mới chưa khớp quy tắc, gợi ý sẽ xuất hiện ở đây.
              </p>
            )}
          </section>

          {/* Tái áp dụng hàng loạt */}
          <section className="fin-card p-4 flex flex-col gap-3.5">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-lg bg-slate-100 text-teal-700 flex items-center justify-center shrink-0">
                <RefreshCw className="w-4 h-4" aria-hidden />
              </span>
              <div className="min-w-0">
                <h2 className="font-jakarta text-[15px] font-semibold text-slate-900 leading-tight">Tái áp dụng hàng loạt</h2>
                <p className="text-xs text-slate-500">Chạy lại quy tắc cho giao dịch cũ sau khi thêm/sửa</p>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <button type="button" disabled={applying !== null} className="fin-btn fin-btn-primary w-full justify-between group" onClick={() => reapply(false)}>
                <span className="inline-flex items-center gap-2">
                  <WandSparkles className="w-4 h-4" aria-hidden />
                  {applying === 'pending' ? 'Đang chạy…' : `Chạy cho ${pending.total} giao dịch chưa phân loại`}
                </span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" aria-hidden />
              </button>
              <button type="button" disabled={applying !== null} className="fin-btn fin-btn-outline w-full justify-between group" onClick={() => reapply(true)}>
                <span className="inline-flex items-center gap-2 text-left">
                  <RefreshCw className="w-4 h-4 text-slate-400" aria-hidden />
                  {applying === 'all' ? 'Đang quét…' : 'Quét lại cả giao dịch đã gán bằng quy tắc'}
                </span>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" aria-hidden />
              </button>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" aria-hidden />
              <p className="text-xs text-slate-600 leading-relaxed">
                <strong className="text-slate-800">Nguyên tắc bảo vệ dữ liệu:</strong> giao dịch bạn đã tự chọn danh mục bằng tay được giữ nguyên và
                không bao giờ bị quy tắc ghi đè.
              </p>
            </div>
          </section>

          {/* Mẹo */}
          <section className="rounded-2xl bg-gradient-to-br from-teal-50 via-slate-50 to-white border border-slate-200 p-4 flex items-start gap-3">
            <span className="w-10 h-10 rounded-xl bg-white shadow-sm border border-slate-200 flex items-center justify-center text-teal-700 shrink-0">
              <Lightbulb className="w-5 h-5" aria-hidden />
            </span>
            <div className="min-w-0 text-xs text-slate-600 leading-relaxed">
              <p className="font-jakarta text-sm font-semibold text-slate-900">Mẹo tạo từ khóa</p>
              Viết HOA không dấu, nhiều từ khóa ngăn cách bằng dấu phẩy. Từ khóa khớp nguyên từ: <code className="font-mono">GRAB</code> khớp{' '}
              <code className="font-mono">GRAB*123</code> nhưng không khớp <code className="font-mono">GRABFOOD</code>.
            </div>
          </section>
        </div>
      </section>

      {editing && <RuleModal rule={editing === 'new' ? null : editing} categories={categories} onClose={() => setEditing(null)} onSaved={reload} />}
      <RuleFromTxnModal transaction={ruleFromTxn} categories={categories} onClose={() => setRuleFromTxn(null)} onDone={reload} />
      <ConfirmModal
        isOpen={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && remove(deleting)}
        title="Xóa quy tắc"
        message={`Xóa quy tắc "${deleting?.pattern}"? Giao dịch đã phân loại vẫn giữ nguyên danh mục.`}
        confirmText="Xóa"
      />
    </>
  );
}

// ─── Thành phần nhỏ ───

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (v: T) => void;
  options: readonly (readonly [T, string])[];
  label: string;
}) {
  return (
    <div className="inline-flex items-center p-0.5 rounded-lg bg-slate-100 border border-slate-200" role="group" aria-label={label}>
      {options.map(([k, text]) => (
        <button
          key={k}
          type="button"
          aria-pressed={value === k}
          onClick={() => onChange(k)}
          className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
            value === k ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          {text}
        </button>
      ))}
    </div>
  );
}

export function IconBtn({ label, onClick, danger, children }: { label: string; onClick: () => void; danger?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`p-1.5 rounded-lg text-slate-400 transition-colors ${danger ? 'hover:text-rose-600 hover:bg-rose-50' : 'hover:text-teal-700 hover:bg-slate-100'}`}
    >
      {children}
    </button>
  );
}

function Stat({ label, value, hint, tone = 'default' }: { label: string; value: string; hint: string; tone?: 'default' | 'good' | 'warn' | 'muted' }) {
  const hintColor = tone === 'good' ? 'text-emerald-700' : tone === 'warn' ? 'text-amber-700' : tone === 'muted' ? 'text-slate-500' : 'text-teal-700';
  return (
    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-col gap-0.5 min-w-0">
      <span className="fin-label truncate">{label}</span>
      <span className="font-jakarta text-lg font-semibold text-slate-900 fin-num">{value}</span>
      <span className={`text-xs ${hintColor} truncate`}>{hint}</span>
    </div>
  );
}
