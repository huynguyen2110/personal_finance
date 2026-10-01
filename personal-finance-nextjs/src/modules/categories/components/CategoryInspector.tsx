'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { CornerDownRight, Plus, Save, SlidersHorizontal, Trash2, X } from 'lucide-react';
import CategoryIcon, { CATEGORY_COLORS, CATEGORY_ICONS } from '@/components/shared/CategoryIcon';
import { errorMessage } from '@/lib/api-client';
import { formatVND } from '@/lib/money';
import type { CategoryKind } from '@/types/common';
import type { BudgetLine } from '@/modules/budgets/types';
import type { RuleDTO } from '@/modules/rules/types';
import { ruleKeywords } from '@/modules/rules/utils/rule-match';
import { createCategory, updateCategory } from '../lib';
import type { CategoryDTO } from '../types';
import { parentOptions } from '../utils/tree';

interface Props {
  // null = tạo danh mục mới thuộc `kind` (và nằm dưới `initialParentId` nếu có)
  category: CategoryDTO | null;
  kind: CategoryKind;
  initialParentId?: number | null;
  categories: CategoryDTO[];
  rules: RuleDTO[];
  budgetLine?: BudgetLine;
  onClose: () => void;
  onSaved: (saved?: { id: number }) => void;
  onDelete: (c: CategoryDTO) => void;
  onAddRule: (categoryId: number) => void;
}

// Bảng chi tiết bên phải Cây danh mục: sửa tên/loại/cha/icon/màu, xem từ khóa nhận diện
export default function CategoryInspector({
  category,
  kind: initialKind,
  initialParentId = null,
  categories,
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
  const [icon, setIcon] = useState(category?.icon ?? 'Tag');
  const [color, setColor] = useState(category?.color ?? CATEGORY_COLORS[0]);
  const [saving, setSaving] = useState(false);

  const txnCount = category?._count?.transactions ?? 0;
  const childCount = category?._count?.children ?? 0;
  const kindLocked = !!category && (txnCount > 0 || childCount > 0);
  const parentLocked = childCount > 0;
  const parents = parentOptions(categories, kind, category?.id);
  const effectiveParentId = parents.some((p) => p.id === parentId) ? parentId : null;
  const dirty =
    !category ||
    name !== category.name ||
    kind !== category.kind ||
    effectiveParentId !== category.parentId ||
    icon !== category.icon ||
    color !== category.color;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return toast.error('Nhập tên danh mục');
    setSaving(true);
    try {
      const payload = { name: name.trim(), icon, color, kind, parentId: effectiveParentId };
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
            <select
              className="select-field !py-2 !rounded-lg !bg-slate-50 text-sm"
              value={kind}
              onChange={(e) => {
                setKind(e.target.value as CategoryKind);
                setParentId(null);
              }}
              disabled={kindLocked}
            >
              <option value="EXPENSE">Chi tiêu (tiền ra)</option>
              <option value="INCOME">Thu nhập (tiền vào)</option>
            </select>
            {kindLocked && <span className="text-[11px] text-slate-500">{txnCount > 0 ? 'Đã có giao dịch' : 'Đang có danh mục con'}, không đổi được loại</span>}
          </label>
          <label className="flex flex-col gap-1">
            <span className="fin-label">Thuộc nhóm cha</span>
            <select
              className="select-field !py-2 !rounded-lg !bg-slate-50 text-sm"
              value={effectiveParentId ?? ''}
              onChange={(e) => setParentId(e.target.value ? Number(e.target.value) : null)}
              disabled={parentLocked}
            >
              <option value="">— Danh mục cấp cao nhất —</option>
              {parents.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            {parentLocked && <span className="text-[11px] text-slate-500">Đang có {childCount} danh mục con nên phải là cấp cao nhất</span>}
          </label>
        </div>

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
