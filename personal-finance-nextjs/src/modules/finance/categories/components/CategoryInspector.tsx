'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { ArrowDownLeft, ArrowUpRight, CornerDownRight, Layers, LayoutGrid, Plus, Save, SlidersHorizontal, Trash2, X } from 'lucide-react';
import CategoryIcon, { CATEGORY_COLORS, CATEGORY_ICONS } from '@/components/shared/CategoryIcon';
import TreeSelect from '@/components/shared/TreeSelect';
import { errorMessage } from '@/lib/api-client';
import { formatVND } from '@/lib/money';
import type { CategoryKind } from '@/types/common';
import type { BudgetLine } from '@/modules/finance/budgets/types';
import type { RuleDTO } from '@/modules/finance/rules/types';
import { ruleKeywords } from '@/modules/finance/rules/utils/rule-match';
import { createCategory, updateCategory } from '../lib';
import type { CategoryDTO, CategoryGroupDTO } from '../types';
import { parentOptions } from '../utils/tree';

interface Props {
  // null = tạo danh mục mới thuộc `kind` (và nằm dưới `initialParentId` nếu có)
  category: CategoryDTO | null;
  kind: CategoryKind;
  initialParentId?: number | null;
  categories: CategoryDTO[];
  groups: CategoryGroupDTO[];
  rules: RuleDTO[];
  budgetLine?: BudgetLine;
  onClose: () => void;
  onSaved: (saved?: { id: number }) => void;
  onDelete: (c: CategoryDTO) => void;
  onAddRule: (categoryId: number) => void;
}

// Lớp cho các ô chọn trong bảng: bo góc nhỏ, nền xám nhạt như ô tên
const FIELD = '!rounded-lg !bg-slate-50 hover:!bg-white';

// Icon vuông nhỏ cho các lựa chọn không phải danh mục (cấp cao nhất, không nhóm, loại dòng tiền)
function OptionIcon({ icon: Icon, tone }: { icon: typeof Layers; tone: string }) {
  return (
    <span className={`w-6 h-6 rounded-md inline-flex items-center justify-center ${tone}`} aria-hidden>
      <Icon className="w-3.5 h-3.5" />
    </span>
  );
}

// Bảng chi tiết bên phải Cây danh mục: sửa tên/loại/cha/icon/màu, xem từ khóa nhận diện
export default function CategoryInspector({
  category,
  kind: initialKind,
  initialParentId = null,
  categories,
  groups,
  rules,
  budgetLine,
  onClose,
  onSaved,
  onDelete,
  onAddRule,
}: Props) {
  const [name, setName] = useState(category?.name ?? '');
  const [kind, setKind] = useState<CategoryKind>(category?.kind ?? initialKind);
  const [parentId, setParentId] = useState<number | null>(category?.parentId ?? initialParentId);
  const [groupId, setGroupId] = useState<number | null>(category?.groupId ?? null);
  const [icon, setIcon] = useState(category?.icon ?? 'Tag');
  const [color, setColor] = useState(category?.color ?? CATEGORY_COLORS[0]);
  const [saving, setSaving] = useState(false);

  const txnCount = category?._count?.transactions ?? 0;
  const childCount = category?._count?.children ?? 0;
  const kindLocked = !!category && (txnCount > 0 || childCount > 0);
  const parentLocked = childCount > 0;
  const parents = parentOptions(categories, kind, category?.id);
  const effectiveParentId = parents.some((p) => p.id === parentId) ? parentId : null;
  // Nhóm chỉ áp dụng cho danh mục cấp cao nhất và phải cùng loại
  const groupOptions = groups.filter((g) => g.kind === kind);
  const effectiveGroupId = effectiveParentId === null && groupOptions.some((g) => g.id === groupId) ? groupId : null;
  const dirty =
    !category ||
    name !== category.name ||
    kind !== category.kind ||
    effectiveParentId !== category.parentId ||
    effectiveGroupId !== category.groupId ||
    icon !== category.icon ||
    color !== category.color;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return toast.error('Nhập tên danh mục');
    setSaving(true);
    try {
      const payload = { name: name.trim(), icon, color, kind, parentId: effectiveParentId, groupId: effectiveGroupId };
      if (category) {
        await updateCategory(category.id, payload);
        toast.success('Đã lưu danh mục');
        onSaved({ id: category.id });
      } else {
        const created = await createCategory(payload);
        toast.success(effectiveParentId ? 'Đã tạo danh mục con' : 'Đã tạo danh mục');
        onSaved(created?.id ? { id: created.id } : undefined);
      }
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const title = category ? 'Chi tiết danh mục' : effectiveParentId ? 'Thêm danh mục con' : 'Thêm danh mục cha';

  return (
    <section className="fin-card p-4 md:p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
        <h2 className="font-jakarta text-[15px] font-semibold text-slate-900 inline-flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-teal-700" aria-hidden /> {title}
        </h2>
        <div className="flex items-center gap-2">
          <span className={`fin-label px-2 py-0.5 rounded-full ${category ? 'bg-teal-50 !text-teal-700' : 'bg-amber-100 !text-amber-800'}`}>
            {category ? (category.parentId ? 'Danh mục con' : childCount ? `Cha (${childCount} con)` : 'Đang chọn') : 'Tạo mới'}
          </span>
          <button type="button" className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100" onClick={onClose} aria-label="Đóng bảng chi tiết">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <form onSubmit={submit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1">
          <span className="fin-label">Tên danh mục hiển thị</span>
          <input className="input-field !rounded-lg !bg-slate-50 focus:!bg-white font-semibold" value={name} onChange={(e) => setName(e.target.value)} placeholder="VD: Cà phê & Đồ uống" autoFocus={!category} />
        </label>

        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1">
            <span className="fin-label">Loại dòng tiền</span>
            <TreeSelect<CategoryKind>
              ariaLabel="Loại dòng tiền"
              className={FIELD}
              options={[
                { value: 'EXPENSE', label: 'Chi tiêu (tiền ra)', icon: <OptionIcon icon={ArrowUpRight} tone="text-expense bg-orange-50" /> },
                { value: 'INCOME', label: 'Thu nhập (tiền vào)', icon: <OptionIcon icon={ArrowDownLeft} tone="text-income bg-blue-50" /> },
              ]}
              value={kind}
              onChange={(v) => {
                if (!v) return;
                setKind(v);
                setParentId(null);
              }}
              disabled={kindLocked}
            />
            {kindLocked && <span className="text-[11px] text-slate-500">{txnCount > 0 ? 'Đã có giao dịch' : 'Đang có danh mục con'}, không đổi được loại</span>}
          </label>
          <label className="flex flex-col gap-1">
            <span className="fin-label">Thuộc nhóm cha</span>
            <TreeSelect<number>
              ariaLabel="Thuộc nhóm cha"
              className={FIELD}
              options={[
                { value: 0, label: 'Danh mục cấp cao nhất', icon: <OptionIcon icon={Layers} tone="text-slate-500 bg-slate-100" /> },
                ...parents.map((p) => ({ value: p.id, label: p.name, group: 'Nằm dưới danh mục', icon: <CategoryIcon icon={p.icon} color={p.color} size="sm" /> })),
              ]}
              value={effectiveParentId ?? 0}
              onChange={(v) => setParentId(v ? v : null)}
              disabled={parentLocked}
            />
            {parentLocked && <span className="text-[11px] text-slate-500">Đang có {childCount} danh mục con nên phải là cấp cao nhất</span>}
          </label>
        </div>

        {effectiveParentId === null && (
          <label className="flex flex-col gap-1">
            <span className="fin-label">Thuộc nhóm {kind === 'EXPENSE' ? 'chi tiêu' : 'thu nhập'}</span>
            <TreeSelect<number>
              ariaLabel={`Thuộc nhóm ${kind === 'EXPENSE' ? 'chi tiêu' : 'thu nhập'}`}
              className={FIELD}
              options={[
                { value: 0, label: 'Không thuộc nhóm nào', icon: <OptionIcon icon={LayoutGrid} tone="text-slate-500 bg-slate-100" /> },
                ...groupOptions.map((g) => ({ value: g.id, label: g.name, group: 'Nhóm', icon: <CategoryIcon icon={g.icon} color={g.color} size="sm" /> })),
              ]}
              value={effectiveGroupId ?? 0}
              onChange={(v) => setGroupId(v ? v : null)}
            />
            {!groupOptions.length && <span className="text-[11px] text-slate-500">Chưa có nhóm nào. Tạo ở tab &ldquo;Nhóm &amp; Tài khoản&rdquo;.</span>}
          </label>
        )}

        <div className="flex flex-col gap-1.5">
          <span className="fin-label">Biểu tượng &amp; màu đại diện</span>
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
          <div className="grid grid-cols-8 sm:grid-cols-11 xl:grid-cols-8 gap-1 max-h-32 overflow-y-auto p-1.5 rounded-lg bg-slate-50 border border-slate-200">
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

        {category && (
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-slate-600 flex flex-col gap-0.5">
              <span>
                <strong className="text-slate-900 fin-num">{txnCount}</strong> giao dịch
              </span>
              <span>
                <strong className="text-slate-900 fin-num">{rules.length}</strong> quy tắc nhận diện
              </span>
            </div>
            <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-slate-600 flex flex-col gap-0.5">
              {category.kind === 'EXPENSE' && budgetLine ? (
                <>
                  <span className="fin-label !text-[10px]">Tháng này</span>
                  <span className="font-semibold text-slate-900 fin-num">
                    {formatVND(budgetLine.spent)}
                    {budgetLine.amount !== null && <span className="text-slate-400 font-normal"> / {formatVND(budgetLine.amount)}</span>}
                  </span>
                  {budgetLine.amount === null && <span className="text-[11px] text-slate-500">Chưa đặt hạn mức</span>}
                </>
              ) : (
                <span className="inline-flex items-center gap-1">
                  <CornerDownRight className="w-3.5 h-3.5" aria-hidden /> {childCount ? `${childCount} danh mục con` : category.parentId ? 'Danh mục con' : 'Cấp cao nhất'}
                </span>
              )}
            </div>
          </div>
        )}

        {category && (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="fin-label">Từ khóa tự động nhận diện ({rules.length} quy tắc)</span>
              <button type="button" className="text-xs font-semibold text-teal-700 hover:underline inline-flex items-center gap-0.5" onClick={() => onAddRule(category.id)}>
                <Plus className="w-3.5 h-3.5" aria-hidden /> Gán thêm
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5 p-2.5 rounded-lg bg-slate-50 border border-slate-200 min-h-11">
              {rules.length === 0 && <span className="text-xs text-slate-500">Chưa có từ khóa — giao dịch của danh mục này phải gán tay.</span>}
              {rules.flatMap((r) =>
                ruleKeywords(r).map((kw) => (
                  <span key={`${r.id}-${kw}`} className={`px-2 py-1 rounded-md bg-white border border-slate-200 text-[12px] font-semibold shadow-sm ${r.isActive ? 'text-slate-800' : 'text-slate-400 line-through'}`} title={`Ưu tiên ${r.priority}${r.isActive ? '' : ' · đã tắt'}`}>
                    {r.matchType === 'REGEX' ? `/${kw}/i` : kw}
                  </span>
                ))
              )}
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 pt-1">
          <button type="submit" disabled={saving || !dirty} className="fin-btn fin-btn-primary flex-1 justify-center">
            <Save className="w-4 h-4" aria-hidden /> {saving ? 'Đang lưu…' : category ? 'Lưu thay đổi' : 'Tạo danh mục'}
          </button>
          <button type="button" className="fin-btn fin-btn-outline" onClick={onClose}>
            Hủy
          </button>
          {category && (
            <button
              type="button"
              className="fin-btn fin-btn-outline !text-rose-600 hover:!bg-rose-50 hover:!border-rose-200 disabled:!text-slate-400"
              onClick={() => onDelete(category)}
              disabled={category.isSystem}
              title={category.isSystem ? 'Danh mục hệ thống không xóa được' : 'Xóa danh mục'}
              aria-label="Xóa danh mục"
            >
              <Trash2 className="w-4 h-4" aria-hidden />
            </button>
          )}
        </div>
      </form>
    </section>
  );
}
