'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import Header from '@/components/layout/Header';
import Modal from '@/components/shared/Modal';
import ConfirmModal from '@/components/shared/ConfirmModal';
import CategoryIcon, { CATEGORY_COLORS, CATEGORY_ICONS } from '@/components/shared/CategoryIcon';
import { errorMessage } from '@/lib/api-client';
import { invalidateFinanceData } from '@/lib/query-client';
import type { CategoryKind } from '@/types/common';
import RulesTab from '@/modules/rules/components/RulesTab';
import { createCategory, deleteCategory, updateCategory, useCategories } from '../lib';
import type { CategoryDTO } from '../types';

type Tab = 'categories' | 'rules';

export default function CategoriesPage() {
  const [tab, setTab] = useState<Tab>('categories');
  const qc = useQueryClient();
  const { data: categories = [] } = useCategories();
  const reloadCategories = () => invalidateFinanceData(qc);

  return (
    <div>
      <Header title="Danh mục & Quy tắc" subtitle="Tự động phân loại giao dịch theo nội dung chuyển khoản" />
      <div className="px-4 md:px-6 pb-8 space-y-4">
        <div className="inline-flex rounded-xl bg-surface-light p-1 border border-slate-200" role="tablist">
          {(
            [
              ['categories', 'Danh mục'],
              ['rules', 'Quy tắc tự phân loại'],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              role="tab"
              aria-selected={tab === k}
              onClick={() => setTab(k)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                tab === k ? 'bg-white shadow-sm text-text' : 'text-text-secondary hover:text-text'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'categories' ? (
          <CategoriesTab categories={categories} reload={reloadCategories} />
        ) : (
          <RulesTab categories={categories} />
        )}
      </div>
    </div>
  );
}

// ─── Danh mục ───

function CategoriesTab({ categories, reload }: { categories: CategoryDTO[]; reload: () => void }) {
  const [editing, setEditing] = useState<CategoryDTO | null>(null);
  const [creatingKind, setCreatingKind] = useState<CategoryKind | null>(null);
  const [deleting, setDeleting] = useState<CategoryDTO | null>(null);

  async function remove(c: CategoryDTO) {
    try {
      await deleteCategory(c.id);
      toast.success('Đã xóa danh mục');
      reload();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {(
          [
            ['EXPENSE', 'Danh mục chi'],
            ['INCOME', 'Danh mục thu'],
          ] as const
        ).map(([kind, title]) => (
          <section key={kind} className="glass-card p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-text">{title}</h2>
              <button type="button" className="btn-secondary !py-1.5 !px-3 text-sm flex items-center gap-1.5" onClick={() => setCreatingKind(kind)}>
                <Plus className="w-4 h-4" /> Thêm
              </button>
            </div>
            <ul className="divide-y divide-slate-100">
              {categories
                .filter((c) => c.kind === kind)
                .map((c) => (
                  <li key={c.id} className="flex items-center gap-3 py-2.5">
                    <CategoryIcon icon={c.icon} color={c.color} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-text truncate">{c.name}</p>
                      <p className="text-xs text-text-muted">
                        {c._count?.transactions ?? 0} giao dịch · {c._count?.rules ?? 0} quy tắc
                      </p>
                    </div>
                    <button type="button" className="btn-icon !p-1.5" aria-label={`Sửa ${c.name}`} onClick={() => setEditing(c)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button type="button" className="btn-icon !p-1.5 hover:!text-danger" aria-label={`Xóa ${c.name}`} onClick={() => setDeleting(c)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </li>
                ))}
            </ul>
          </section>
        ))}
      </div>

      {(editing || creatingKind) && (
        <CategoryModal
          category={editing}
          kind={editing?.kind ?? creatingKind!}
          onClose={() => {
            setEditing(null);
            setCreatingKind(null);
          }}
          onSaved={reload}
        />
      )}
      <ConfirmModal
        isOpen={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && remove(deleting)}
        title="Xóa danh mục"
        message={`Xóa "${deleting?.name}"? ${deleting?._count?.transactions ?? 0} giao dịch sẽ về "Chưa phân loại", các quy tắc và ngân sách của danh mục cũng bị xóa.`}
        confirmText="Xóa"
      />
    </>
  );
}

function CategoryModal({
  category,
  kind,
  onClose,
  onSaved,
}: {
  category: CategoryDTO | null;
  kind: CategoryKind;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(category?.name ?? '');
  const [icon, setIcon] = useState(category?.icon ?? 'Tag');
  const [color, setColor] = useState(category?.color ?? CATEGORY_COLORS[0]);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { name, icon, color, kind };
      if (category) await updateCategory(category.id, payload);
      else await createCategory(payload);
      toast.success('Đã lưu danh mục');
      onSaved();
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal isOpen onClose={onClose} title={category ? 'Sửa danh mục' : `Thêm danh mục ${kind === 'EXPENSE' ? 'chi' : 'thu'}`}>
      <form onSubmit={submit} className="space-y-4">
        <div className="flex items-center gap-3">
          <CategoryIcon icon={icon} color={color} />
          <input className="input-field" value={name} onChange={(e) => setName(e.target.value)} placeholder="Tên danh mục" autoFocus aria-label="Tên danh mục" />
        </div>
        <div>
          <p className="text-xs font-medium text-text-secondary mb-2">Màu</p>
          <div className="flex flex-wrap gap-2">
            {CATEGORY_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`w-7 h-7 rounded-full ring-offset-2 ${color === c ? 'ring-2 ring-text' : ''}`}
                style={{ backgroundColor: c }}
                aria-label={`Màu ${c}`}
                aria-pressed={color === c}
              />
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs font-medium text-text-secondary mb-2">Biểu tượng</p>
          <div className="grid grid-cols-8 sm:grid-cols-11 gap-1.5 max-h-44 overflow-y-auto">
            {Object.entries(CATEGORY_ICONS).map(([key, Icon]) => (
              <button
                key={key}
                type="button"
                onClick={() => setIcon(key)}
                className={`h-9 rounded-lg flex items-center justify-center border ${
                  icon === key ? 'border-primary bg-primary/10 text-primary' : 'border-transparent text-text-secondary hover:bg-slate-100'
                }`}
                aria-label={key}
                aria-pressed={icon === key}
              >
                <Icon className="w-4 h-4" />
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Hủy</button>
          <button type="submit" disabled={saving} className="btn-primary flex-1 disabled:opacity-60">{saving ? 'Đang lưu…' : 'Lưu'}</button>
        </div>
      </form>
    </Modal>
  );
}
