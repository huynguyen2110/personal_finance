'use client';

import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2,
  ChevronRight,
  ChevronsDownUp,
  ChevronsUpDown,
  CornerDownRight,
  FolderPlus,
  Lightbulb,
  Pencil,
  Plus,
  Search,
  Trash2,
  TriangleAlert,
} from 'lucide-react';
import ConfirmModal from '@/components/shared/ConfirmModal';
import CategoryIcon from '@/components/shared/CategoryIcon';
import { errorMessage } from '@/lib/api-client';
import { invalidateFinanceData } from '@/lib/query-client';
import { normalizeText } from '@/lib/text';
import { formatCompactVND, formatVND } from '@/lib/money';
import { currentMonthVN, formatMonthLabel } from '@/lib/dates';
import { useMonthStartDay } from '@/modules/settings/lib';
import type { CategoryKind } from '@/types/common';
import { useAccounts } from '@/modules/accounts/lib';
import { useBudgetPage } from '@/modules/budgets/lib';
import type { BudgetLine } from '@/modules/budgets/types';
import RuleModal from '@/modules/rules/components/RuleModal';
import { IconBtn } from '@/modules/rules/components/RulesTab';
import type { RuleDTO } from '@/modules/rules/types';
import { deleteCategory, useCategoryGroups } from '../lib';
import type { CategoryDTO, CategoryGroupDTO } from '../types';
import { buildCategoryTree, type CategoryNode } from '../utils/tree';
import CategoryInspector from './CategoryInspector';

interface Props {
  categories: CategoryDTO[];
  rules: RuleDTO[];
}

// Chế độ bảng bên phải: xem/sửa một danh mục, hoặc tạo mới (cha / con của `parentId`)
type Inspect = { mode: 'edit'; id: number } | { mode: 'create'; kind: CategoryKind; parentId: number | null } | null;

// Số liệu gộp của một nút cha: cộng dồn con
interface Rollup {
  txns: number;
  rules: number;
  spent: number;
  amount: number | null;
}

export default function CategoryTreeTab({ categories, rules }: Props) {
  const qc = useQueryClient();
  const reload = () => invalidateFinanceData(qc);
  // Tháng tài chính hiện tại (theo ngày bắt đầu tháng trong cài đặt)
  const month = currentMonthVN(useMonthStartDay());
  const { data: budget } = useBudgetPage(month);
  const { data: categoryGroups = [] } = useCategoryGroups();
  const { data: accounts = [] } = useAccounts();
  const accountById = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);
  const groupById = useMemo(() => new Map(categoryGroups.map((g) => [g.id, g])), [categoryGroups]);

  // Gom danh mục cha theo nhóm (thứ tự nhóm), phần chưa thuộc nhóm nào xếp cuối
  const clustersOf = (
    kind: CategoryKind,
    nodes: CategoryNode[],
  ): {
    key: string;
    group: CategoryGroupDTO | null;
    nodes: CategoryNode[];
  }[] => {
    const byGroup = new Map<number | null, CategoryNode[]>();
    for (const n of nodes) {
      const gid = n.cat.groupId !== null && groupById.has(n.cat.groupId) ? n.cat.groupId : null;
      if (!byGroup.has(gid)) byGroup.set(gid, []);
      byGroup.get(gid)!.push(n);
    }
    const out: { key: string; group: CategoryGroupDTO | null; nodes: CategoryNode[] }[] = categoryGroups
      .filter((g) => g.kind === kind && byGroup.has(g.id))
      .map((g) => ({ key: `g${g.id}`, group: g, nodes: byGroup.get(g.id)! }));
    if (byGroup.has(null)) out.push({ key: 'none', group: null, nodes: byGroup.get(null)! });
    return out;
  };

  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Set<number>>(() => new Set());
  const [allOpen, setAllOpen] = useState(false);
  const [inspect, setInspect] = useState<Inspect>(null);
  const [deleting, setDeleting] = useState<CategoryDTO | null>(null);
  const [ruleFor, setRuleFor] = useState<number | null>(null);

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
  const hit = (c: CategoryDTO) => !q || normalizeText(c.name).includes(q) || (rulesByCat.get(c.id) ?? []).some((r) => normalizeText(r.pattern).includes(q));
  // Lọc: giữ cha nếu cha hoặc một con khớp; chỉ hiện con khớp (hoặc tất cả con khi cha khớp)
  const filterTree = (nodes: CategoryNode[]) =>
    nodes.map((n) => (hit(n.cat) ? n : { cat: n.cat, children: n.children.filter(hit) })).filter((n) => hit(n.cat) || n.children.length > 0);

  const groups = (
    [
      {
        kind: 'EXPENSE',
        title: 'Nhóm chi tiêu',
        code: 'CHI',
        dot: 'bg-teal-700',
      },
      {
        kind: 'INCOME',
        title: 'Nhóm thu nhập',
        code: 'THU',
        dot: 'bg-emerald-500',
      },
    ] as const
  ).map((g) => ({
    ...g,
    nodes: filterTree(buildCategoryTree(categories, g.kind)),
    total: categories.filter((c) => c.kind === g.kind).length,
  }));

  const rollup = (n: CategoryNode): Rollup => {
    const all = [n.cat, ...n.children];
    const lines = all.map((c) => budgetByCat.get(c.id)).filter((l): l is BudgetLine => !!l);
    const own = budgetByCat.get(n.cat.id);
    const childAmounts = n.children.map((c) => budgetByCat.get(c.id)?.amount ?? null).filter((a): a is number => a !== null);
    return {
      txns: all.reduce((s, c) => s + (c._count?.transactions ?? 0), 0),
      rules: all.reduce((s, c) => s + (rulesByCat.get(c.id)?.length ?? 0), 0),
      spent: lines.reduce((s, l) => s + l.spent, 0),
      amount: own?.amount ?? (childAmounts.length ? childAmounts.reduce((s, a) => s + a, 0) : null),
    };
  };

  // Danh mục lá chưa có quy tắc (cha chỉ gom nhóm nên không tính)
  const uncovered = categories.filter((c) => !(c._count?.children ?? 0) && !rulesByCat.has(c.id));
  const leaves = categories.filter((c) => !(c._count?.children ?? 0)).length;
  const coveredPct = leaves ? (leaves - uncovered.length) / leaves : 0;
  const selectedId = inspect?.mode === 'edit' ? inspect.id : null;
  const selected = selectedId !== null ? (categories.find((c) => c.id === selectedId) ?? null) : null;

  const isOpen = (id: number) => (allOpen ? !expanded.has(id) : expanded.has(id));
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
  const select = (c: CategoryDTO) => setInspect({ mode: 'edit', id: c.id });
  const createUnder = (kind: CategoryKind, parentId: number | null) => setInspect({ mode: 'create', kind, parentId });

  async function remove(c: CategoryDTO) {
    try {
      await deleteCategory(c.id);
      toast.success('Đã xóa danh mục');
      if (selectedId === c.id) setInspect(null);
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
          <button type="button" className="fin-btn fin-btn-outline fin-btn-sm" onClick={() => createUnder('EXPENSE', null)}>
            <FolderPlus className="w-4 h-4 text-teal-700" aria-hidden /> Thêm danh mục cha
          </button>
          <button type="button" className="fin-btn fin-btn-primary fin-btn-sm" onClick={() => createUnder('EXPENSE', groups[0].nodes[0]?.cat.id ?? null)}>
            <Plus className="w-4 h-4" aria-hidden /> Thêm danh mục con
          </button>
        </div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-12 gap-4 md:gap-6 items-start">
        {/* Cột trái: cây danh mục */}
        <div className="xl:col-span-8 flex flex-col gap-4 md:gap-6">
          {groups.map((g) => {
            const groupAmount = g.nodes.map(rollup).reduce<number | null>((s, r) => (r.amount === null ? s : (s ?? 0) + r.amount), null);
            const monthTotal = g.kind === 'EXPENSE' ? budget?.expense : budget?.income;
            return (
              <div key={g.kind} className="fin-card overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 bg-slate-50 border-b border-slate-200">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={`w-2.5 h-2.5 rounded-full ${g.dot}`} aria-hidden />
                    <h2 className="font-jakarta text-[14px] font-semibold text-slate-900 uppercase tracking-wide">{g.title}</h2>
                    <span className="fin-label px-2 py-0.5 rounded-full bg-white border border-slate-200">
                      {g.code} • {g.total} danh mục
                    </span>
                  </div>
                  <span className="text-xs text-slate-500">
                    {g.kind === 'EXPENSE' ? (
                      <>
                        Hạn mức tháng: <strong className="text-slate-900 fin-num">{groupAmount !== null ? formatVND(groupAmount) : 'chưa đặt'}</strong>
                      </>
                    ) : (
                      <>
                        Đã thu {formatMonthLabel(month)}:{' '}
                        <strong className="text-slate-900 fin-num">{monthTotal !== undefined ? formatVND(monthTotal) : '—'}</strong>
                      </>
                    )}
                  </span>
                </div>

                <div className="p-3 flex flex-col gap-1.5">
                  {g.nodes.length === 0 && (
                    <p className="py-8 text-center text-sm text-slate-500">
                      {q ? 'Không có danh mục nào khớp tìm kiếm.' : 'Chưa có danh mục nào.'}{' '}
                      {!q && (
                        <button type="button" className="text-teal-700 font-semibold hover:underline" onClick={() => createUnder(g.kind, null)}>
                          Tạo danh mục đầu tiên
                        </button>
                      )}
                    </p>
                  )}
                  {clustersOf(g.kind, g.nodes).map((cl, ci, all) => (
                    <div key={cl.key} className="flex flex-col gap-1.5">
                      {/* Tiêu đề nhóm: chỉ hiện khi loại này có ít nhất một nhóm */}
                      {(all.length > 1 || cl.group) && (
                        <div className={`flex items-center justify-between gap-2 px-3 pt-2 pb-1 ${ci > 0 ? 'mt-2 border-t border-slate-100' : ''}`}>
                          <div className="flex items-center gap-2 min-w-0">
                            {cl.group ? (
                              <>
                                <CategoryIcon icon={cl.group.icon} color={cl.group.color} size="sm" />
                                <span className="text-xs font-bold uppercase tracking-wide truncate" style={{ color: cl.group.color }}>
                                  {cl.group.name}
                                </span>
                                {cl.group.accountIds.length > 0 && (
                                  <span className="text-[11px] text-slate-500 truncate">
                                    ·{' '}
                                    {cl.group.accountIds
                                      .map((id) => accountById.get(id)?.name)
                                      .filter(Boolean)
                                      .join(', ')}
                                  </span>
                                )}
                              </>
                            ) : (
                              <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Chưa thuộc nhóm nào</span>
                            )}
                          </div>
                          <span className="fin-label fin-num">{cl.nodes.length} danh mục cha</span>
                        </div>
                      )}
                      {cl.nodes.map((node) => {
                        const c = node.cat;
                        const r = rollup(node);
                        const open = isOpen(c.id) || (!!q && node.children.length > 0);
                        const active = selectedId === c.id;
                        const childActive = node.children.some((ch) => ch.id === selectedId);
                        const over = r.amount !== null && r.spent > r.amount;
                        return (
                          <div
                            key={c.id}
                            className={`group/parent rounded-xl transition-colors ${active || childActive ? 'bg-slate-50 ring-1 ring-teal-700/20' : 'hover:bg-slate-50'}`}
                          >
                            {/* Dòng cha */}
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
                                <CategoryIcon icon={c.icon} color={c.color} size="lg" />
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className={`text-sm font-semibold truncate ${active ? 'text-teal-800' : 'text-slate-900'}`}>{c.name}</span>
                                    <span
                                      className={`px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap ${node.children.length ? 'bg-teal-50 text-teal-800' : 'bg-slate-100 text-slate-600'}`}
                                    >
                                      {node.children.length ? `Cha (${node.children.length} con)` : 'Chưa có con'}
                                    </span>
                                    {!node.children.length && !rulesByCat.has(c.id) && (
                                      <span className="px-2 py-0.5 rounded-full bg-amber-100 border border-amber-200 text-amber-800 text-[11px] font-semibold inline-flex items-center gap-1 whitespace-nowrap">
                                        <TriangleAlert className="w-3 h-3" aria-hidden /> Chưa có quy tắc
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-slate-500 truncate">
                                    {node.children.length ? (
                                      node.children.map((ch) => ch.name).join(', ')
                                    ) : (
                                      <>
                                        <span className="fin-num">{r.txns}</span> giao dịch
                                      </>
                                    )}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-3 shrink-0">
                                <div className="hidden sm:flex flex-col items-end gap-0.5">
                                  {c.kind === 'EXPENSE' ? (
                                    <>
                                      <span className={`text-sm font-semibold fin-num ${over ? 'text-rose-600' : 'text-slate-900'}`}>
                                        {r.amount !== null ? (
                                          <>
                                            {formatVND(r.amount)}
                                            <span className="text-slate-400 font-normal text-xs">/tháng</span>
                                          </>
                                        ) : (
                                          <span className="text-slate-400 font-normal text-xs">Chưa đặt hạn mức</span>
                                        )}
                                      </span>
                                      <span className="text-[11px] text-slate-500 fin-num">
                                        Đã chi {formatCompactVND(r.spent)} ₫ ·{' '}
                                        <span className={r.rules ? 'text-emerald-700' : 'text-slate-400'}>{r.rules} quy tắc khớp</span>
                                      </span>
                                    </>
                                  ) : (
                                    <span className={`text-xs font-semibold fin-num ${r.rules ? 'text-emerald-700' : 'text-slate-400'}`}>
                                      {r.rules} quy tắc khớp
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center opacity-60 group-hover/parent:opacity-100 transition-opacity">
                                  <IconBtn label="Thêm danh mục con" onClick={() => createUnder(c.kind, c.id)}>
                                    <Plus className="w-4 h-4" />
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

                            {/* Các con */}
                            {open && (
                              <div className="relative pl-12 pr-3 pb-3 flex flex-col gap-1.5">
                                <div className="absolute left-[27px] top-0 bottom-5 w-px bg-slate-200" aria-hidden />
                                {node.children.map((ch) => {
                                  const chRules = rulesByCat.get(ch.id) ?? [];
                                  const line = budgetByCat.get(ch.id);
                                  const chActive = selectedId === ch.id;
                                  return (
                                    <div
                                      key={ch.id}
                                      className={`relative flex items-center justify-between gap-3 p-2.5 rounded-lg border shadow-sm cursor-pointer transition-colors ${
                                        chActive ? 'bg-teal-50 border-teal-700/30' : 'bg-white border-slate-200 hover:bg-slate-50'
                                      }`}
                                      onClick={() => select(ch)}
                                      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), select(ch))}
                                      role="button"
                                      tabIndex={0}
                                      aria-pressed={chActive}
                                    >
                                      <span className={`absolute -left-[21px] top-1/2 w-5 h-px ${chActive ? 'bg-teal-700' : 'bg-slate-200'}`} aria-hidden />
                                      <div className="flex items-center gap-2.5 min-w-0">
                                        <CategoryIcon icon={ch.icon} color={ch.color} size="sm" />
                                        <span className={`text-sm font-semibold truncate ${chActive ? 'text-teal-800' : 'text-slate-900'}`}>{ch.name}</span>
                                        {!chRules.length && (
                                          <span className="px-2 py-0.5 rounded-full bg-amber-100 border border-amber-200 text-amber-800 text-[11px] font-semibold inline-flex items-center gap-1 whitespace-nowrap">
                                            <TriangleAlert className="w-3 h-3" aria-hidden /> Chưa có quy tắc
                                          </span>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-3 shrink-0">
                                        <span className="hidden sm:inline text-xs text-slate-600 fin-num">
                                          {ch.kind === 'EXPENSE' ? (
                                            line?.amount !== null && line?.amount !== undefined ? (
                                              formatVND(line.amount)
                                            ) : (
                                              <span className="text-slate-400">Chưa đặt hạn mức</span>
                                            )
                                          ) : (
                                            <>{ch._count?.transactions ?? 0} giao dịch</>
                                          )}
                                        </span>
                                        {chRules.length ? (
                                          <span className="px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-semibold whitespace-nowrap fin-num">
                                            {chRules.length} quy tắc
                                          </span>
                                        ) : (
                                          <button
                                            type="button"
                                            className="text-xs font-semibold text-teal-700 hover:underline whitespace-nowrap"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setRuleFor(ch.id);
                                            }}
                                          >
                                            + Gán nhanh
                                          </button>
                                        )}
                                        {chActive ? (
                                          <CheckCircle2 className="w-4 h-4 text-teal-700" aria-hidden />
                                        ) : (
                                          <IconBtn label="Xóa danh mục con" danger onClick={() => setDeleting(ch)}>
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </IconBtn>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                                <button
                                  type="button"
                                  className="relative flex items-center gap-2 p-2 rounded-lg border border-dashed border-slate-300 text-xs font-semibold text-slate-500 hover:text-teal-700 hover:border-teal-700/40 hover:bg-white transition-colors"
                                  onClick={() => createUnder(c.kind, c.id)}
                                >
                                  <span className="absolute -left-[21px] top-1/2 w-5 h-px bg-slate-200" aria-hidden />
                                  <CornerDownRight className="w-3.5 h-3.5" aria-hidden /> Thêm danh mục con vào &ldquo;{c.name}&rdquo;
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Cột phải */}
        <div className="xl:col-span-4 flex flex-col gap-4 xl:sticky xl:top-20">
          {inspect?.mode === 'edit' && !selected ? (
            // Vừa tạo/lưu xong, đang chờ danh sách danh mục tải lại
            <section className="fin-card h-64 animate-pulse" aria-busy />
          ) : inspect ? (
            <CategoryInspector
              key={inspect.mode === 'edit' ? `edit-${inspect.id}` : `new-${inspect.kind}-${inspect.parentId ?? 'root'}`}
              category={selected}
              kind={selected?.kind ?? (inspect.mode === 'create' ? inspect.kind : 'EXPENSE')}
              initialParentId={inspect.mode === 'create' ? inspect.parentId : null}
              categories={categories}
              groups={categoryGroups}
              rules={selected ? (rulesByCat.get(selected.id) ?? []) : []}
              budgetLine={selected ? budgetByCat.get(selected.id) : undefined}
              onClose={() => setInspect(null)}
              onSaved={(saved) => {
                reload();
                if (saved) {
                  setInspect({ mode: 'edit', id: saved.id });
                  const parentId = inspect.mode === 'create' ? inspect.parentId : (selected?.parentId ?? null);
                  if (parentId !== null) setExpanded((prev) => new Set(prev).add(parentId));
                } else setInspect(null);
              }}
              onDelete={(c) => setDeleting(c)}
              onAddRule={(id) => setRuleFor(id)}
            />
          ) : (
            <section className="fin-card p-5 flex flex-col items-center text-center gap-3">
              <span className="w-12 h-12 rounded-2xl bg-slate-100 text-teal-700 flex items-center justify-center">
                <Pencil className="w-5 h-5" aria-hidden />
              </span>
              <div>
                <h2 className="font-jakarta text-[15px] font-semibold text-slate-900">Chi tiết danh mục</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Bấm vào một danh mục cha hoặc con bên trái để sửa tên, nhóm cha, biểu tượng, màu và xem từ khóa nhận diện.
                </p>
              </div>
              <div className="flex gap-2">
                <button type="button" className="fin-btn fin-btn-outline fin-btn-sm" onClick={() => createUnder('INCOME', null)}>
                  <FolderPlus className="w-4 h-4 text-emerald-600" aria-hidden /> Nhóm thu
                </button>
                <button type="button" className="fin-btn fin-btn-primary fin-btn-sm" onClick={() => createUnder('EXPENSE', null)}>
                  <Plus className="w-4 h-4" aria-hidden /> Nhóm chi
                </button>
              </div>
            </section>
          )}

          {/* Bao phủ quy tắc */}
          <section className="fin-card p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="font-jakarta text-[15px] font-semibold text-slate-900">Độ bao phủ nhận diện</h2>
              <span className="fin-label">{leaves} danh mục lá</span>
            </div>
            <div className="flex flex-col gap-1.5">
              <div
                className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex"
                role="img"
                aria-label={`${Math.round(coveredPct * 100)}% danh mục có quy tắc`}
              >
                <div className="bg-teal-700 transition-[width] duration-500" style={{ width: `${coveredPct * 100}%` }} />
                <div className="bg-amber-400 flex-1" />
              </div>
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-teal-700" aria-hidden /> Có quy tắc:{' '}
                  <strong className="fin-num">{leaves - uncovered.length}</strong>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-amber-400" aria-hidden /> Chưa có: <strong className="fin-num">{uncovered.length}</strong>
                </span>
              </div>
            </div>
            {uncovered.length > 0 ? (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex flex-col gap-2">
                <p className="text-xs text-slate-700">
                  <strong className="text-amber-800">{uncovered.length} danh mục</strong> chưa có từ khóa nhận diện từ nội dung chuyển khoản. Giao dịch của
                  chúng sẽ phải gán tay.
                </p>
                <ul className="flex flex-col gap-1">
                  {uncovered.slice(0, 4).map((c) => (
                    <li key={c.id} className="flex items-center justify-between gap-2 text-xs">
                      <button type="button" className="inline-flex items-center gap-1.5 min-w-0 text-slate-800 hover:text-teal-700" onClick={() => select(c)}>
                        <CategoryIcon icon={c.icon} color={c.color} size="sm" /> <span className="truncate">{c.name}</span>
                      </button>
                      <button type="button" className="font-semibold text-teal-700 hover:underline whitespace-nowrap" onClick={() => setRuleFor(c.id)}>
                        + Gán
                      </button>
                    </li>
                  ))}
                  {uncovered.length > 4 && <li className="text-[11px] text-slate-500">… và {uncovered.length - 4} danh mục khác</li>}
                </ul>
              </div>
            ) : (
              <p className="text-xs text-emerald-700">Mọi danh mục lá đều có ít nhất một quy tắc nhận diện.</p>
            )}
          </section>

          <section className="rounded-2xl bg-gradient-to-br from-teal-50 via-slate-50 to-white border border-slate-200 p-4 flex items-start gap-3">
            <span className="w-10 h-10 rounded-xl bg-white shadow-sm border border-slate-200 flex items-center justify-center text-teal-700 shrink-0">
              <Lightbulb className="w-5 h-5" aria-hidden />
            </span>
            <div className="min-w-0 text-xs text-slate-600 leading-relaxed">
              <p className="font-jakarta text-sm font-semibold text-slate-900">Mẹo phân tầng</p>
              Danh mục cha gom nhóm, danh mục con nhận giao dịch và quy tắc. Đổi nhóm cha của một danh mục trong bảng chi tiết. Hạn mức đặt ở trang Ngân sách.
            </div>
          </section>
        </div>
      </section>

      {ruleFor !== null && <RuleModal rule={null} defaultCategoryId={ruleFor} categories={categories} onClose={() => setRuleFor(null)} onSaved={reload} />}
      <ConfirmModal
        isOpen={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && remove(deleting)}
        title="Xóa danh mục"
        message={`Xóa "${deleting?.name}"? ${deleting?._count?.transactions ?? 0} giao dịch sẽ về "Chưa phân loại", ${deleting?._count?.rules ?? 0} quy tắc và ngân sách của danh mục cũng bị xóa.${
          deleting?._count?.children ? ` ${deleting._count.children} danh mục con sẽ trở thành danh mục cấp cao nhất.` : ''
        }`}
        confirmText="Xóa"
      />
    </>
  );
}
