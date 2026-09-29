'use client';

import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { FlaskConical, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';
import Header from '@/components/layout/Header';
import Modal from '@/components/shared/Modal';
import ConfirmModal from '@/components/shared/ConfirmModal';
import CategoryIcon, { CATEGORY_COLORS, CATEGORY_ICONS } from '@/components/shared/CategoryIcon';
import CategorySelect from '@/components/shared/CategorySelect';
import { useCategories } from '@/hooks/useMeta';
import { api } from '@/lib/client';
import type { CategoryDTO, CategoryKind, Direction, RuleDTO } from '@/lib/types';

type Tab = 'categories' | 'rules';

export default function CategoriesPage() {
  const [tab, setTab] = useState<Tab>('categories');
  const { categories, reload: reloadCategories } = useCategories();

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

function CategoriesTab({ categories, reload }: { categories: CategoryDTO[]; reload: () => Promise<void> }) {
  const [editing, setEditing] = useState<CategoryDTO | null>(null);
  const [creatingKind, setCreatingKind] = useState<CategoryKind | null>(null);
  const [deleting, setDeleting] = useState<CategoryDTO | null>(null);

  async function remove(c: CategoryDTO) {
    try {
      await api(`/api/categories/${c.id}`, { method: 'DELETE' });
      toast.success('Đã xóa danh mục');
      reload();
    } catch (e) {
      toast.error((e as Error).message);
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
      const body = JSON.stringify({ name, icon, color, kind });
      if (category) await api(`/api/categories/${category.id}`, { method: 'PATCH', body });
      else await api('/api/categories', { method: 'POST', body });
      toast.success('Đã lưu danh mục');
      onSaved();
      onClose();
    } catch (err) {
      toast.error((err as Error).message);
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

// ─── Quy tắc ───

function RulesTab({ categories }: { categories: CategoryDTO[] }) {
  const [rules, setRules] = useState<RuleDTO[]>([]);
  const [editing, setEditing] = useState<RuleDTO | 'new' | null>(null);
  const [deleting, setDeleting] = useState<RuleDTO | null>(null);
  const [applying, setApplying] = useState(false);

  const reload = useCallback(
    () =>
      api<RuleDTO[]>('/api/rules')
        .then(setRules)
        .catch((e: Error) => toast.error(e.message)),
    []
  );
  useEffect(() => {
    reload();
  }, [reload]);

  async function toggle(r: RuleDTO) {
    try {
      await api(`/api/rules/${r.id}`, { method: 'PATCH', body: JSON.stringify({ isActive: !r.isActive }) });
      reload();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function remove(r: RuleDTO) {
    try {
      await api(`/api/rules/${r.id}`, { method: 'DELETE' });
      toast.success('Đã xóa quy tắc');
      reload();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function reapply(includeRuleCategorized: boolean) {
    setApplying(true);
    try {
      const r = await api<{ changed: number }>('/api/rules/reapply', {
        method: 'POST',
        body: JSON.stringify({ includeRuleCategorized }),
      });
      toast.success(`Đã cập nhật ${r.changed} giao dịch`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setApplying(false);
    }
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
      <section className="glass-card xl:col-span-2 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 p-4 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-semibold text-text">Quy tắc ({rules.length})</h2>
            <p className="text-xs text-text-muted">Chạy theo thứ tự ưu tiên (số nhỏ trước). Quy tắc đầu tiên khớp sẽ được dùng.</p>
          </div>
          <button type="button" className="btn-primary !py-2 text-sm flex items-center gap-1.5" onClick={() => setEditing('new')}>
            <Plus className="w-4 h-4" /> Thêm quy tắc
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead className="table-header">
              <tr>
                <th className="px-3 py-2 text-left w-16">Ưu tiên</th>
                <th className="px-3 py-2 text-left">Từ khóa / mẫu</th>
                <th className="px-3 py-2 text-left">Danh mục</th>
                <th className="px-3 py-2 text-center w-20">Bật</th>
                <th className="px-3 py-2 w-20" />
              </tr>
            </thead>
            <tbody>
              {rules.map((r) => (
                <tr key={r.id} className={`table-row ${r.isActive ? '' : 'opacity-50'}`}>
                  <td className="px-3 py-2 text-text-secondary tabular">{r.priority}</td>
                  <td className="px-3 py-2">
                    {r.matchType === 'REGEX' ? (
                      <code className="text-xs bg-slate-100 rounded px-1.5 py-0.5">/{r.pattern}/</code>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {r.pattern.split(',').map((w) => w.trim()).filter(Boolean).map((w) => (
                          <span key={w} className="badge badge-muted">{w}</span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <span className="inline-flex items-center gap-2">
                      <CategoryIcon icon={r.category.icon} color={r.category.color} size="sm" />
                      <span className="text-text">{r.category.name}</span>
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <input type="checkbox" checked={r.isActive} onChange={() => toggle(r)} aria-label="Bật quy tắc" />
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex justify-end gap-1">
                      <button type="button" className="btn-icon !p-1.5" aria-label="Sửa quy tắc" onClick={() => setEditing(r)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button type="button" className="btn-icon !p-1.5 hover:!text-danger" aria-label="Xóa quy tắc" onClick={() => setDeleting(r)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="space-y-4">
        <RuleTester />
        <section className="glass-card p-4 space-y-3">
          <h2 className="text-sm font-semibold text-text flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-text-muted" /> Áp dụng lại quy tắc
          </h2>
          <p className="text-xs text-text-muted">
            Giao dịch mới được phân loại tự động khi về. Sau khi thêm/sửa quy tắc, bấm để áp dụng cho giao dịch cũ.
            Giao dịch bạn đã tự chọn danh mục không bao giờ bị ghi đè.
          </p>
          <button type="button" disabled={applying} className="btn-primary w-full !py-2 text-sm disabled:opacity-60" onClick={() => reapply(false)}>
            Phân loại giao dịch chưa có danh mục
          </button>
          <button type="button" disabled={applying} className="btn-secondary w-full !py-2 text-sm disabled:opacity-60" onClick={() => reapply(true)}>
            Phân loại lại cả giao dịch đã gán bằng quy tắc
          </button>
        </section>
      </div>

      {editing && (
        <RuleModal rule={editing === 'new' ? null : editing} categories={categories} onClose={() => setEditing(null)} onSaved={reload} />
      )}
      <ConfirmModal
        isOpen={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && remove(deleting)}
        title="Xóa quy tắc"
        message={`Xóa quy tắc "${deleting?.pattern}"? Giao dịch đã phân loại vẫn giữ nguyên danh mục.`}
        confirmText="Xóa"
      />
    </div>
  );
}

function RuleModal({
  rule,
  categories,
  onClose,
  onSaved,
}: {
  rule: RuleDTO | null;
  categories: CategoryDTO[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [pattern, setPattern] = useState(rule?.pattern ?? '');
  const [matchType, setMatchType] = useState<RuleDTO['matchType']>(rule?.matchType ?? 'CONTAINS');
  const [categoryId, setCategoryId] = useState<number | null>(rule?.categoryId ?? null);
  const [priority, setPriority] = useState(String(rule?.priority ?? 100));
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!categoryId) return toast.error('Chọn danh mục');
    setSaving(true);
    try {
      const body = JSON.stringify({ pattern, matchType, categoryId, priority: Number(priority) || 100 });
      if (rule) await api(`/api/rules/${rule.id}`, { method: 'PATCH', body });
      else await api('/api/rules', { method: 'POST', body });
      toast.success('Đã lưu quy tắc');
      onSaved();
      onClose();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal isOpen onClose={onClose} title={rule ? 'Sửa quy tắc' : 'Thêm quy tắc'}>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              ['CONTAINS', 'Chứa từ khóa'],
              ['REGEX', 'Biểu thức (regex)'],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              onClick={() => setMatchType(k)}
              aria-pressed={matchType === k}
              className={`rounded-xl border px-3 py-2 text-sm font-medium ${
                matchType === k ? 'border-primary bg-primary/10 text-primary' : 'border-slate-200 text-text-secondary hover:bg-slate-50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="block">
          <span className="block text-xs font-medium text-text-secondary mb-1">
            {matchType === 'CONTAINS' ? 'Từ khóa (ngăn cách bằng dấu phẩy)' : 'Biểu thức chính quy'}
          </span>
          <input
            className="input-field font-mono"
            value={pattern}
            onChange={(e) => setPattern(e.target.value)}
            placeholder={matchType === 'CONTAINS' ? 'GRAB, XANH SM, BE GROUP' : 'CK DEN .* (ME|BO)'}
            autoFocus
          />
          <span className="block text-xs text-text-muted mt-1">
            {matchType === 'CONTAINS'
              ? 'Khớp nguyên cụm từ, không phân biệt hoa thường/dấu. VD "GRAB" khớp "GRAB*123" nhưng không khớp "GRABFOOD".'
              : 'Chạy trên nội dung đã bỏ dấu và viết HOA, không phân biệt hoa thường.'}
          </span>
        </label>
        <div className="grid grid-cols-3 gap-3">
          <label className="block col-span-2">
            <span className="block text-xs font-medium text-text-secondary mb-1">Danh mục</span>
            <CategorySelect categories={categories} value={categoryId} onChange={setCategoryId} placeholder="Chọn danh mục…" />
          </label>
          <label className="block">
            <span className="block text-xs font-medium text-text-secondary mb-1">Ưu tiên</span>
            <input type="number" min={0} className="input-field" value={priority} onChange={(e) => setPriority(e.target.value)} />
          </label>
        </div>
        <p className="text-xs text-text-muted">
          Quy tắc chỉ áp dụng cho giao dịch cùng loại với danh mục (danh mục chi → tiền ra, danh mục thu → tiền vào).
        </p>
        <div className="flex gap-3">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Hủy</button>
          <button type="submit" disabled={saving} className="btn-primary flex-1 disabled:opacity-60">{saving ? 'Đang lưu…' : 'Lưu'}</button>
        </div>
      </form>
    </Modal>
  );
}

function RuleTester() {
  const [content, setContent] = useState('');
  const [direction, setDirection] = useState<Direction>('OUT');
  const [result, setResult] = useState<{
    normalized: string;
    rule: { pattern: string } | null;
    category: Pick<CategoryDTO, 'name' | 'icon' | 'color'> | null;
  } | null>(null);

  async function test(e: React.FormEvent) {
    e.preventDefault();
    try {
      setResult(await api('/api/rules/test', { method: 'POST', body: JSON.stringify({ content, direction }) }));
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <section className="glass-card p-4">
      <h2 className="text-sm font-semibold text-text flex items-center gap-2 mb-3">
        <FlaskConical className="w-4 h-4 text-text-muted" /> Thử quy tắc
      </h2>
      <form onSubmit={test} className="space-y-2">
        <input
          className="input-field"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Dán nội dung chuyển khoản…"
          aria-label="Nội dung chuyển khoản"
        />
        <div className="flex gap-2">
          <select className="select-field" value={direction} onChange={(e) => setDirection(e.target.value as Direction)} aria-label="Loại">
            <option value="OUT">Tiền ra (chi)</option>
            <option value="IN">Tiền vào (thu)</option>
          </select>
          <button type="submit" className="btn-secondary !py-2 text-sm whitespace-nowrap">Kiểm tra</button>
        </div>
      </form>
      {result && (
        <div className="mt-3 rounded-xl bg-surface-light p-3 text-sm space-y-1">
          <p className="text-xs text-text-muted break-words">Chuẩn hóa: {result.normalized || '(trống)'}</p>
          {result.category ? (
            <p className="flex items-center gap-2 text-text">
              <CategoryIcon icon={result.category.icon} color={result.category.color} size="sm" />
              {result.category.name}
              <span className="text-xs text-text-muted">— khớp “{result.rule?.pattern}”</span>
            </p>
          ) : (
            <p className="text-text-secondary">Không khớp quy tắc nào → Chưa phân loại</p>
          )}
        </div>
      )}
    </section>
  );
}
