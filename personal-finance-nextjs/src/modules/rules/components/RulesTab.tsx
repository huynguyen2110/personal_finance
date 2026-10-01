'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';
import ConfirmModal from '@/components/shared/ConfirmModal';
import CategoryIcon from '@/components/shared/CategoryIcon';
import { errorMessage } from '@/lib/api-client';
import { invalidateFinanceData } from '@/lib/query-client';
import type { CategoryDTO } from '@/modules/categories/types';
import { deleteRule, reapplyRules, updateRule, useRules } from '../lib';
import type { RuleDTO } from '../types';
import RuleModal from './RuleModal';
import RuleTester from './RuleTester';

export default function RulesTab({ categories }: { categories: CategoryDTO[] }) {
  const qc = useQueryClient();
  const { data: rules = [] } = useRules();
  const [editing, setEditing] = useState<RuleDTO | 'new' | null>(null);
  const [deleting, setDeleting] = useState<RuleDTO | null>(null);
  const [applying, setApplying] = useState(false);

  // Quy tắc ảnh hưởng số đếm của danh mục → làm mới cả dữ liệu tài chính
  const reload = () => invalidateFinanceData(qc);

  async function toggle(r: RuleDTO) {
    try {
      await updateRule(r.id, { isActive: !r.isActive });
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
    setApplying(true);
    try {
      const r = await reapplyRules(includeRuleCategorized);
      toast.success(`Đã cập nhật ${r.changed} giao dịch`);
      reload();
    } catch (e) {
      toast.error(errorMessage(e));
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
