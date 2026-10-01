'use client';

import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import { ChevronRight, ChevronsDownUp, ChevronsUpDown, FolderPlus, Lightbulb, Pencil, Plus, Search, Trash2, TriangleAlert, WandSparkles } from 'lucide-react';
import ConfirmModal from '@/components/shared/ConfirmModal';
import CategoryIcon from '@/components/shared/CategoryIcon';
import Switch from '@/components/shared/Switch';
import { errorMessage } from '@/lib/api-client';
import { invalidateFinanceData } from '@/lib/query-client';
import { normalizeText } from '@/lib/text';
import { formatCompactVND, formatVND } from '@/lib/money';
import { currentMonthVN, formatMonthLabel } from '@/lib/dates';
import type { CategoryKind } from '@/types/common';
import { useBudgetPage } from '@/modules/budgets/lib';
import type { BudgetLine } from '@/modules/budgets/types';
import RuleModal from '@/modules/rules/components/RuleModal';
import { IconBtn } from '@/modules/rules/components/RulesTab';
import { updateRule } from '@/modules/rules/lib';
import type { RuleDTO } from '@/modules/rules/types';
import { ruleKeywords } from '@/modules/rules/utils/rule-match';
import { deleteCategory } from '../lib';
import type { CategoryDTO } from '../types';
import CategoryInspector from './CategoryInspector';

interface Props {
  categories: CategoryDTO[];
  rules: RuleDTO[];
}

type RuleTarget = { forCategory: number } | RuleDTO | null;
const MAX_CHIPS = 4;

// Cây danh mục: danh mục là nút cha, các quy tắc nhận diện gắn vào nó là nút con
export default function CategoryTreeTab({ categories, rules }: Props) {
  const qc = useQueryClient();
  const reload = () => invalidateFinanceData(qc);
  const month = currentMonthVN();
  const { data: budget } = useBudgetPage(month);

  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Set<number>>(() => new Set());
  const [allOpen, setAllOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [creatingKind, setCreatingKind] = useState<CategoryKind | null>(null);
  const [deleting, setDeleting] = useState<CategoryDTO | null>(null);
  const [ruleTarget, setRuleTarget] = useState<RuleTarget>(null);

  const rulesByCat = useMemo(() => {
    const m = new Map<number, RuleDTO[]>();
    for (const r of [...rules].sort((a, b) => a.priority - b.priority || a.id - b.id)) {
      if (!m.has(r.categoryId)) m.set(r.categoryId, []);
      m.get(r.categoryId)!.push(r);
    }
    return m;
  }, [rules]);
  const budgetByCat = useMemo(() => new Map<number, BudgetLine>((budget?.lines ?? []).map((l) => [l.categoryId, l])), [budget]);

  const q = normalizeText(search);
  const matches = (c: CategoryDTO) =>
    !q || normalizeText(c.name).includes(q) || (rulesByCat.get(c.id) ?? []).some((r) => normalizeText(r.pattern).includes(q));
  const groups: { kind: CategoryKind; title: string; code: string; dot: string; list: CategoryDTO[] }[] = [
    { kind: 'EXPENSE', title: 'Nhóm chi tiêu', code: 'CHI', dot: 'bg-teal-700', list: categories.filter((c) => c.kind === 'EXPENSE' && matches(c)) },
    { kind: 'INCOME', title: 'Nhóm thu nhập', code: 'THU', dot: 'bg-emerald-500', list: categories.filter((c) => c.kind === 'INCOME' && matches(c)) },
  ];
  const uncovered = categories.filter((c) => !rulesByCat.has(c.id));
  const coveredPct = categories.length ? (categories.length - uncovered.length) / categories.length : 0;
  const selected = categories.find((c) => c.id === selectedId) ?? null;

  function isOpen(id: number) {
    return allOpen ? !expanded.has(id) : expanded.has(id);
  }
  function toggleOpen(id: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function toggleAll() {
    setAllOpen((v) => !v);
    setExpanded(new Set());
  }
  function select(c: CategoryDTO) {
    setCreatingKind(null);
    setSelectedId(c.id);
  }

  async function toggleRule(r: RuleDTO, next: boolean) {
    try {
      await updateRule(r.id, { isActive: next });
      reload();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  async function remove(c: CategoryDTO) {
    try {
      await deleteCategory(c.id);
      toast.success('Đã xóa danh mục');
      if (selectedId === c.id) setSelectedId(null);
      reload();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  return (
    <>
      {/* Thanh công cụ */}
      <section className="fin-card p-2.5 flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
        <div className="relative flex-1 min-w-0 lg:max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden />
          <input
            className="input-field !pl-9 !py-2 !rounded-lg !bg-slate-50 focus:!bg-white"
            placeholder="Tìm theo tên danh mục hoặc từ khóa nhận diện…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Tìm danh mục"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className="fin-btn fin-btn-outline fin-btn-sm" onClick={toggleAll}>
            {allOpen ? <ChevronsDownUp className="w-4 h-4 text-slate-400" aria-hidden /> : <ChevronsUpDown className="w-4 h-4 text-slate-400" aria-hidden />}
            {allOpen ? 'Thu gọn tất cả' : 'Mở rộng tất cả'}
          </button>
          <button type="button" className="fin-btn fin-btn-outline fin-btn-sm" onClick={() => { setSelectedId(null); setCreatingKind('INCOME'); }}>
            <FolderPlus className="w-4 h-4 text-emerald-600" aria-hidden /> Thêm danh mục thu
          </button>
          <button type="button" className="fin-btn fin-btn-primary fin-btn-sm" onClick={() => { setSelectedId(null); setCreatingKind('EXPENSE'); }}>
            <Plus className="w-4 h-4" aria-hidden /> Thêm danh mục chi
          </button>
        </div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-12 gap-4 md:gap-6 items-start">
        {/* Cột trái: cây */}
        <div className="xl:col-span-8 flex flex-col gap-4 md:gap-6">
          {groups.map((g) => {
            const monthTotal = g.kind === 'EXPENSE' ? budget?.expense : budget?.income;
            return (
              <div key={g.kind} className="fin-card overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 bg-slate-50 border-b border-slate-200">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={`w-2.5 h-2.5 rounded-full ${g.dot}`} aria-hidden />
                    <h2 className="font-jakarta text-[14px] font-semibold text-slate-900 uppercase tracking-wide">{g.title}</h2>
                    <span className="fin-label px-2 py-0.5 rounded-full bg-white border border-slate-200">
                      {g.code} • {g.list.length} danh mục
                    </span>
                  </div>
                  <span className="text-xs text-slate-500">
                    {g.kind === 'EXPENSE' ? 'Đã chi' : 'Đã thu'} {formatMonthLabel(month)}:{' '}
                    <strong className="text-slate-900 fin-num">{monthTotal !== undefined ? formatVND(monthTotal) : '—'}</strong>
                  </span>
                </div>

                <div className="p-3 flex flex-col gap-1.5">
                  {g.list.length === 0 && (
                    <p className="py-8 text-center text-sm text-slate-500">
                      {q ? 'Không có danh mục nào khớp tìm kiếm.' : 'Chưa có danh mục nào.'}{' '}
                      {!q && (
                        <button type="button" className="text-teal-700 font-semibold hover:underline" onClick={() => { setSelectedId(null); setCreatingKind(g.kind); }}>
                          Tạo danh mục đầu tiên
                        </button>
                      )}
                    </p>
                  )}
                  {g.list.map((c) => {
                    const catRules = rulesByCat.get(c.id) ?? [];
                    const line = budgetByCat.get(c.id);
                    const open = isOpen(c.id);
                    const active = selectedId === c.id;
                    const over = line?.amount !== null && line?.amount !== undefined && line.spent > line.amount;
                    return (
                      <div key={c.id} className={`group/parent rounded-xl transition-colors ${active ? 'bg-teal-50 ring-1 ring-teal-700/30' : 'hover:bg-slate-50'}`}>
                        <div
                          className="flex items-center justify-between gap-3 p-3 cursor-pointer"
                          onClick={() => select(c)}
                          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), select(c))}
                          role="button"
                          tabIndex={0}
                          aria-pressed={active}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <button
                              type="button"
                              className="p-0.5 rounded text-slate-400 hover:text-slate-800 hover:bg-white transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleOpen(c.id);
                              }}
                              aria-label={open ? 'Thu gọn' : 'Mở rộng'}
                              aria-expanded={open}
                            >
                              <ChevronRight className={`w-5 h-5 transition-transform ${open ? 'rotate-90' : ''}`} />
                            </button>
                            <CategoryIcon icon={c.icon} color={c.color} />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className={`text-sm font-semibold truncate ${active ? 'text-teal-800' : 'text-slate-900'}`}>{c.name}</span>
                                {catRules.length ? (
                                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-semibold whitespace-nowrap">
                                    {catRules.length} quy tắc
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full bg-amber-100 border border-amber-200 text-amber-800 text-[11px] font-semibold inline-flex items-center gap-1 whitespace-nowrap">
                                    <TriangleAlert className="w-3 h-3" aria-hidden /> Chưa có quy tắc
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-500 truncate">
                                <span className="fin-num">{c._count?.transactions ?? 0}</span> giao dịch
                                {line && c.kind === 'EXPENSE' && line.count > 0 && (
                                  <>
                                    {' '}
                                    · <span className="fin-num">{line.count}</span> trong {formatMonthLabel(month)}
                                  </>
                                )}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            {c.kind === 'EXPENSE' && line && (
                              <div className="hidden sm:flex flex-col items-end gap-1 w-36">
                                <span className={`text-xs font-semibold fin-num ${over ? 'text-rose-600' : 'text-slate-800'}`}>
                                  {formatCompactVND(line.spent)} ₫{line.amount !== null && <span className="text-slate-400 font-normal"> / {formatCompactVND(line.amount)} ₫</span>}
                                </span>
                                {line.amount !== null ? (
                                  <div className="h-1 w-full bg-slate-200 rounded-full overflow-hidden" aria-hidden>
                                    <div className={`h-full rounded-full ${over ? 'bg-rose-500' : 'bg-teal-700'}`} style={{ width: `${Math.min(100, (line.spent / line.amount) * 100)}%` }} />
                                  </div>
                                ) : (
                                  <span className="text-[10px] text-slate-400">Chưa đặt hạn mức</span>
                                )}
                              </div>
                            )}
                            <div className="flex items-center gap-0.5 opacity-60 group-hover/parent:opacity-100 transition-opacity">
                              <IconBtn label="Thêm quy tắc cho danh mục" onClick={() => setRuleTarget({ forCategory: c.id })}>
                                <WandSparkles className="w-4 h-4" />
                              </IconBtn>
                              <IconBtn label="Chỉnh sửa" onClick={() => select(c)}>
                                <Pencil className="w-4 h-4" />
                              </IconBtn>
                              <IconBtn label="Xóa" danger onClick={() => setDeleting(c)}>
                                <Trash2 className="w-4 h-4" />
                              </IconBtn>
                            </div>
                          </div>
                        </div>

                        {open && (
                          <div className="relative pl-12 pr-3 pb-3 flex flex-col gap-1.5">
                            <div className="absolute left-[27px] top-0 bottom-5 w-px bg-slate-200" aria-hidden />
                            {catRules.map((r) => {
                              const kws = ruleKeywords(r);
                              return (
                                <div key={r.id} className={`relative flex items-center justify-between gap-3 p-2.5 rounded-lg bg-white border border-slate-200 shadow-sm ${r.isActive ? '' : 'opacity-60'}`}>
                                  <span className="absolute -left-[21px] top-1/2 w-5 h-px bg-slate-200" aria-hidden />
                                  <div className="flex items-center gap-2 min-w-0 flex-wrap">
                                    <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-bold fin-num shrink-0" title="Ưu tiên">
                                      #{r.priority}
                                    </span>
                                    {r.matchType === 'REGEX' ? (
                                      <code className="px-2 py-0.5 rounded-md bg-violet-50 text-violet-800 font-mono text-[12px] break-all">/{r.pattern}/i</code>
                                    ) : (
                                      <>
                                        {kws.slice(0, MAX_CHIPS).map((w) => (
                                          <span key={w} className="px-2 py-0.5 rounded-md bg-teal-50 text-teal-800 text-[12px] font-bold tracking-wide">
                                            {w}
                                          </span>
                                        ))}
                                        {kws.length > MAX_CHIPS && (
                                          <span className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[11px] font-semibold" title={kws.slice(MAX_CHIPS).join(', ')}>
                                            +{kws.length - MAX_CHIPS}
                                          </span>
                                        )}
                                      </>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <Switch size="sm" checked={r.isActive} onChange={(v) => toggleRule(r, v)} label={`Bật quy tắc ${r.pattern}`} />
                                    <IconBtn label="Sửa quy tắc" onClick={() => setRuleTarget(r)}>
                                      <Pencil className="w-3.5 h-3.5" />
                                    </IconBtn>
                                  </div>
                                </div>
                              );
                            })}
                            {catRules.length === 0 && (
                              <div className="relative flex items-center justify-between gap-3 p-2.5 rounded-lg border border-dashed border-amber-300 bg-amber-50/60">
                                <span className="absolute -left-[21px] top-1/2 w-5 h-px bg-slate-200" aria-hidden />
                                <span className="text-xs text-amber-800 inline-flex items-center gap-1.5">
                                  <TriangleAlert className="w-3.5 h-3.5" aria-hidden /> Chưa có từ khóa nhận diện — giao dịch phải gán tay
                                </span>
                                <button type="button" className="text-xs font-semibold text-teal-700 hover:underline whitespace-nowrap" onClick={() => setRuleTarget({ forCategory: c.id })}>
                                  + Gán nhanh
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Cột phải: bảng chi tiết */}
        <div className="xl:col-span-4 flex flex-col gap-4 xl:sticky xl:top-20">
          {selected || creatingKind ? (
            <CategoryInspector
              key={selected ? `edit-${selected.id}` : `new-${creatingKind}`}
              category={selected}
              kind={selected?.kind ?? creatingKind ?? 'EXPENSE'}
              rules={selected ? rulesByCat.get(selected.id) ?? [] : []}
              budgetLine={selected ? budgetByCat.get(selected.id) : undefined}
              onClose={() => {
                setSelectedId(null);
                setCreatingKind(null);
              }}
              onSaved={(saved) => {
                reload();
                setCreatingKind(null);
                if (saved) setSelectedId(saved.id);
              }}
              onDelete={(c) => setDeleting(c)}
              onAddRule={(id) => setRuleTarget({ forCategory: id })}
            />
          ) : (
            <section className="fin-card p-5 flex flex-col items-center text-center gap-3">
              <span className="w-12 h-12 rounded-2xl bg-slate-100 text-teal-700 flex items-center justify-center">
                <Pencil className="w-5 h-5" aria-hidden />
              </span>
              <div>
                <h2 className="font-jakarta text-[15px] font-semibold text-slate-900">Chi tiết danh mục</h2>
                <p className="text-xs text-slate-500 mt-1">Bấm vào một danh mục bên trái để sửa tên, biểu tượng, màu và xem từ khóa nhận diện.</p>
              </div>
              <div className="flex gap-2">
                <button type="button" className="fin-btn fin-btn-outline fin-btn-sm" onClick={() => setCreatingKind('INCOME')}>
                  <FolderPlus className="w-4 h-4 text-emerald-600" aria-hidden /> Danh mục thu
                </button>
                <button type="button" className="fin-btn fin-btn-primary fin-btn-sm" onClick={() => setCreatingKind('EXPENSE')}>
                  <Plus className="w-4 h-4" aria-hidden /> Danh mục chi
                </button>
              </div>
            </section>
          )}

          {/* Bao phủ quy tắc */}
          <section className="fin-card p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="font-jakarta text-[15px] font-semibold text-slate-900">Độ bao phủ nhận diện</h2>
              <span className="fin-label">{categories.length} danh mục</span>
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex" role="img" aria-label={`${Math.round(coveredPct * 100)}% danh mục có quy tắc`}>
                <div className="bg-teal-700 transition-[width] duration-500" style={{ width: `${coveredPct * 100}%` }} />
                <div className="bg-amber-400 flex-1" />
              </div>
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-teal-700" aria-hidden /> Có quy tắc: <strong className="fin-num">{categories.length - uncovered.length}</strong>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-amber-400" aria-hidden /> Chưa có: <strong className="fin-num">{uncovered.length}</strong>
                </span>
              </div>
            </div>
            {uncovered.length > 0 ? (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex flex-col gap-2">
                <p className="text-xs text-slate-700">
                  <strong className="text-amber-800">{uncovered.length} danh mục</strong> chưa có từ khóa nhận diện từ nội dung chuyển khoản. Giao dịch của chúng sẽ phải gán tay.
                </p>
                <ul className="flex flex-col gap-1">
                  {uncovered.slice(0, 4).map((c) => (
                    <li key={c.id} className="flex items-center justify-between gap-2 text-xs">
                      <button type="button" className="inline-flex items-center gap-1.5 min-w-0 text-slate-800 hover:text-teal-700" onClick={() => select(c)}>
                        <CategoryIcon icon={c.icon} color={c.color} size="sm" /> <span className="truncate">{c.name}</span>
                      </button>
                      <button type="button" className="font-semibold text-teal-700 hover:underline whitespace-nowrap" onClick={() => setRuleTarget({ forCategory: c.id })}>
                        + Gán
                      </button>
                    </li>
                  ))}
                  {uncovered.length > 4 && <li className="text-[11px] text-slate-500">… và {uncovered.length - 4} danh mục khác</li>}
                </ul>
              </div>
            ) : (
              <p className="text-xs text-emerald-700">Mọi danh mục đều có ít nhất một quy tắc nhận diện.</p>
            )}
          </section>

          <section className="rounded-2xl bg-gradient-to-br from-teal-50 via-slate-50 to-white border border-slate-200 p-4 flex items-start gap-3">
            <span className="w-10 h-10 rounded-xl bg-white shadow-sm border border-slate-200 flex items-center justify-center text-teal-700 shrink-0">
              <Lightbulb className="w-5 h-5" aria-hidden />
            </span>
            <div className="min-w-0 text-xs text-slate-600 leading-relaxed">
              <p className="font-jakarta text-sm font-semibold text-slate-900">Mẹo quản lý</p>
              Mở rộng một danh mục để xem và bật/tắt từng quy tắc gắn với nó. Hạn mức chi tiêu đặt ở trang Ngân sách.
            </div>
          </section>
        </div>
      </section>

      {ruleTarget && (
        <RuleModal
          rule={'forCategory' in ruleTarget ? null : ruleTarget}
          defaultCategoryId={'forCategory' in ruleTarget ? ruleTarget.forCategory : null}
          categories={categories}
          onClose={() => setRuleTarget(null)}
          onSaved={reload}
        />
      )}
      <ConfirmModal
        isOpen={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && remove(deleting)}
        title="Xóa danh mục"
        message={`Xóa "${deleting?.name}"? ${deleting?._count?.transactions ?? 0} giao dịch sẽ về "Chưa phân loại", ${deleting?._count?.rules ?? 0} quy tắc và ngân sách của danh mục cũng bị xóa.`}
        confirmText="Xóa"
      />
    </>
  );
}
