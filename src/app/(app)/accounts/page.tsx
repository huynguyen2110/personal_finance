'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { ArrowLeftRight, CircleAlert, Landmark, Mail, Pencil, PenLine, Plus, RefreshCw, Trash2, Wallet } from 'lucide-react';
import Header from '@/components/layout/Header';
import Modal from '@/components/shared/Modal';
import ConfirmModal from '@/components/shared/ConfirmModal';
import EmailReceiptsCard from '@/components/accounts/EmailReceiptsCard';
import { useAccounts } from '@/hooks/useMeta';
import { api } from '@/lib/client';
import { formatVND } from '@/lib/money';
import { formatVNDateTime } from '@/lib/dates';
import type { AccountDTO } from '@/lib/types';

function maskAccount(n: string | null) {
  if (!n) return '';
  return n.length > 4 ? `••••${n.slice(-4)}` : n;
}

function TrackingBadge({ t }: { t: AccountDTO['tracking'] }) {
  const Icon = t.method === 'EMAIL' ? Mail : PenLine;
  const scope = t.in && t.out ? 'tiền vào & ra' : t.out ? 'chỉ tiền ra' : 'chỉ tiền vào';
  return (
    <span className="badge badge-muted inline-flex items-center gap-1 !py-0">
      <Icon className="w-3 h-3" aria-hidden />
      {t.label}
      {t.method === 'EMAIL' && <span className="text-text-muted">· {scope}</span>}
    </span>
  );
}

export default function AccountsPage() {
  const { accounts, reload } = useAccounts();
  const [editing, setEditing] = useState<AccountDTO | 'new' | null>(null);
  const [deleting, setDeleting] = useState<AccountDTO | null>(null);
  const [transfers, setTransfers] = useState<{ pairs: number; windowMinutes: number } | null>(null);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    api<{ pairs: number; windowMinutes: number }>('/api/transfers/scan').then(setTransfers).catch(() => {});
  }, []);

  async function scan() {
    setScanning(true);
    try {
      const r = await api<{ paired: number; pairs: number }>('/api/transfers/scan', { method: 'POST' });
      setTransfers((t) => (t ? { ...t, pairs: r.pairs } : t));
      toast.success(r.paired ? `Ghép thêm ${r.paired} cặp chuyển khoản nội bộ` : 'Không tìm thấy cặp mới');
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setScanning(false);
    }
  }

  async function remove(a: AccountDTO) {
    try {
      await api(`/api/accounts/${a.id}`, { method: 'DELETE' });
      toast.success('Đã xóa tài khoản');
      reload();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <div>
      <Header title="Tài khoản" subtitle="Mỗi ngân hàng một cách ghi nhận giao dịch: email thông báo, hoặc nhập tay" />
      <div className="px-4 md:px-6 pb-8 space-y-4">
        {/* Danh sách tài khoản */}
        <section className="glass-card overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 p-4 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-semibold text-text">Tài khoản</h2>
              <p className="text-xs text-text-muted">
                Tài khoản Vietcombank / Cake / ACB tự tạo khi đọc được email đầu tiên. Nên thêm trước các tài khoản khác của bạn
                (VD VietinBank) để chuyển khoản giữa các tài khoản được nhận diện là chuyển nội bộ.
              </p>
            </div>
            <button type="button" className="btn-secondary !py-2 text-sm flex items-center gap-1.5" onClick={() => setEditing('new')}>
              <Plus className="w-4 h-4" /> Thêm tài khoản / ví
            </button>
          </div>
          <ul className="divide-y divide-slate-100">
            {accounts.map((a) => (
              <li key={a.id} className={`flex flex-wrap items-center gap-3 px-4 py-3 ${a.isActive ? '' : 'opacity-50'}`}>
                <span className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-text-secondary">
                  {a.type === 'CASH' ? <Wallet className="w-5 h-5" /> : <Landmark className="w-5 h-5" />}
                </span>
                <div className="flex-1 min-w-48">
                  <p className="text-sm font-medium text-text">
                    {a.name} {!a.isActive && <span className="badge badge-muted ml-1">Đã ẩn</span>}
                  </p>
                  <p className="text-xs text-text-muted flex flex-wrap items-center gap-x-1.5 gap-y-1 mt-0.5">
                    <span>
                      {a.type === 'CASH' ? 'Tiền mặt' : [a.bankName, maskAccount(a.accountNumber)].filter(Boolean).join(' · ')}
                    </span>
                    <span>·</span>
                    <span>{a.transactionCount} giao dịch</span>
                    <TrackingBadge t={a.tracking} />
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-text tabular">{formatVND(a.balance)}</p>
                  {a.balanceSource === 'BANK' ? (
                    <p className="text-[11px] text-text-muted" title="Số dư trong email ngân hàng gần nhất, cộng các giao dịch phát sinh sau đó">
                      Ngân hàng báo {a.bankBalanceAt ? formatVNDateTime(a.bankBalanceAt) : ''}
                    </p>
                  ) : a.tracking.in && a.tracking.out ? (
                    <p className="text-[11px] text-text-muted">Số dư đầu + thu − chi</p>
                  ) : (
                    <p className="text-[11px] text-warning inline-flex items-center gap-1" title="Email chỉ báo một chiều nên số dư không phản ánh số dư thật. Nhập tay khoản thu hoặc chỉnh số dư đầu kỳ.">
                      <CircleAlert className="w-3 h-3" aria-hidden /> Chưa đủ tiền vào
                    </p>
                  )}
                </div>
                <div className="flex gap-1">
                  <button type="button" className="btn-icon !p-1.5" aria-label={`Sửa ${a.name}`} onClick={() => setEditing(a)}>
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  {a.transactionCount === 0 && (
                    <button type="button" className="btn-icon !p-1.5 hover:!text-danger" aria-label={`Xóa ${a.name}`} onClick={() => setDeleting(a)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </li>
            ))}
            {accounts.length === 0 && <li className="px-4 py-8 text-center text-sm text-text-muted">Chưa có tài khoản</li>}
          </ul>
        </section>

        <EmailReceiptsCard onImported={reload} />

        {/* Chuyển khoản nội bộ */}
        <section className="glass-card p-4 md:p-5 flex flex-wrap items-center gap-4">
          <span className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-text-secondary flex-shrink-0">
            <ArrowLeftRight className="w-5 h-5" />
          </span>
          <div className="flex-1 min-w-64">
            <h2 className="text-sm font-semibold text-text">Tự nhận diện chuyển khoản nội bộ</h2>
            <p className="text-xs text-text-muted mt-0.5">
              Một khoản <b>ra</b> và một khoản <b>vào</b> cùng số tiền, ở hai tài khoản khác nhau, cách nhau tối đa{' '}
              {transfers?.windowMinutes ?? 15} phút được ghép cặp và loại khỏi thống kê. Email chuyển tiền có người nhận trùng
              tên bạn, hoặc tới một tài khoản đã có ở trên, cũng được loại khỏi thống kê.
            </p>
            {transfers && (
              <Link href="/transactions?transfer=1" className="text-xs text-primary hover:underline mt-1 inline-block">
                Đang có {transfers.pairs} cặp — xem danh sách
              </Link>
            )}
          </div>
          <button
            type="button"
            className="btn-secondary !py-2 text-sm flex items-center gap-2 disabled:opacity-60"
            disabled={scanning}
            onClick={scan}
          >
            <RefreshCw className={`w-4 h-4 ${scanning ? 'animate-spin' : ''}`} />
            {scanning ? 'Đang quét…' : 'Quét lại toàn bộ giao dịch'}
          </button>
        </section>
      </div>

      {editing && <AccountModal account={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={reload} />}
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

function AccountModal({ account, onClose, onSaved }: { account: AccountDTO | null; onClose: () => void; onSaved: () => void }) {
  const [type, setType] = useState<'CASH' | 'BANK'>(account?.type ?? 'CASH');
  const [name, setName] = useState(account?.name ?? 'Tiền mặt');
  const [bankName, setBankName] = useState(account?.bankName ?? '');
  const [accountNumber, setAccountNumber] = useState(account?.accountNumber ?? '');
  const [opening, setOpening] = useState(String(account?.openingBalance ?? 0));
  const [isActive, setIsActive] = useState(account?.isActive ?? true);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const base = { name, openingBalance: Number(opening.replace(/[^\d-]/g, '')) || 0, isActive };
      if (account) {
        await api(`/api/accounts/${account.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ ...base, ...(account.type === 'BANK' ? { bankName: bankName || null } : {}) }),
        });
      } else {
        await api('/api/accounts', {
          method: 'POST',
          body: JSON.stringify({
            ...base,
            type,
            ...(type === 'BANK' ? { bankName: bankName || null, accountNumber: accountNumber.replace(/\s/g, '') || null } : {}),
          }),
        });
      }
      toast.success('Đã lưu');
      onSaved();
      onClose();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const isBank = (account?.type ?? type) === 'BANK';

  return (
    <Modal isOpen onClose={onClose} title={account ? 'Sửa tài khoản' : 'Thêm tài khoản / ví'} size="sm">
      <form onSubmit={submit} className="space-y-4">
        {!account && (
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ['CASH', 'Ví tiền mặt'],
                ['BANK', 'Tài khoản ngân hàng'],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                type="button"
                aria-pressed={type === k}
                onClick={() => {
                  setType(k);
                  if (k === 'CASH' && !name) setName('Tiền mặt');
                  if (k === 'BANK' && name === 'Tiền mặt') setName('');
                }}
                className={`rounded-xl border px-3 py-2 text-sm font-medium ${
                  type === k ? 'border-primary bg-primary/10 text-primary' : 'border-slate-200 text-text-secondary hover:bg-slate-50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}
        <label className="block">
          <span className="block text-xs font-medium text-text-secondary mb-1">Tên hiển thị</span>
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
              <span className="block text-xs font-medium text-text-secondary mb-1">Ngân hàng</span>
              <input className="input-field" value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="VietinBank" />
            </label>
            <label className="block">
              <span className="block text-xs font-medium text-text-secondary mb-1">Số tài khoản</span>
              <input
                inputMode="numeric"
                className="input-field tabular"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                disabled={!!account}
                placeholder="Dùng để nhận diện chuyển nội bộ"
              />
            </label>
          </div>
        )}
        <label className="block">
          <span className="block text-xs font-medium text-text-secondary mb-1">Số dư đầu kỳ (₫)</span>
          <input inputMode="numeric" className="input-field tabular" value={opening} onChange={(e) => setOpening(e.target.value)} />
          <span className="block text-xs text-text-muted mt-1">
            Số dư hiện tại = số dư đầu kỳ + tổng thu − tổng chi của tài khoản.
          </span>
        </label>
        {account && (
          <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            Hiển thị (bỏ chọn để ẩn khỏi tổng số dư)
          </label>
        )}
        <div className="flex gap-3">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Hủy</button>
          <button type="submit" disabled={saving} className="btn-primary flex-1 disabled:opacity-60">{saving ? 'Đang lưu…' : 'Lưu'}</button>
        </div>
      </form>
    </Modal>
  );
}
