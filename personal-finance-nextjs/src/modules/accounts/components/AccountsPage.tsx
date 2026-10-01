'use client';

import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import Link from 'next/link';
import {
  ArrowLeftRight,
  Banknote,
  CircleAlert,
  CircleCheck,
  Landmark,
  Mail,
  Pencil,
  PenLine,
  Plus,
  RefreshCw,
  Trash2,
  Wallet,
  Layers,
} from 'lucide-react';
import Header from '@/components/layout/Header';
import Modal from '@/components/shared/Modal';
import ConfirmModal from '@/components/shared/ConfirmModal';
import EmailReceiptsCard from '@/modules/email/components/EmailReceiptsCard';
import { useEmailStatus } from '@/modules/email/lib';
import { useCategoryGroups } from '@/modules/categories/lib';
import type { CategoryGroupDTO } from '@/modules/categories/types';
import { groupsOfAccount } from '@/modules/categories/utils/groups';
import { errorMessage } from '@/lib/api-client';
import { invalidateFinanceData } from '@/lib/query-client';
import { scanTransfers, useTransferStatus } from '@/modules/transactions/lib';
import { formatVND } from '@/lib/money';
import { formatVNDateTime } from '@/lib/dates';
import { createAccount, deleteAccount, updateAccount, useAccounts } from '../lib';
import { bankBrand } from '../lib/brand';
import type { AccountDTO } from '../types';

const fmtNum = (n: number) => new Intl.NumberFormat('vi-VN').format(n);

function maskAccount(n: string | null) {
  if (!n) return '';
  return n.length > 4 ? `•••• ${n.slice(-4)}` : n;
}

function scopeLabel(t: AccountDTO['tracking']) {
  return t.in && t.out ? 'Vào & Ra' : t.out ? 'Chỉ tiền ra' : 'Chỉ tiền vào';
}

// Nhãn nguồn ghi nhận giao dịch: email ngân hàng nào, hay nhập tay
function TrackingBadge({ t }: { t: AccountDTO['tracking'] }) {
  if (t.method === 'EMAIL') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-[11px] font-semibold">
        <Mail className="w-3 h-3" aria-hidden /> {t.label} · {scopeLabel(t)}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-600 text-[11px] font-semibold">
      <PenLine className="w-3 h-3" aria-hidden /> Nhập tay
    </span>
  );
}

// Avatar thương hiệu: ngân hàng = chữ viết tắt + màu nhận diện, tiền mặt = icon ví
function AccountAvatar({ a }: { a: AccountDTO }) {
  if (a.type === 'CASH') {
    return (
      <span className="w-12 h-12 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
        <Wallet className="w-6 h-6" aria-hidden />
      </span>
    );
  }
  const b = bankBrand(a.bankName);
  return (
    <span
      className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-[13px] font-bold tracking-tight"
      style={{ backgroundColor: `${b.color}14`, color: b.color }}
      aria-hidden
    >
      {b.short}
    </span>
  );
}

function Kpi({
  label,
  icon: Icon,
  iconClass,
  children,
}: {
  label: string;
  icon: typeof Wallet;
  iconClass: string;
  children: React.ReactNode;
}) {
  return (
    <div className="fin-card p-4 flex flex-col justify-between gap-2 min-w-0">
      <div className="flex items-center justify-between">
        <span className="fin-label">{label}</span>
        <span className={`w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center ${iconClass}`}>
          <Icon className="w-4 h-4" aria-hidden />
        </span>
      </div>
      {children}
    </div>
  );
}

function Amount({ value, className = 'text-slate-900' }: { value: number; className?: string }) {
  return (
    <p className={`text-[28px] leading-9 font-bold tracking-[-0.02em] fin-num truncate ${className}`} title={formatVND(value)}>
      {value < 0 ? '−' : ''}
      {fmtNum(Math.abs(value))} <span className="text-base font-semibold text-slate-500">₫</span>
    </p>
  );
}

export default function AccountsPage() {
  const qc = useQueryClient();
  const { data: accounts, isLoading } = useAccounts();
  const { data: transfers } = useTransferStatus();
  const { data: email } = useEmailStatus();
  const { data: groups = [] } = useCategoryGroups();
  const [editing, setEditing] = useState<AccountDTO | 'new' | null>(null);
  const [deleting, setDeleting] = useState<AccountDTO | null>(null);
  const [scanning, setScanning] = useState(false);

  const reload = () => invalidateFinanceData(qc);

  const list = useMemo(() => accounts ?? [], [accounts]);
  const summary = useMemo(() => {
    const active = list.filter((a) => a.isActive);
    const banks = active.filter((a) => a.type === 'BANK');
    const cash = active.filter((a) => a.type === 'CASH');
    const sum = (xs: AccountDTO[]) => xs.reduce((s, a) => s + a.balance, 0);
    const bankShorts = Array.from(new Set(banks.map((a) => bankBrand(a.bankName).short)));
    return {
      total: sum(active),
      bank: sum(banks),
      cash: sum(cash),
      activeCount: active.length,
      hiddenCount: list.length - active.length,
      bankCount: banks.length,
      cashCount: cash.length,
      bankShorts,
      cashManual: cash.every((a) => a.tracking.method === 'MANUAL'),
      incomplete: active.filter((a) => a.balanceSource !== 'BANK' && !(a.tracking.in && a.tracking.out)).length,
    };
  }, [list]);

  // Trạng thái đọc email: chưa cấu hình / lỗi lần đọc gần nhất / bình thường
  const sync = !email
    ? { tone: 'muted' as const, label: 'Đang kiểm tra…', detail: '' }
    : !email.configured
      ? { tone: 'warn' as const, label: 'Chưa cấu hình', detail: 'Chưa có IMAP_USER / IMAP_PASSWORD trong .env' }
      : email.lastRun?.error
        ? { tone: 'bad' as const, label: 'Có lỗi', detail: email.lastRun.error }
        : {
            tone: 'good' as const,
            label: 'Bình thường',
            detail: `${email.providers.length} mẫu email${
              email.lastRun ? ` • đọc lúc ${formatVNDateTime(email.lastRun.at)}` : ' • chưa đọc lần nào'
            }`,
          };

  async function scan() {
    setScanning(true);
    try {
      const r = await scanTransfers();
      reload();
      toast.success(r.paired ? `Ghép thêm ${r.paired} cặp chuyển khoản nội bộ` : 'Không tìm thấy cặp mới');
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setScanning(false);
    }
  }

  async function remove(a: AccountDTO) {
    try {
      await deleteAccount(a.id);
      toast.success('Đã xóa tài khoản');
      reload();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  return (
    <div className="font-jakarta">
      <Header
        title="Tài khoản & Thẻ ngân hàng"
        subtitle="Quản lý nguồn tiền, tự động ghi nhận giao dịch từ email thông báo và khử trùng lặp chuyển khoản nội bộ"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className="fin-btn fin-btn-outline" onClick={reload}>
              <RefreshCw className="w-4 h-4 text-slate-400" aria-hidden /> <span className="hidden sm:inline">Làm mới số dư</span>
            </button>
            <button type="button" className="fin-btn fin-btn-primary" onClick={() => setEditing('new')}>
              <Plus className="w-4 h-4" aria-hidden /> Thêm tài khoản / Ví
            </button>
          </div>
        }
      />

      <div className="px-4 md:px-6 pb-8 flex flex-col gap-4 md:gap-6">
        {/* 4 KPI */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="fin-card h-32 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <Kpi label="Tổng số dư khả dụng" icon={Wallet} iconClass="text-teal-700">
              <Amount value={summary.total} />
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-700" aria-hidden /> {summary.activeCount} tài khoản đang theo dõi
                </span>
                {summary.hiddenCount > 0 && <span className="text-slate-500">{summary.hiddenCount} đã ẩn</span>}
              </div>
            </Kpi>

            <Kpi label="Tài khoản ngân hàng" icon={Landmark} iconClass="text-teal-700">
              <Amount value={summary.bank} />
              <div className="flex items-center justify-between gap-2 text-xs text-slate-600">
                <span>{summary.bankCount} nguồn liên kết</span>
                <span className="font-semibold text-teal-700 truncate" title={summary.bankShorts.join(', ')}>
                  {summary.bankShorts.length ? summary.bankShorts.join(', ') : 'Chưa có'}
                </span>
              </div>
            </Kpi>

            <Kpi label="Tiền mặt & Ví" icon={Banknote} iconClass="text-slate-500">
              <Amount value={summary.cash} />
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span>{summary.cashCount ? `${summary.cashCount} ví tiền mặt` : 'Chưa có ví tiền mặt'}</span>
                {summary.cashCount > 0 && summary.cashManual && (
                  <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-semibold">Nhập tay</span>
                )}
              </div>
            </Kpi>

            <Kpi label="Đồng bộ email" icon={Mail} iconClass="text-teal-700">
              <div className="flex items-baseline gap-2 min-w-0">
                <span
                  className={`text-xl leading-7 font-bold tracking-tight ${
                    sync.tone === 'good'
                      ? 'text-emerald-700'
                      : sync.tone === 'warn'
                        ? 'text-amber-700'
                        : sync.tone === 'bad'
                          ? 'text-rose-600'
                          : 'text-slate-500'
                  }`}
                >
                  {sync.label}
                </span>
                {email?.configured && (
                  <span className="text-xs font-medium text-slate-500 truncate">
                    {email.pollMinutes > 0 ? `mỗi ${email.pollMinutes} phút` : 'tắt tự đọc'}
                  </span>
                )}
              </div>
              <p className="flex items-center gap-1.5 text-xs text-slate-600 min-w-0">
                {sync.tone === 'good' ? (
                  <CircleCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" aria-hidden />
                ) : sync.tone === 'muted' ? null : (
                  <CircleAlert className="w-3.5 h-3.5 text-amber-600 shrink-0" aria-hidden />
                )}
                <span className="truncate" title={sync.detail}>
                  {sync.detail}
                </span>
              </p>
            </Kpi>
          </div>
        )}

        {/* Danh sách tài khoản */}
        <section className="fin-card overflow-hidden">
          <div className="p-4 md:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100">
            <div>
              <h2 className="text-[16px] leading-6 font-semibold text-slate-900">Danh sách tài khoản</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Tài khoản Vietcombank / Cake / ACB tự tạo khi đọc được email đầu tiên. Nên thêm trước các tài khoản khác của bạn để
                chuyển khoản giữa chúng được nhận diện là chuyển nội bộ.
              </p>
            </div>
            <span className="self-start sm:self-auto px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-[11px] font-semibold whitespace-nowrap fin-num">
              {summary.activeCount} tài khoản khả dụng
            </span>
          </div>

          <ul className="divide-y divide-slate-100">
            {list.map((a) => (
              <li
                key={a.id}
                className={`flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 hover:bg-slate-50/70 transition-colors ${
                  a.isActive ? '' : 'opacity-50'
                }`}
              >
                <div className="flex items-center gap-4 min-w-0">
                  <AccountAvatar a={a} />
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[15px] font-semibold text-slate-900">{a.name}</span>
                      {a.accountNumber && !a.name.includes(a.accountNumber.slice(-4)) && (
                        <span className="text-xs font-semibold text-slate-500 tracking-wider fin-num">{maskAccount(a.accountNumber)}</span>
                      )}
                      <TrackingBadge t={a.tracking} />
                      {!a.isActive && (
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-500 text-[11px] font-semibold">
                          Đã ẩn
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap mt-1 text-xs text-slate-500 fin-num">
                      <span>{a.type === 'CASH' ? 'Tiền mặt' : a.bankName || 'Tài khoản ngân hàng'}</span>
                      <span aria-hidden>•</span>
                      <span>{a.transactionCount} giao dịch</span>
                      {groupsOfAccount(a.groupIds, groups).map((g) => (
                        <span
                          key={g.id}
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] font-semibold"
                          style={{ backgroundColor: `${g.color}14`, color: g.color }}
                          title={`Nhóm ${g.kind === 'EXPENSE' ? 'chi tiêu' : 'thu nhập'} thường dùng`}
                        >
                          <Layers className="w-3 h-3" aria-hidden /> {g.name}
                        </span>
                      ))}
                      {a.balanceSource === 'BANK' && (
                        <>
                          <span aria-hidden>•</span>
                          <span className="inline-flex items-center gap-1 text-emerald-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" aria-hidden /> Khớp số dư ngân hàng báo
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-4 md:gap-6 pl-16 md:pl-0">
                  <div className="flex flex-col text-left md:text-right min-w-0">
                    <span className="text-[16px] font-bold text-slate-900 tracking-tight fin-num">{formatVND(a.balance)}</span>
                    {a.balanceSource === 'BANK' ? (
                      <span
                        className="fin-label normal-case tracking-normal font-medium"
                        title="Số dư trong email ngân hàng gần nhất, cộng các giao dịch phát sinh sau đó"
                      >
                        Ngân hàng báo {a.bankBalanceAt ? formatVNDateTime(a.bankBalanceAt) : ''}
                      </span>
                    ) : a.tracking.in && a.tracking.out ? (
                      <span className="fin-label normal-case tracking-normal font-medium">Số dư đầu + thu − chi</span>
                    ) : (
                      <span
                        className="inline-flex items-center gap-1 md:justify-end text-[11px] font-semibold text-amber-700"
                        title="Email chỉ báo một chiều nên số dư không phản ánh số dư thật. Nhập tay khoản thu hoặc chỉnh số dư đầu kỳ."
                      >
                        <CircleAlert className="w-3 h-3" aria-hidden /> Chưa đủ tiền vào
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-slate-500">
                    <button
                      type="button"
                      className="p-2 rounded-lg hover:bg-slate-100 hover:text-slate-900 transition-colors"
                      title="Chỉnh sửa"
                      aria-label={`Sửa ${a.name}`}
                      onClick={() => setEditing(a)}
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    {a.transactionCount === 0 && (
                      <button
                        type="button"
                        className="p-2 rounded-lg hover:bg-rose-50 hover:text-rose-600 transition-colors"
                        title="Xóa"
                        aria-label={`Xóa ${a.name}`}
                        onClick={() => setDeleting(a)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </li>
            ))}
            {!isLoading && list.length === 0 && (
              <li className="px-4 py-10 text-center text-sm text-slate-500">
                Chưa có tài khoản nào.{' '}
                <button type="button" className="text-teal-700 font-semibold hover:underline" onClick={() => setEditing('new')}>
                  Thêm tài khoản / Ví
                </button>
              </li>
            )}
          </ul>
        </section>

        <EmailReceiptsCard onImported={reload} />

        {/* Chuyển khoản nội bộ */}
        <section className="fin-card p-4 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6">
          <div className="flex items-start gap-4 max-w-3xl">
            <span className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
              <ArrowLeftRight className="w-6 h-6" aria-hidden />
            </span>
            <div className="flex flex-col gap-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-[16px] leading-6 font-semibold text-slate-900">Tự nhận diện & Khử trùng lặp chuyển khoản nội bộ</h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-semibold">
                  Luôn bật
                </span>
              </div>
              <p className="text-xs text-slate-600">
                Một khoản <b className="text-slate-900">RA</b> và một khoản <b className="text-slate-900">VÀO</b> cùng số tiền, ở hai tài
                khoản khác nhau, cách nhau tối đa {transfers?.windowMinutes ?? 15} phút được ghép cặp và loại khỏi báo cáo thu / chi.
                Email chuyển tiền có người nhận trùng tên bạn, hoặc tới một tài khoản đã có ở trên, cũng được loại khỏi thống kê.
              </p>
              {transfers && (
                <Link href="/transactions?transfer=1" className="text-xs font-semibold text-teal-700 hover:underline fin-num">
                  Đang có {transfers.pairs} cặp — xem danh sách
                </Link>
              )}
            </div>
          </div>
          <button type="button" className="fin-btn fin-btn-outline self-end md:self-auto shrink-0" disabled={scanning} onClick={scan}>
            <RefreshCw className={`w-4 h-4 text-slate-400 ${scanning ? 'animate-spin' : ''}`} aria-hidden />
            {scanning ? 'Đang quét…' : 'Quét lại toàn bộ giao dịch'}
          </button>
        </section>
      </div>

      {editing && <AccountModal account={editing === 'new' ? null : editing} groups={groups} onClose={() => setEditing(null)} onSaved={reload} />}
      <ConfirmModal
        isOpen={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && remove(deleting)}
        title="Xóa tài khoản"
        message={`Xóa "${deleting?.name}"?`}
        confirmText="Xóa"
      />
    </div>
  );
}

function AccountModal({
  account,
  groups,
  onClose,
  onSaved,
}: {
  account: AccountDTO | null;
  groups: CategoryGroupDTO[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [type, setType] = useState<'CASH' | 'BANK'>(account?.type ?? 'CASH');
  const [name, setName] = useState(account?.name ?? 'Tiền mặt');
  const [bankName, setBankName] = useState(account?.bankName ?? '');
  const [accountNumber, setAccountNumber] = useState(account?.accountNumber ?? '');
  const [opening, setOpening] = useState(String(account?.openingBalance ?? 0));
  const [isActive, setIsActive] = useState(account?.isActive ?? true);
  const [groupIds, setGroupIds] = useState<number[]>(account?.groupIds ?? []);
  const [saving, setSaving] = useState(false);

  const toggleGroup = (id: number) => setGroupIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const base = { name, openingBalance: Number(opening.replace(/[^\d-]/g, '')) || 0, isActive, groupIds };
      if (account) {
        await updateAccount(account.id, { ...base, ...(account.type === 'BANK' ? { bankName: bankName || null } : {}) });
      } else {
        await createAccount({
          ...base,
          type,
          ...(type === 'BANK' ? { bankName: bankName || null, accountNumber: accountNumber.replace(/\s/g, '') || null } : {}),
        });
      }
      toast.success('Đã lưu');
      onSaved();
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const isBank = (account?.type ?? type) === 'BANK';

  return (
    <Modal isOpen onClose={onClose} title={account ? 'Sửa tài khoản' : 'Thêm tài khoản / Ví'} size="sm">
      <form onSubmit={submit} className="space-y-4 font-jakarta">
        {!account && (
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ['CASH', 'Ví tiền mặt', Wallet],
                ['BANK', 'Tài khoản ngân hàng', Landmark],
              ] as const
            ).map(([k, label, Icon]) => (
              <button
                key={k}
                type="button"
                aria-pressed={type === k}
                onClick={() => {
                  setType(k);
                  if (k === 'CASH' && !name) setName('Tiền mặt');
                  if (k === 'BANK' && name === 'Tiền mặt') setName('');
                }}
                className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors ${
                  type === k ? 'border-teal-700 bg-teal-50 text-teal-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Icon className="w-4 h-4" aria-hidden /> {label}
              </button>
            ))}
          </div>
        )}
        <label className="block">
          <span className="block text-xs font-medium text-slate-600 mb-1">Tên hiển thị</span>
          <input
            className="input-field"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={isBank ? 'VD: VietinBank lương' : 'Tiền mặt'}
            autoFocus
          />
        </label>
        {isBank && (
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="block text-xs font-medium text-slate-600 mb-1">Ngân hàng</span>
              <input className="input-field" value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="VietinBank" />
            </label>
            <label className="block">
              <span className="block text-xs font-medium text-slate-600 mb-1">Số tài khoản</span>
              <input
                inputMode="numeric"
                className="input-field fin-num"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                disabled={!!account}
                placeholder="Dùng để nhận diện chuyển nội bộ"
              />
            </label>
          </div>
        )}
        <label className="block">
          <span className="block text-xs font-medium text-slate-600 mb-1">Số dư đầu kỳ (₫)</span>
          <input inputMode="numeric" className="input-field fin-num" value={opening} onChange={(e) => setOpening(e.target.value)} />
          <span className="block text-xs text-slate-500 mt-1">Số dư hiện tại = số dư đầu kỳ + tổng thu − tổng chi của tài khoản.</span>
        </label>
        {groups.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <span className="block text-xs font-medium text-slate-600">Nhóm chi tiêu / thu nhập thường dùng</span>
            <div className="flex flex-wrap gap-1.5">
              {groups.map((g) => {
                const on = groupIds.includes(g.id);
                return (
                  <button
                    key={g.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleGroup(g.id)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold transition-colors ${
                      on ? 'border-transparent text-white' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                    style={on ? { backgroundColor: g.color } : undefined}
                  >
                    <Layers className="w-3 h-3" aria-hidden /> {g.name}
                    <span className={`text-[10px] font-bold ${on ? 'opacity-80' : 'text-slate-400'}`}>{g.kind === 'EXPENSE' ? 'CHI' : 'THU'}</span>
                  </button>
                );
              })}
            </div>
            <span className="block text-xs text-slate-500">
              Danh mục trong nhóm được gợi ý lên đầu khi chọn tay. Tài khoản chỉ có một nhóm chi (hoặc thu) thì giao dịch không khớp quy tắc được gán vào danh mục mặc định của nhóm.
            </span>
          </div>
        )}
        {account && (
          <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            Hiển thị (bỏ chọn để ẩn khỏi tổng số dư)
          </label>
        )}
        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose} className="fin-btn fin-btn-outline flex-1 justify-center">
            Hủy
          </button>
          <button type="submit" disabled={saving} className="fin-btn fin-btn-primary flex-1 justify-center">
            {saving ? 'Đang lưu…' : 'Lưu'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
