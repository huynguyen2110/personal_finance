'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { ArrowLeftRight } from 'lucide-react';
import Modal from '@/components/shared/Modal';
import CategorySelect from '@/components/shared/CategorySelect';
import DatePicker from '@/components/shared/DatePicker';
import TimePicker from '@/components/shared/TimePicker';
import AccountSelect from '@/components/shared/AccountSelect';
import { errorMessage } from '@/lib/api-client';
import { formatVND } from '@/lib/money';
import { formatVNDateTime, toVNDateString, vnParts } from '@/lib/dates';
import type { Direction } from '@/types/common';
import type { AccountDTO } from '@/modules/accounts/types';
import type { CategoryDTO } from '@/modules/categories/types';
import { suggestionFor } from '@/modules/categories/utils/groups';
import { createTransaction, unpairTransaction, updateTransaction } from '../lib';
import type { TransactionDTO, TransactionInput } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (t: TransactionDTO) => void;
  accounts: AccountDTO[];
  categories: CategoryDTO[];
  // Có: sửa giao dịch; không: thêm giao dịch nhập tay
  transaction?: TransactionDTO | null;
}

function nowLocalParts(d = new Date()) {
  const p = vnParts(d);
  return { date: toVNDateString(d), time: `${String(p.hour).padStart(2, '0')}:${String(p.minute).padStart(2, '0')}` };
}

export default function TransactionFormModal(props: Props) {
  // Remount khi mở để reset form theo giao dịch đang sửa
  if (!props.isOpen) return null;
  return <Inner key={props.transaction?.id ?? 'new'} {...props} />;
}

function Inner({ isOpen, onClose, onSaved, accounts, categories, transaction }: Props) {
  const editing = !!transaction;
  const manual = !transaction || transaction.source === 'MANUAL';
  const init = transaction ? nowLocalParts(new Date(transaction.transactionDate)) : nowLocalParts();
  const defaultAccount = accounts.find((a) => a.type === 'CASH') ?? accounts[0];

  const [accountId, setAccountId] = useState<number | null>(transaction?.accountId ?? defaultAccount?.id ?? null);
  const [direction, setDirection] = useState<Direction>(transaction?.direction ?? 'OUT');
  const [amount, setAmount] = useState(transaction ? String(transaction.amount) : '');
  const [content, setContent] = useState(transaction?.content ?? '');
  const [date, setDate] = useState(init.date);
  const [time, setTime] = useState(init.time);
  const [categoryId, setCategoryId] = useState<number | null>(transaction?.categoryId ?? null);
  const [note, setNote] = useState(transaction?.note ?? '');
  const [exclude, setExclude] = useState(transaction?.excludeFromStats ?? false);
  const [saving, setSaving] = useState(false);

  const amountNum = Number(amount.replace(/[^\d]/g, ''));
  // Danh mục thuộc nhóm của tài khoản đang chọn được đưa lên đầu ô chọn
  const suggested = suggestionFor(accounts.find((a) => a.id === accountId), categories);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const payload: TransactionInput = {
      categoryId,
      note: note.trim() || null,
      // Cặp chuyển nội bộ tự quản lý cờ này (gỡ bằng nút "Không phải chuyển nội bộ")
      ...(transaction?.transferPair ? {} : { excludeFromStats: exclude }),
    };
    if (manual) {
      if (!accountId) return toast.error('Chọn tài khoản');
      if (!amountNum) return toast.error('Nhập số tiền');
      if (!content.trim()) return toast.error('Nhập nội dung');
      Object.assign(payload, {
        accountId,
        direction,
        amount: amountNum,
        content: content.trim(),
        transactionDate: `${date}T${time}:00+07:00`,
      });
    }
    setSaving(true);
    try {
      const saved = editing
        ? await updateTransaction(transaction!.id, payload)
        : await createTransaction(payload);
      toast.success(editing ? 'Đã lưu giao dịch' : 'Đã thêm giao dịch');
      onSaved(saved);
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function unpair() {
    if (!transaction) return;
    setSaving(true);
    try {
      const saved = await unpairTransaction(transaction.id);
      toast.success('Đã gỡ cặp, hai giao dịch được tính lại vào thống kê');
      onSaved(saved);
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editing ? 'Chi tiết giao dịch' : 'Thêm giao dịch (nhập tay)'} size="md">
      <form onSubmit={submit} className="space-y-4">
        {!manual && transaction && (
          <div className="rounded-xl bg-surface-light px-4 py-3 text-sm space-y-1">
            <div className="flex justify-between gap-3">
              <span className="text-text-secondary">Số tiền</span>
              <span className={`font-semibold tabular ${transaction.direction === 'IN' ? 'text-[#005c55]' : 'text-text'}`}>
                {transaction.direction === 'IN' ? '+' : '−'}
                {formatVND(transaction.amount)}
              </span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-text-secondary">Thời gian</span>
              <span className="text-text">{formatVNDateTime(transaction.transactionDate)}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-text-secondary">Tài khoản</span>
              <span className="text-text">{transaction.account.name}</span>
            </div>
            {transaction.referenceCode && (
              <div className="flex justify-between gap-3">
                <span className="text-text-secondary">Mã tham chiếu</span>
                <span className="text-text tabular">{transaction.referenceCode}</span>
              </div>
            )}
            <p className="pt-1 text-text break-words">{transaction.content}</p>
          </div>
        )}

        {manual && (
          <>
            <div className="grid grid-cols-2 gap-2">
              {(['OUT', 'IN'] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => {
                    setDirection(d);
                    setCategoryId(null);
                  }}
                  className={`rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
                    direction === d
                      ? d === 'OUT'
                        ? 'border-[#cc1e44] bg-[#cc1e44]/10 text-[#c2410c]'
                        : 'border-[#0f766e] bg-[#0f766e]/10 text-[#005c55]'
                      : 'border-slate-200 text-text-secondary hover:bg-slate-50'
                  }`}
                  aria-pressed={direction === d}
                >
                  {d === 'OUT' ? 'Khoản chi' : 'Khoản thu'}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block">
                <span className="block text-xs font-medium text-text-secondary mb-1">Số tiền (₫)</span>
                <input
                  inputMode="numeric"
                  className="input-field tabular"
                  value={amountNum ? new Intl.NumberFormat('vi-VN').format(amountNum) : amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="50.000"
                  autoFocus
                />
              </label>
              <label className="block">
                <span className="block text-xs font-medium text-text-secondary mb-1">Tài khoản</span>
                <AccountSelect accounts={accounts} value={accountId ?? null} onChange={(id) => id !== null && setAccountId(id)} />
              </label>
            </div>
            <label className="block">
              <span className="block text-xs font-medium text-text-secondary mb-1">Nội dung</span>
              <input className="input-field" value={content} onChange={(e) => setContent(e.target.value)} placeholder="VD: Ăn trưa" />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="block text-xs font-medium text-text-secondary mb-1">Ngày</span>
                <DatePicker value={date} onChange={(v) => v && setDate(v)} className="w-full" />
              </label>
              <label className="block">
                <span className="block text-xs font-medium text-text-secondary mb-1">Giờ</span>
                <TimePicker value={time} onChange={setTime} className="w-full" />
              </label>
            </div>
          </>
        )}

        {transaction?.transferPair && (
          <div className="rounded-xl border border-slate-200 px-4 py-3 text-sm flex items-start gap-3">
            <ArrowLeftRight className="w-4 h-4 mt-0.5 text-text-muted flex-shrink-0" aria-hidden />
            <div className="flex-1 min-w-0">
              <p className="text-text font-medium">Chuyển khoản nội bộ</p>
              <p className="text-xs text-text-secondary mt-0.5">
                {transaction.direction === 'OUT' ? 'Sang' : 'Từ'} <b>{transaction.transferPair.account.name}</b> lúc{' '}
                {formatVNDateTime(transaction.transferPair.transactionDate)}. Cả hai giao dịch không được tính vào thu chi.
              </p>
              <button
                type="button"
                disabled={saving}
                onClick={unpair}
                className="mt-2 text-xs font-medium text-primary hover:underline disabled:opacity-60"
              >
                Không phải chuyển nội bộ — tính lại vào thống kê
              </button>
            </div>
          </div>
        )}

        <label className="block">
          <span className="block text-xs font-medium text-text-secondary mb-1">Danh mục</span>
          <CategorySelect categories={categories} value={categoryId} onChange={setCategoryId} direction={direction} suggested={suggested} />
        </label>
        <label className="block">
          <span className="block text-xs font-medium text-text-secondary mb-1">Ghi chú</span>
          <textarea className="input-field" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
        {!transaction?.transferPair && (
          <label className="flex items-start gap-2 text-sm text-text-secondary cursor-pointer">
            <input type="checkbox" className="mt-0.5" checked={exclude} onChange={(e) => setExclude(e.target.checked)} />
            <span>Loại khỏi thống kê</span>
          </label>
        )}

        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">
            Hủy
          </button>
          <button type="submit" disabled={saving} className="btn-primary flex-1 disabled:opacity-60">
            {saving ? 'Đang lưu…' : 'Lưu'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
