'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { Info, Link2 } from 'lucide-react';
import Modal from '@/components/shared/Modal';
import { errorMessage } from '@/lib/api-client';
import { formatVND } from '@/lib/money';
import { formatVNDate, todayVN, toVNDateString } from '@/lib/dates';
import { addContribution, useLinkableTransactions } from '../lib';
import type { ContributionInput, GoalDTO } from '../types';
import { pct } from '../utils/goal-meta';
import MoneyInput from './MoneyInput';

type Kind = ContributionInput['kind'];

const KINDS: { value: Kind; label: string; hint: string }[] = [
  { value: 'DEPOSIT', label: 'Nạp thêm', hint: 'Bạn đã chuyển tiền vào nơi giữ tiền của mục tiêu' },
  { value: 'WITHDRAW', label: 'Rút ra', hint: 'Bạn lấy bớt tiền ra khỏi hũ' },
  { value: 'INTEREST', label: 'Tiền lãi', hint: 'Ngân hàng trả lãi vào khoản tiết kiệm' },
];

interface Props {
  goal: GoalDTO;
  preset?: number;
  onClose: () => void;
  onSaved: () => void;
}

export default function ContributionModal({ goal, preset, onClose, onSaved }: Props) {
  const today = todayVN();
  const [kind, setKind] = useState<Kind>('DEPOSIT');
  const [amount, setAmount] = useState<number | null>(preset ?? (goal.thisMonth.due || null));
  const [date, setDate] = useState(today);
  const [note, setNote] = useState('');
  const [linking, setLinking] = useState(false);
  const [txnId, setTxnId] = useState<number | null>(null);
  const [exclude, setExclude] = useState(true);
  const [saving, setSaving] = useState(false);

  // Nạp/rút thường đi kèm một lệnh chuyển tiền ra/vào tài khoản chi tiêu
  const direction = kind === 'DEPOSIT' ? 'OUT' : 'IN';
  const { data: txns = [], isLoading } = useLinkableTransactions(direction, linking);
  const txn = txns.find((t) => t.id === txnId) ?? null;

  const sign = kind === 'WITHDRAW' ? -1 : 1;
  const after = goal.saved + sign * (amount ?? 0);

  function changeKind(k: Kind) {
    setKind(k);
    setTxnId(null);
    setExclude(k !== 'INTEREST'); // tiền lãi là thu nhập thật → mặc định vẫn tính vào thống kê
  }

  function pickTxn(id: number | null) {
    setTxnId(id);
    const t = txns.find((x) => x.id === id);
    if (t) {
      setAmount(t.amount);
      setDate(toVNDateString(new Date(t.transactionDate)));
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!amount) return toast.error('Nhập số tiền');
    if (kind === 'WITHDRAW' && amount > goal.saved) return toast.error('Số tiền rút lớn hơn số đã tích lũy');
    setSaving(true);
    try {
      await addContribution(goal.id, {
        kind,
        amount,
        date,
        note: note.trim() || null,
        transactionId: txn?.id ?? null,
        excludeFromStats: txn ? exclude : undefined,
      });
      const reached = goal.saved < goal.targetAmount && after >= goal.targetAmount;
      toast.success(reached ? `🎉 Chúc mừng! "${goal.name}" đã về đích` : kind === 'WITHDRAW' ? 'Đã ghi rút tiền' : 'Đã ghi nạp tiền');
      onSaved();
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal isOpen onClose={onClose} title={`Nạp / rút: ${goal.name}`} size="md">
      <form onSubmit={submit} className="flex flex-col gap-4 font-jakarta">
        <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-slate-100" role="radiogroup" aria-label="Loại">
          {KINDS.map((k) => (
            <button
              key={k.value}
              type="button"
              role="radio"
              aria-checked={kind === k.value}
              onClick={() => changeKind(k.value)}
              className={`py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                kind === k.value ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {k.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-500 -mt-2">{KINDS.find((k) => k.value === kind)!.hint}</p>

        <div>
          <label htmlFor="contrib-amount" className="block text-sm font-semibold text-slate-900 mb-1.5">Số tiền</label>
          <MoneyInput id="contrib-amount" value={amount} onChange={setAmount} size="lg" />
          {kind === 'DEPOSIT' && (
            <div className="flex flex-wrap gap-1.5 pt-1.5">
              {goal.thisMonth.due > 0 && (
                <button type="button" className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 text-[11px] font-bold" onClick={() => setAmount(goal.thisMonth.due)}>
                  Kỳ này còn {formatVND(goal.thisMonth.due)}
                </button>
              )}
              {goal.remaining > 0 && (
                <button type="button" className="px-2 py-0.5 rounded bg-teal-50 text-teal-700 text-[11px] font-bold" onClick={() => setAmount(goal.remaining)}>
                  Về đích: {formatVND(goal.remaining)}
                </button>
              )}
            </div>
          )}
          {amount ? (
            <p className="text-xs text-slate-500 pt-1.5 fin-num">
              Sau khi ghi: <strong className="text-slate-900">{formatVND(after)}</strong> / {formatVND(goal.targetAmount)} ({pct(Math.max(0, after) / goal.targetAmount)})
            </p>
          ) : null}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="contrib-date" className="block text-xs text-slate-500 mb-1">Ngày</label>
            <input id="contrib-date" type="date" max={today} className="input-field" value={date} disabled={!!txn} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <label htmlFor="contrib-note" className="block text-xs text-slate-500 mb-1">Ghi chú</label>
            <input id="contrib-note" className="input-field" value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} placeholder="Không bắt buộc" />
          </div>
        </div>

        {/* Gắn với giao dịch chuyển tiền thật */}
        <div className="rounded-xl border border-slate-200 p-3 flex flex-col gap-2.5">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-900 cursor-pointer">
            <input type="checkbox" checked={linking} onChange={(e) => { setLinking(e.target.checked); if (!e.target.checked) setTxnId(null); }} />
            <Link2 className="w-4 h-4 text-slate-400" aria-hidden />
            Gắn với giao dịch {direction === 'OUT' ? 'chuyển tiền đi' : 'tiền vào'} đã ghi nhận
          </label>
          {linking && (
            <>
              <select
                className="select-field w-full"
                value={txnId ?? ''}
                onChange={(e) => pickTxn(e.target.value ? Number(e.target.value) : null)}
                aria-label="Chọn giao dịch"
              >
                <option value="">{isLoading ? 'Đang tải…' : txns.length ? 'Chọn giao dịch (90 ngày gần nhất)…' : 'Không có giao dịch phù hợp'}</option>
                {txns.map((t) => (
                  <option key={t.id} value={t.id}>
                    {formatVNDate(t.transactionDate)} · {formatVND(t.amount)} · {t.account.name} · {t.content.slice(0, 50)}
                  </option>
                ))}
              </select>
              {txn &&
                (txn.excludeFromStats ? (
                  <p className="text-xs text-slate-500">Giao dịch này đã được loại khỏi thống kê (VD chuyển khoản nội bộ).</p>
                ) : (
                  <label className="flex items-start gap-2 text-xs text-slate-600 cursor-pointer">
                    <input type="checkbox" className="mt-0.5" checked={exclude} onChange={(e) => setExclude(e.target.checked)} />
                    <span>
                      Loại giao dịch này khỏi thống kê thu chi — tiền để dành không phải khoản chi tiêu. Xóa lần nạp này thì giao dịch được
                      tính lại như cũ.
                    </span>
                  </label>
                ))}
            </>
          )}
        </div>

        <p className="flex items-start gap-2 text-xs text-slate-500">
          <Info className="w-4 h-4 shrink-0" aria-hidden />
          Web chỉ ghi lại số tiền trong hũ, không chuyển tiền thật. Hãy chuyển tiền trong app ngân hàng của bạn.
        </p>

        <div className="flex justify-end gap-2">
          <button type="button" className="fin-btn fin-btn-outline" onClick={onClose}>
            Hủy
          </button>
          <button type="submit" className="fin-btn fin-btn-primary" disabled={saving}>
            {saving ? 'Đang lưu…' : kind === 'WITHDRAW' ? 'Ghi rút tiền' : kind === 'INTEREST' ? 'Ghi tiền lãi' : 'Ghi nạp tiền'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
