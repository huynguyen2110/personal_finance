'use client';

import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowDownLeft, ArrowUpRight, CheckCircle2, Landmark, Layers, Pencil, Plus, RefreshCw, Save, Sparkles, Trash2, TriangleAlert, Wand2, X } from 'lucide-react';
import ConfirmModal from '@/components/shared/ConfirmModal';
import TreeSelect from '@/components/shared/TreeSelect';
import CategoryIcon, { CATEGORY_COLORS, CATEGORY_ICONS } from '@/components/shared/CategoryIcon';
import { errorMessage } from '@/lib/api-client';
import { invalidateFinanceData } from '@/lib/query-client';
import type { CategoryKind } from '@/types/common';
import type { AccountDTO } from '@/modules/finance/accounts/types';
import { reapplyRules } from '@/modules/finance/rules/lib';
import { createCategoryGroup, deleteCategoryGroup, updateCategoryGroup } from '../lib';
import type { CategoryDTO, CategoryGroupDTO } from '../types';
import { effectiveDefaultCategoryId } from '../utils/groups';

interface Props {
  categories: CategoryDTO[];
  groups: CategoryGroupDTO[];
  accounts: AccountDTO[];
}

type Inspect = { mode: 'edit'; id: number } | { mode: 'create'; kind: CategoryKind } | null;

const KIND_LABEL: Record<CategoryKind, string> = { EXPENSE: 'chi tiêu', INCOME: 'thu nhập' };

// Tab "Nhóm & Tài khoản": gom danh mục cha thành nhóm, gán nhóm cho tài khoản ngân hàng thường chi cho nhóm đó
export default function CategoryGroupsTab({ categories, groups, accounts }: Props) {
  const qc = useQueryClient();
  const reload = () => invalidateFinanceData(qc);

  const [inspect, setInspect] = useState<Inspect>(null);
  const [deleting, setDeleting] = useState<CategoryGroupDTO | null>(null);
  const [reapplying, setReapplying] = useState(false);

  const categoryById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const accountById = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);
  const selected = inspect?.mode === 'edit' ? groups.find((g) => g.id === inspect.id) ?? null : null;

  const sections = (['EXPENSE', 'INCOME'] as const).map((kind) => ({
    kind,
    title: kind === 'EXPENSE' ? 'Nhóm chi tiêu' : 'Nhóm thu nhập',
    dot: kind === 'EXPENSE' ? 'bg-teal-700' : 'bg-emerald-500',
    items: groups.filter((g) => g.kind === kind),
    ungrouped: categories.filter((c) => c.kind === kind && c.parentId === null && c.groupId === null),
  }));

  async function remove(g: CategoryGroupDTO) {
    try {
      await deleteCategoryGroup(g.id);
      toast.success('Đã xóa nhóm');
      if (selected?.id === g.id) setInspect(null);
      reload();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  async function reapply() {
    setReapplying(true);
    try {
      const r = await reapplyRules(false);
      toast.success(r.changed ? `Đã phân loại lại ${r.changed} giao dịch` : 'Không có giao dịch nào thay đổi');
      reload();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setReapplying(false);
    }
  }

  return (
    <>
      <section className="grid grid-cols-1 xl:grid-cols-12 gap-4 md:gap-6 items-start">
        {/* Cột trái: danh sách nhóm theo loại */}
        <div className="xl:col-span-8 flex flex-col gap-4 md:gap-6">
          {sections.map((s) => (
            <div key={s.kind} className="fin-card overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 bg-slate-50 border-b border-slate-200">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className={`w-2.5 h-2.5 rounded-full ${s.dot}`} aria-hidden />
                  <h2 className="font-jakarta text-[14px] font-semibold text-slate-900 uppercase tracking-wide">{s.title}</h2>
                  <span className="fin-label px-2 py-0.5 rounded-full bg-white border border-slate-200">{s.items.length} nhóm</span>
                </div>
                <button type="button" className="fin-btn fin-btn-outline fin-btn-sm" onClick={() => setInspect({ mode: 'create', kind: s.kind })}>
                  <Plus className="w-4 h-4 text-teal-700" aria-hidden /> Thêm nhóm
                </button>
              </div>

              <div className="p-3 flex flex-col gap-2">
                {s.items.length === 0 && (
                  <p className="py-6 text-center text-sm text-slate-500">
                    Chưa có nhóm {KIND_LABEL[s.kind]} nào.{' '}
                    <button type="button" className="text-teal-700 font-semibold hover:underline" onClick={() => setInspect({ mode: 'create', kind: s.kind })}>
                      Tạo nhóm đầu tiên
                    </button>
                  </p>
                )}
                {s.items.map((g) => {
                  const active = selected?.id === g.id;
                  const cats = g.categoryIds.map((id) => categoryById.get(id)).filter((c): c is CategoryDTO => !!c);
                  const accs = g.accountIds.map((id) => accountById.get(id)).filter((a): a is AccountDTO => !!a);
                  const def = effectiveDefaultCategoryId(g);
                  const defCat = def ? categoryById.get(def) : undefined;
                  return (
                    <div
                      key={g.id}
                      className={`group/g rounded-xl border p-3 flex flex-col gap-2.5 cursor-pointer transition-colors ${
                        active ? 'border-teal-700/30 bg-teal-50/40' : 'border-slate-200 hover:bg-slate-50'
                      }`}
                      onClick={() => setInspect({ mode: 'edit', id: g.id })}
                      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), setInspect({ mode: 'edit', id: g.id }))}
                      role="button"
                      tabIndex={0}
                      aria-pressed={active}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <CategoryIcon icon={g.icon} color={g.color} size="lg" />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-sm font-semibold ${active ? 'text-teal-800' : 'text-slate-900'}`}>{g.name}</span>
                              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-semibold fin-num">{cats.length} danh mục cha</span>
                              {!cats.length && (
                                <span className="px-2 py-0.5 rounded-full bg-amber-100 border border-amber-200 text-amber-800 text-[11px] font-semibold inline-flex items-center gap-1">
                                  <TriangleAlert className="w-3 h-3" aria-hidden /> Chưa có danh mục
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5 truncate">
                              {defCat ? (
                                <>
                                  Mặc định: <span className="font-semibold text-slate-700">{defCat.name}</span>
                                </>
                              ) : (
                                'Chưa chọn danh mục mặc định — không tự gán khi không khớp quy tắc'
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center opacity-60 group-hover/g:opacity-100 transition-opacity shrink-0">
                          <button
                            type="button"
                            className="p-2 rounded-lg text-slate-500 hover:bg-white hover:text-slate-900"
                            aria-label="Sửa nhóm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setInspect({ mode: 'edit', id: g.id });
                            }}
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            className="p-2 rounded-lg text-slate-500 hover:bg-rose-50 hover:text-rose-600"
                            aria-label="Xóa nhóm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleting(g);
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        {cats.map((c) => (
                          <span key={c.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[12px] font-medium text-slate-700">
                            <CategoryIcon icon={c.icon} color={c.color} size="sm" /> {c.name}
                          </span>
                        ))}
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                        <Landmark className="w-3.5 h-3.5" aria-hidden />
                        {accs.length ? (
                          accs.map((a) => (
                            <span key={a.id} className="px-1.5 py-0.5 rounded bg-sky-50 text-sky-700 font-semibold">
                              {a.name}
                            </span>
                          ))
                        ) : (
                          <span>Chưa gán cho tài khoản nào</span>
                        )}
                      </div>
                    </div>
                  );
                })}

                {s.ungrouped.length > 0 && s.items.length > 0 && (
                  <p className="px-1 pt-1 text-xs text-slate-500">
                    Chưa thuộc nhóm nào: {s.ungrouped.map((c) => c.name).join(', ')}.
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Cột phải: bảng chi tiết nhóm + tổng quan tài khoản */}
        <div className="xl:col-span-4 flex flex-col gap-4 xl:sticky xl:top-20">
          {inspect?.mode === 'edit' && !selected ? (
            <section className="fin-card h-64 animate-pulse" aria-busy />
          ) : inspect ? (
            <GroupInspector
              key={inspect.mode === 'edit' ? `edit-${inspect.id}` : `new-${inspect.kind}`}
              group={selected}
              kind={selected?.kind ?? (inspect.mode === 'create' ? inspect.kind : 'EXPENSE')}
              categories={categories}
              accounts={accounts}
              onClose={() => setInspect(null)}
              onSaved={(saved) => {
                reload();
                setInspect(saved ? { mode: 'edit', id: saved.id } : null);
              }}
              onDelete={(g) => setDeleting(g)}
            />
          ) : (
            <section className="fin-card p-5 flex flex-col items-center text-center gap-3">
              <span className="w-12 h-12 rounded-2xl bg-slate-100 text-teal-700 flex items-center justify-center">
                <Layers className="w-5 h-5" aria-hidden />
              </span>
              <div>
                <h2 className="font-jakarta text-[15px] font-semibold text-slate-900">Nhóm chi tiêu theo tài khoản</h2>
                <p className="text-xs text-slate-500 mt-1">Gom danh mục cha thành nhóm và gán cho tài khoản để gợi ý phân loại.</p>
              </div>
              <button type="button" className="fin-btn fin-btn-primary fin-btn-sm" onClick={() => setInspect({ mode: 'create', kind: 'EXPENSE' })}>
                <Plus className="w-4 h-4" aria-hidden /> Tạo nhóm chi tiêu
              </button>
            </section>
          )}

          {/* Tài khoản nào đang được tự phân loại */}
          <section className="fin-card p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="font-jakarta text-[15px] font-semibold text-slate-900">Tự phân loại theo tài khoản</h2>
              <span className="fin-label">{accounts.filter((a) => a.isActive).length} tài khoản</span>
            </div>
            <ul className="flex flex-col gap-1.5">
              {accounts
                .filter((a) => a.isActive)
                .map((a) => {
                  const mine = groups.filter((g) => a.groupIds.includes(g.id));
                  const exp = mine.filter((g) => g.kind === 'EXPENSE');
                  const status = accountAutoStatus(exp, categoryById);
                  return (
                    <li key={a.id} className="flex items-start justify-between gap-2 text-xs rounded-lg bg-slate-50 border border-slate-200 px-3 py-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800 truncate">{a.name}</p>
                        <p className="text-slate-500 truncate">{mine.length ? mine.map((g) => g.name).join(', ') : 'Chưa gán nhóm nào'}</p>
                      </div>
                      <span className={`shrink-0 inline-flex items-center gap-1 font-semibold ${status.tone}`} title={status.hint}>
                        {status.icon}
                        {status.label}
                      </span>
                    </li>
                  );
                })}
            </ul>
            <button type="button" className="fin-btn fin-btn-outline fin-btn-sm self-start" disabled={reapplying} onClick={reapply}>
              <RefreshCw className={`w-3.5 h-3.5 text-slate-400 ${reapplying ? 'animate-spin' : ''}`} aria-hidden />
              {reapplying ? 'Đang áp dụng…' : 'Áp dụng cho giao dịch chưa phân loại'}
            </button>
          </section>
        </div>
      </section>

      <ConfirmModal
        isOpen={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && remove(deleting)}
        title="Xóa nhóm"
        message={`Xóa nhóm "${deleting?.name}"? ${deleting?.categoryIds.length ?? 0} danh mục trong nhóm vẫn giữ nguyên, chỉ không còn thuộc nhóm; ${
          deleting?.accountIds.length ?? 0
        } tài khoản sẽ bỏ gán nhóm này.`}
        confirmText="Xóa"
      />
    </>
  );
}

// Trạng thái tự gán của một tài khoản dựa trên các nhóm chi tiêu đã gán
function accountAutoStatus(expenseGroups: CategoryGroupDTO[], categoryById: Map<number, CategoryDTO>) {
  if (expenseGroups.length === 0) {
    return { label: 'Chưa gán', tone: 'text-slate-400', icon: null, hint: 'Gán nhóm trong trang Tài khoản hoặc ở bảng chi tiết nhóm' };
  }
  if (expenseGroups.length > 1) {
    return {
      label: 'Chỉ gợi ý',
      tone: 'text-sky-700',
      icon: <Sparkles className="w-3.5 h-3.5" aria-hidden />,
      hint: 'Nhiều nhóm nên không đoán được danh mục; chỉ gợi ý khi chọn tay',
    };
  }
  const def = effectiveDefaultCategoryId(expenseGroups[0]);
  const cat = def ? categoryById.get(def) : undefined;
  if (!cat) {
    return {
      label: 'Thiếu mặc định',
      tone: 'text-amber-700',
      icon: <TriangleAlert className="w-3.5 h-3.5" aria-hidden />,
      hint: 'Chọn danh mục mặc định cho nhóm để tự gán khi không khớp quy tắc',
    };
  }
  return {
    label: `→ ${cat.name}`,
    tone: 'text-emerald-700',
    icon: <CheckCircle2 className="w-3.5 h-3.5" aria-hidden />,
    hint: 'Giao dịch chi không khớp quy tắc sẽ được gán vào danh mục này',
  };
}

// Bảng chi tiết bên phải: tạo / sửa nhóm, chọn danh mục cha, danh mục mặc định và tài khoản
function GroupInspector({
  group,
  kind: initialKind,
  categories,
  accounts,
  onClose,
  onSaved,
  onDelete,
}: {
  group: CategoryGroupDTO | null;
  kind: CategoryKind;
  categories: CategoryDTO[];
  accounts: AccountDTO[];
  onClose: () => void;
  onSaved: (saved?: { id: number }) => void;
  onDelete: (g: CategoryGroupDTO) => void;
}) {
  const [name, setName] = useState(group?.name ?? '');
  const [kind, setKind] = useState<CategoryKind>(group?.kind ?? initialKind);
  const [icon, setIcon] = useState(group?.icon ?? 'Layers');
  const [color, setColor] = useState(group?.color ?? CATEGORY_COLORS[0]);
  const [categoryIds, setCategoryIds] = useState<number[]>(group?.categoryIds ?? []);
  const [defaultCategoryId, setDefaultCategoryId] = useState<number | null>(group?.defaultCategoryId ?? null);
  const [accountIds, setAccountIds] = useState<number[]>(group?.accountIds ?? []);
  const [saving, setSaving] = useState(false);

  const kindLocked = !!group && group.categoryIds.length > 0;
  const topLevel = categories.filter((c) => c.kind === kind && c.parentId === null);
  // Danh mục mặc định: cha trong nhóm hoặc con của cha trong nhóm
  const defaultOptions = topLevel
    .filter((c) => categoryIds.includes(c.id))
    .flatMap((p) => [p, ...categories.filter((c) => c.parentId === p.id)]);
  const effectiveDefault = defaultOptions.some((c) => c.id === defaultCategoryId) ? defaultCategoryId : null;

  const toggle = (list: number[], set: (v: number[]) => void, id: number) => set(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return toast.error('Nhập tên nhóm');
    setSaving(true);
    try {
      const payload = { name: name.trim(), kind, icon, color, categoryIds, defaultCategoryId: effectiveDefault, accountIds };
      if (group) {
        await updateCategoryGroup(group.id, payload);
        toast.success('Đã lưu nhóm');
        onSaved({ id: group.id });
      } else {
        const created = await createCategoryGroup(payload);
        toast.success('Đã tạo nhóm');
        onSaved(created?.id ? { id: created.id } : undefined);
      }
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="fin-card p-4 md:p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
        <h2 className="font-jakarta text-[15px] font-semibold text-slate-900 inline-flex items-center gap-2">
          <Layers className="w-4 h-4 text-teal-700" aria-hidden /> {group ? 'Chi tiết nhóm' : `Thêm nhóm ${KIND_LABEL[kind]}`}
        </h2>
        <button type="button" className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100" onClick={onClose} aria-label="Đóng">
          <X className="w-4 h-4" />
        </button>
      </div>

      <form onSubmit={submit} className="flex flex-col gap-4">
        <div className="grid grid-cols-3 gap-2">
          <label className="col-span-2 flex flex-col gap-1">
            <span className="fin-label">Tên nhóm</span>
            <input
              className="input-field !rounded-lg !bg-slate-50 focus:!bg-white font-semibold"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: Sinh hoạt gia đình"
              autoFocus={!group}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="fin-label">Loại</span>
            <TreeSelect<CategoryKind>
              ariaLabel="Loại"
              className="!rounded-lg !bg-slate-50 hover:!bg-white"
              options={[
                { value: 'EXPENSE', label: 'Chi', icon: <span className="w-6 h-6 rounded-md inline-flex items-center justify-center bg-orange-50 text-expense" aria-hidden><ArrowUpRight className="w-3.5 h-3.5" /></span> },
                { value: 'INCOME', label: 'Thu', icon: <span className="w-6 h-6 rounded-md inline-flex items-center justify-center bg-blue-50 text-income" aria-hidden><ArrowDownLeft className="w-3.5 h-3.5" /></span> },
              ]}
              value={kind}
              disabled={kindLocked}
              onChange={(v) => {
                if (!v) return;
                setKind(v);
                setCategoryIds([]);
                setDefaultCategoryId(null);
              }}
            />
          </label>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="fin-label">Biểu tượng &amp; màu</span>
          <div className="flex items-center gap-3">
            <CategoryIcon icon={icon} color={color} size="lg" />
            <div className="flex flex-wrap items-center gap-1.5 flex-1">
              {CATEGORY_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-6 h-6 rounded-full ring-offset-2 transition-shadow ${color === c ? 'ring-2 ring-slate-900' : 'hover:opacity-80'}`}
                  style={{ backgroundColor: c }}
                  aria-label={`Màu ${c}`}
                  aria-pressed={color === c}
                />
              ))}
            </div>
          </div>
          <div className="grid grid-cols-8 sm:grid-cols-11 xl:grid-cols-8 gap-1 max-h-24 overflow-y-auto p-1.5 rounded-lg bg-slate-50 border border-slate-200">
            {Object.entries(CATEGORY_ICONS).map(([key, Icon]) => (
              <button
                key={key}
                type="button"
                onClick={() => setIcon(key)}
                className={`h-8 rounded-md flex items-center justify-center border transition-colors ${
                  icon === key ? 'border-teal-700 bg-teal-50 text-teal-700' : 'border-transparent text-slate-500 hover:bg-white hover:border-slate-200'
                }`}
                aria-label={key}
                aria-pressed={icon === key}
              >
                <Icon className="w-4 h-4" />
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="fin-label">Danh mục cha trong nhóm</span>
            <span className="text-[11px] text-slate-500 fin-num">{categoryIds.length} đã chọn</span>
          </div>
          <div className="flex flex-col gap-1 max-h-56 overflow-y-auto p-1.5 rounded-lg bg-slate-50 border border-slate-200">
            {topLevel.length === 0 && <p className="text-xs text-slate-500 p-2">Chưa có danh mục {KIND_LABEL[kind]} cấp cao nhất nào.</p>}
            {topLevel.map((c) => {
              const on = categoryIds.includes(c.id);
              const elsewhere = c.groupId !== null && c.groupId !== group?.id;
              return (
                <label
                  key={c.id}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer text-sm ${on ? 'bg-white border border-teal-700/30' : 'hover:bg-white border border-transparent'}`}
                >
                  <input type="checkbox" className="accent-teal-700" checked={on} onChange={() => toggle(categoryIds, setCategoryIds, c.id)} />
                  <CategoryIcon icon={c.icon} color={c.color} size="sm" />
                  <span className="flex-1 min-w-0 truncate font-medium text-slate-800">{c.name}</span>
                  {elsewhere && !on && <span className="text-[10px] text-amber-700 font-semibold whitespace-nowrap">đang ở nhóm khác</span>}
                  {elsewhere && on && <span className="text-[10px] text-amber-700 font-semibold whitespace-nowrap">sẽ chuyển sang nhóm này</span>}
                </label>
              );
            })}
          </div>
        </div>

        <label className="flex flex-col gap-1">
          <span className="fin-label">Danh mục mặc định khi không khớp quy tắc</span>
          <TreeSelect<number>
            ariaLabel="Danh mục mặc định"
            className="!rounded-lg !bg-slate-50 hover:!bg-white"
            options={[
              {
                value: 0,
                label: categoryIds.length === 1 ? 'Tự lấy danh mục cha duy nhất' : 'Không tự gán',
                icon: <span className="w-6 h-6 rounded-md inline-flex items-center justify-center bg-slate-100 text-slate-500" aria-hidden><Wand2 className="w-3.5 h-3.5" /></span>,
              },
              ...defaultOptions.map((c) => ({
                value: c.id,
                label: c.name,
                depth: c.parentId !== null ? (1 as const) : (0 as const),
                group: 'Danh mục trong nhóm',
                icon: <CategoryIcon icon={c.icon} color={c.color} size="sm" />,
              })),
            ]}
            value={effectiveDefault ?? 0}
            onChange={(v) => setDefaultCategoryId(v ? v : null)}
            disabled={!defaultOptions.length}
          />
          <span className="text-[11px] text-slate-500">Chỉ dùng khi tài khoản gán đúng một nhóm {KIND_LABEL[kind]}.</span>
        </label>

        <div className="flex flex-col gap-1.5">
          <span className="fin-label">Tài khoản thường dùng nhóm này</span>
          <div className="flex flex-wrap gap-1.5">
            {accounts.map((a) => {
              const on = accountIds.includes(a.id);
              return (
                <button
                  key={a.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggle(accountIds, setAccountIds, a.id)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold transition-colors ${
                    on ? 'border-transparent bg-teal-700 text-white' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  } ${a.isActive ? '' : 'opacity-60'}`}
                >
                  <Landmark className="w-3 h-3" aria-hidden /> {a.name}
                </button>
              );
            })}
            {!accounts.length && <span className="text-xs text-slate-500">Chưa có tài khoản nào.</span>}
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <button type="submit" disabled={saving} className="fin-btn fin-btn-primary flex-1 justify-center">
            <Save className="w-4 h-4" aria-hidden /> {saving ? 'Đang lưu…' : group ? 'Lưu thay đổi' : 'Tạo nhóm'}
          </button>
          <button type="button" className="fin-btn fin-btn-outline" onClick={onClose}>
            Hủy
          </button>
          {group && (
            <button
              type="button"
              className="fin-btn fin-btn-outline !text-rose-600 hover:!bg-rose-50 hover:!border-rose-200"
              onClick={() => onDelete(group)}
              aria-label="Xóa nhóm"
              title="Xóa nhóm"
            >
              <Trash2 className="w-4 h-4" aria-hidden />
            </button>
          )}
        </div>
      </form>
    </section>
  );
}
