'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  ArrowLeftRight,
  ChevronLeft,
  ChevronRight,
  Download,
  EyeOff,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Wand2,
  X,
} from 'lucide-react';
import Header from '@/components/layout/Header';
import CategoryIcon from '@/components/shared/CategoryIcon';
import CategorySelect from '@/components/shared/CategorySelect';
import ConfirmModal from '@/components/shared/ConfirmModal';
import { useQueryClient } from '@tanstack/react-query';
import TransactionFormModal from './TransactionFormModal';
import RuleFromTxnModal from '@/modules/rules/components/RuleFromTxnModal';
import { useAccounts } from '@/modules/accounts/lib';
import { useCategories } from '@/modules/categories/lib';
import { errorMessage } from '@/lib/api-client';
import { invalidateFinanceData } from '@/lib/query-client';
import { bulkUpdateTransactions, deleteTransaction, exportTransactions, updateTransaction, useTransactions } from '../lib';
import { formatVND } from '@/lib/money';
import { formatVNDateTime } from '@/lib/dates';
import type { TransactionDTO } from '../types';

const FILTER_KEYS = ['from', 'to', 'accountId', 'direction', 'categoryId', 'q', 'source', 'excluded', 'transfer', 'min', 'max', 'sort'] as const;
type FilterKey = (typeof FILTER_KEYS)[number];
type Filters = Partial<Record<FilterKey, string>>;

const SOURCE_LABEL = { EMAIL: 'Email ngân hàng', MANUAL: 'Nhập tay', IMPORT: 'Nhập dữ liệu' } as const;
const PAGE_SIZE = 50;

export default function TransactionsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: accounts = [] } = useAccounts();
  const { data: categories = [] } = useCategories();
  const qc = useQueryClient();

  // Bộ lọc lấy từ URL (để link từ Tổng quan / chia sẻ được)
  const filters: Filters = useMemo(() => {
    const f: Filters = {};
    for (const k of FILTER_KEYS) {
      const v = searchParams.get(k);
      if (v) f[k] = v;
    }
    return f;
  }, [searchParams]);
  const page = Math.max(1, Number(searchParams.get('page')) || 1);

  const { data, isFetching: loading, error } = useTransactions({ ...filters, page, pageSize: PAGE_SIZE });
  const [exporting, setExporting] = useState(false);
  const [search, setSearch] = useState(filters.q ?? '');
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [editing, setEditing] = useState<TransactionDTO | null>(null);
  const [creating, setCreating] = useState(false);
  const [ruleFor, setRuleFor] = useState<TransactionDTO | null>(null);
  const [deleting, setDeleting] = useState<TransactionDTO | null>(null);
  const [bulkCategory, setBulkCategory] = useState<number | null>(null);

  const setFilters = useCallback(
    (patch: Filters, keepPage = false) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v) next.set(k, v);
        else next.delete(k);
      }
      if (!keepPage) next.delete('page');
      router.replace(`/transactions${next.toString() ? `?${next}` : ''}`, { scroll: false });
    },
    [router, searchParams]
  );

  // Tìm kiếm: debounce 400ms
  useEffect(() => {
    if ((filters.q ?? '') === search) return;
    const t = setTimeout(() => setFilters({ q: search.trim() || undefined }), 400);
    return () => clearTimeout(t);
  }, [search, filters.q, setFilters]);

  useEffect(() => {
    if (error) toast.error(errorMessage(error));
  }, [error]);

  // Đổi bộ lọc / trang thì bỏ chọn
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- đồng bộ lựa chọn với danh sách đang xem
    setSelected(new Set());
  }, [filters, page]);

  const reload = () => invalidateFinanceData(qc);

  async function onExport() {
    setExporting(true);
    try {
      await exportTransactions(filters);
    } catch (e) {
      toast.error(errorMessage(e, 'Không tải được file Excel'));
    } finally {
      setExporting(false);
    }
  }

  async function changeCategory(t: TransactionDTO, categoryId: number | null) {
    try {
      await updateTransaction(t.id, { categoryId });
      toast.success('Đã đổi danh mục');
      reload();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  async function bulk(payload: { categoryId?: number | null; excludeFromStats?: boolean }) {
    try {
      const r = await bulkUpdateTransactions({ ids: [...selected], ...payload });
      toast.success(`Đã cập nhật ${r.updated} giao dịch${r.skipped ? ` (bỏ qua ${r.skipped} không khớp loại thu/chi)` : ''}`);
      setBulkCategory(null);
      reload();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  async function remove(t: TransactionDTO) {
    try {
      await deleteTransaction(t.id);
      toast.success('Đã xóa giao dịch');
      reload();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const allSelected = !!data?.items.length && data.items.every((t) => selected.has(t.id));
  const hasFilters = FILTER_KEYS.some((k) => k !== 'sort' && filters[k]);

  return (
    <div>
      <Header
        title="Giao dịch"
        subtitle={data ? `${data.total.toLocaleString('vi-VN')} giao dịch` : undefined}
        actions={
          <>
            <button
              type="button"
              className="btn-secondary !py-2 flex items-center gap-2 text-sm"
              onClick={onExport}
              disabled={exporting}
            >
              <Download className="w-4 h-4" /> Xuất Excel
            </button>
            <button type="button" className="btn-primary !py-2 flex items-center gap-2 text-sm" onClick={() => setCreating(true)}>
              <Plus className="w-4 h-4" /> Thêm
            </button>
          </>
        }
      />

      <div className="px-4 md:px-6 pb-8 space-y-3">
        {/* Bộ lọc: một hàng phía trên bảng */}
        <div className="glass-card p-3 flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
            <input
              className="input-field !py-2"
              style={{ paddingLeft: '2.25rem' }}
              placeholder="Tìm nội dung, ghi chú, mã tham chiếu…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Tìm kiếm"
            />
          </div>
          <input
            type="date"
            aria-label="Từ ngày"
            className="input-field !w-auto !py-2"
            value={filters.from ?? ''}
            onChange={(e) => setFilters({ from: e.target.value || undefined })}
          />
          <input
            type="date"
            aria-label="Đến ngày"
            className="input-field !w-auto !py-2"
            value={filters.to ?? ''}
            onChange={(e) => setFilters({ to: e.target.value || undefined })}
          />
          <select
            aria-label="Thu/chi"
            className="select-field !w-auto !py-2"
            value={filters.direction ?? ''}
            onChange={(e) => setFilters({ direction: e.target.value || undefined })}
          >
            <option value="">Thu & chi</option>
            <option value="OUT">Chỉ chi</option>
            <option value="IN">Chỉ thu</option>
          </select>
          <select
            aria-label="Danh mục"
            className="select-field !w-auto !py-2"
            value={filters.categoryId ?? ''}
            onChange={(e) => setFilters({ categoryId: e.target.value || undefined })}
          >
            <option value="">Mọi danh mục</option>
            <option value="none">— Chưa phân loại —</option>
            <optgroup label="Chi">
              {categories.filter((c) => c.kind === 'EXPENSE').map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </optgroup>
            <optgroup label="Thu">
              {categories.filter((c) => c.kind === 'INCOME').map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </optgroup>
          </select>
          <select
            aria-label="Tài khoản"
            className="select-field !w-auto !py-2"
            value={filters.accountId ?? ''}
            onChange={(e) => setFilters({ accountId: e.target.value || undefined })}
          >
            <option value="">Mọi tài khoản</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
          <select
            aria-label="Sắp xếp"
            className="select-field !w-auto !py-2"
            value={filters.sort ?? 'date_desc'}
            onChange={(e) => setFilters({ sort: e.target.value === 'date_desc' ? undefined : e.target.value })}
          >
            <option value="date_desc">Mới nhất</option>
            <option value="date_asc">Cũ nhất</option>
            <option value="amount_desc">Số tiền lớn nhất</option>
            <option value="amount_asc">Số tiền nhỏ nhất</option>
          </select>
          <select
            aria-label="Loại giao dịch"
            className="select-field !w-auto !py-2"
            value={filters.transfer === '1' ? 'transfer' : filters.excluded === '1' ? 'excluded' : ''}
            onChange={(e) =>
              setFilters({
                transfer: e.target.value === 'transfer' ? '1' : undefined,
                excluded: e.target.value === 'excluded' ? '1' : undefined,
              })
            }
          >
            <option value="">Mọi giao dịch</option>
            <option value="transfer">Chuyển khoản nội bộ</option>
            <option value="excluded">Đang loại khỏi thống kê</option>
          </select>
          {hasFilters && (
            <button
              type="button"
              className="btn-icon flex items-center gap-1 text-sm !px-2.5"
              onClick={() => {
                setSearch('');
                router.replace('/transactions');
              }}
            >
              <X className="w-4 h-4" /> Xóa lọc
            </button>
          )}
        </div>

        {/* Tổng theo bộ lọc */}
        {data && (
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm px-1">
            <span className="text-text-secondary">
              Tổng thu: <b className="text-[#1d4ed8] tabular">{formatVND(data.sumIn)}</b>
            </span>
            <span className="text-text-secondary">
              Tổng chi: <b className="text-text tabular">{formatVND(data.sumOut)}</b>
            </span>
            <span className="text-text-secondary">
              Chênh lệch: <b className="text-text tabular">{formatVND(data.sumIn - data.sumOut)}</b>
            </span>
          </div>
        )}

        {/* Thao tác hàng loạt */}
        {selected.size > 0 && (
          <div className="glass-card p-3 flex flex-wrap items-center gap-2 border-primary/30 animate-fadeIn">
            <span className="text-sm font-medium text-text">Đã chọn {selected.size}</span>
            <div className="w-56">
              <CategorySelect
                categories={categories}
                value={bulkCategory}
                onChange={setBulkCategory}
                placeholder="Chọn danh mục…"
                className="select-field !py-2"
              />
            </div>
            <button
              type="button"
              className="btn-primary !py-2 text-sm"
              disabled={!bulkCategory}
              onClick={() => bulk({ categoryId: bulkCategory })}
            >
              Gán danh mục
            </button>
            <button type="button" className="btn-secondary !py-2 text-sm" onClick={() => bulk({ categoryId: null })}>
              Bỏ phân loại
            </button>
            <button type="button" className="btn-secondary !py-2 text-sm" onClick={() => bulk({ excludeFromStats: true })}>
              Loại khỏi thống kê
            </button>
            <button type="button" className="btn-secondary !py-2 text-sm" onClick={() => bulk({ excludeFromStats: false })}>
              Tính lại vào thống kê
            </button>
            <button type="button" className="btn-icon ml-auto" onClick={() => setSelected(new Set())} aria-label="Bỏ chọn">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className={`glass-card overflow-hidden transition-opacity ${loading && data ? 'opacity-60' : ''}`}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[860px]">
              <thead className="table-header">
                <tr>
                  <th className="px-3 py-2.5 w-10">
                    <input
                      type="checkbox"
                      aria-label="Chọn tất cả"
                      checked={allSelected}
                      onChange={() =>
                        setSelected(allSelected ? new Set() : new Set(data?.items.map((t) => t.id) ?? []))
                      }
                    />
                  </th>
                  <th className="px-3 py-2.5 text-left">Thời gian</th>
                  <th className="px-3 py-2.5 text-left">Nội dung</th>
                  <th className="px-3 py-2.5 text-left w-56">Danh mục</th>
                  <th className="px-3 py-2.5 text-right">Số tiền</th>
                  <th className="px-3 py-2.5 text-right w-28">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {!data && (
                  <tr>
                    <td colSpan={6} className="px-3 py-10 text-center text-text-muted">
                      <RefreshCw className="w-4 h-4 animate-spin inline mr-2" /> Đang tải…
                    </td>
                  </tr>
                )}
                {data && data.items.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-10 text-center text-text-muted">
                      Không có giao dịch nào khớp bộ lọc
                    </td>
                  </tr>
                )}
                {data?.items.map((t) => (
                  <tr key={t.id} className={`table-row ${t.excludeFromStats ? 'opacity-60' : ''}`}>
                    <td className="px-3 py-2.5 text-center">
                      <input
                        type="checkbox"
                        aria-label="Chọn giao dịch"
                        checked={selected.has(t.id)}
                        onChange={() =>
                          setSelected((s) => {
                            const n = new Set(s);
                            if (n.has(t.id)) n.delete(t.id);
                            else n.add(t.id);
                            return n;
                          })
                        }
                      />
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-text-secondary tabular">
                      {formatVNDateTime(t.transactionDate)}
                    </td>
                    <td className="px-3 py-2.5 max-w-md">
                      <p className="text-text truncate" title={t.content}>
                        {t.content || '(không có nội dung)'}
                      </p>
                      <p className="text-xs text-text-muted truncate flex items-center gap-1.5">
                        <span>{t.account.name}</span>
                        <span>·</span>
                        <span>{SOURCE_LABEL[t.source]}</span>
                        {t.transferPair ? (
                          <span
                            className="inline-flex items-center gap-1 badge badge-muted !py-0"
                            title={`Chuyển khoản nội bộ với ${t.transferPair.account.name} lúc ${formatVNDateTime(t.transferPair.transactionDate)}`}
                          >
                            <ArrowLeftRight className="w-3 h-3" />
                            {t.direction === 'OUT' ? 'Sang' : 'Từ'} {t.transferPair.account.name}
                          </span>
                        ) : (
                          t.excludeFromStats && (
                            <span className="inline-flex items-center gap-0.5 badge badge-muted !py-0">
                              <EyeOff className="w-3 h-3" /> Loại khỏi TK
                            </span>
                          )
                        )}
                        {t.note && <span className="italic truncate">— {t.note}</span>}
                      </p>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <CategoryIcon icon={t.category?.icon} color={t.category?.color} size="sm" />
                        <CategorySelect
                          categories={categories}
                          value={t.categoryId}
                          direction={t.direction}
                          onChange={(id) => changeCategory(t, id)}
                          className="select-field !py-1.5 !text-xs"
                          ariaLabel={`Danh mục của giao dịch ${t.id}`}
                        />
                      </div>
                      {t.categorizedBy === 'RULE' && <p className="text-[10px] text-text-muted mt-0.5 ml-8">Tự động theo quy tắc</p>}
                    </td>
                    <td
                      className={`px-3 py-2.5 text-right font-semibold whitespace-nowrap tabular ${
                        t.direction === 'IN' ? 'text-[#1d4ed8]' : 'text-text'
                      }`}
                    >
                      {t.direction === 'IN' ? '+' : '−'}
                      {formatVND(t.amount)}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex justify-end gap-1">
                        <button type="button" className="btn-icon !p-1.5" title="Tạo quy tắc từ giao dịch này" aria-label="Tạo quy tắc" onClick={() => setRuleFor(t)}>
                          <Wand2 className="w-3.5 h-3.5" />
                        </button>
                        <button type="button" className="btn-icon !p-1.5" title="Chi tiết / sửa" aria-label="Sửa" onClick={() => setEditing(t)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        {t.source === 'MANUAL' && (
                          <button type="button" className="btn-icon !p-1.5 hover:!text-danger" title="Xóa" aria-label="Xóa" onClick={() => setDeleting(t)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {data && data.total > data.pageSize && (
            <div className="flex items-center justify-between gap-2 px-3 py-2.5 border-t border-slate-100 text-sm">
              <span className="text-text-muted">
                Trang {page}/{totalPages}
              </span>
              <div className="flex gap-1">
                <button
                  type="button"
                  className="btn-icon disabled:opacity-40"
                  disabled={page <= 1}
                  onClick={() => setFilters({ page: String(page - 1) } as Filters, true)}
                  aria-label="Trang trước"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  className="btn-icon disabled:opacity-40"
                  disabled={page >= totalPages}
                  onClick={() => setFilters({ page: String(page + 1) } as Filters, true)}
                  aria-label="Trang sau"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <TransactionFormModal
        isOpen={creating || !!editing}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        onSaved={() => reload()}
        accounts={accounts}
        categories={categories}
        transaction={editing}
      />
      <RuleFromTxnModal transaction={ruleFor} categories={categories} onClose={() => setRuleFor(null)} onDone={reload} />
      <ConfirmModal
        isOpen={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && remove(deleting)}
        title="Xóa giao dịch"
        message={`Xóa giao dịch nhập tay "${deleting?.content ?? ''}"? Không thể hoàn tác.`}
        confirmText="Xóa"
      />
    </div>
  );
}
