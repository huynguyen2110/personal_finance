'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { Link2 } from 'lucide-react';
import Modal from '@/components/shared/Modal';
import DatePicker from '@/components/shared/DatePicker';
import TreeSelect from '@/components/shared/TreeSelect';
import AccountSelect, { AccountIcon } from '@/components/shared/AccountSelect';
import CategorySelect from '@/components/shared/CategorySelect';
import { useAccounts } from '@/modules/finance/accounts/lib';
import { useCategories } from '@/modules/finance/categories/lib';
import { errorMessage } from '@/lib/api-client';
import { formatVND } from '@/lib/money';
import { formatVNDate, todayVN, toVNDateString } from '@/lib/dates';
import { addContribution, useLinkableTransactions } from '../lib';
import type { ContributionInput, GoalDTO } from '../types';
import { pct } from '../utils/goal-meta';
import MoneyInput from '@/components/shared/MoneyInput';

type Kind = ContributionInput['kind'];

const KINDS: { value: Kind; label: string; hint: string }[] = [
  { value: 'DEPOSIT', label: 'Nạp thêm', hint: 'Bạn đã chuyển tiền vào nơi giữ tiền của mục tiêu' },
  { value: 'WITHDRAW', label: 'Rút ra', hint: 'Bạn lấy bớt tiền ra khỏi hũ' },
  { value: 'INTEREST', label: 'Tiền lãi', hint: 'Ngân hàng trả lãi vào khoản tiết kiệm' },
  { value: 'SPEND', label: 'Chi tiêu', hint: 'Bạn đã dùng tiền của quỹ cho đúng mục đích (VD đã mua laptop). Tiến độ tích lũy không giảm. Phải gắn với một khoản chi (đã ghi nhận hoặc tạo mới), khoản chi được tính vào thống kê chi tiêu.' },
];

interface Props {
  goal: GoalDTO;
  preset?: number;
  initialKind?: Kind;
  onClose: () => void;
  onSaved: () => void;
}

export default function ContributionModal({ goal, preset, initialKind = 'DEPOSIT', onClose, onSaved }: Props) {
  const today = todayVN();
  const [kind, setKind] = useState<Kind>(initialKind);
  const [amount, setAmount] = useState<number | null>(
    preset ?? (initialKind === 'SPEND' ? goal.balance || null : goal.thisMonth.due || null)
  );
  const [date, setDate] = useState(today);
  const [note, setNote] = useState('');
  const [linking, setLinking] = useState(false);
  const [txnId, setTxnId] = useState<number | null>(null);
  // Nạp: mặc định loại giao dịch chuyển tiền khỏi thống kê; tiền lãi và khoản chi thật thì vẫn tính
  const [exclude, setExclude] = useState(initialKind === 'DEPOSIT' || initialKind === 'WITHDRAW');
  const [saving, setSaving] = useState(false);

  // Nạp / rút / chi tiêu đi kèm một giao dịch tiền ra (rút = lấy tiền ra để tiêu); tiền lãi đi kèm giao dịch tiền vào
  const direction = kind === 'DEPOSIT' || kind === 'SPEND' ? 'OUT' : 'IN';
  const spending = kind === 'SPEND';
  const takesOut = kind === 'WITHDRAW' || spending;
  // Rút quỹ bắt buộc gắn khoản chi: chọn giao dịch chi đã có, hoặc tạo giao dịch chi mới
  const { data: allTxns = [], isLoading } = useLinkableTransactions(direction, linking || spending);
  // Khoản chi của lần chi tiêu từ quỹ phải được tính vào thống kê → bỏ các giao dịch đang bị loại ra
  const txns = spending ? allTxns.filter((t) => !t.excludeFromStats) : allTxns;
  const txn = txns.find((t) => t.id === txnId) ?? null;
  const [txnMode, setTxnMode] = useState<'existing' | 'new'>('existing');
  const { data: accounts = [] } = useAccounts();
  const { data: categories = [] } = useCategories();
  const [newAccountId, setNewAccountId] = useState<number | null>(null);
  const [newContent, setNewContent] = useState(`Chi từ quỹ ${goal.name}`);
  const [newCategoryId, setNewCategoryId] = useState<number | null>(null);
  const activeAccounts = accounts.filter((a) => a.isActive);
  const newAccount = newAccountId ?? activeAccounts.find((a) => a.type === 'CASH')?.id ?? activeAccounts[0]?.id ?? null;

  // Số tính tiến độ sau khi ghi. Chi tiêu: quỹ duy trì bị trừ (quay lại tích lũy), quỹ một lần giữ nguyên
  const delta = kind === 'WITHDRAW' || (spending && goal.ongoing) ? -1 : spending ? 0 : 1;
  const after = goal.current + delta * (amount ?? 0);
  const balanceAfter = goal.balance + (takesOut ? -1 : 1) * (amount ?? 0);

  function changeKind(k: Kind) {
    setKind(k);
    setTxnId(null);
    setTxnMode('existing');
    setExclude(k === 'DEPOSIT' || k === 'WITHDRAW'); // tiền lãi, khoản chi thật → mặc định vẫn tính vào thống kê
    if (k === 'SPEND') setAmount(goal.balance || null);
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
    if (takesOut && amount > goal.balance) {
      return toast.error(spending ? 'Số tiền tiêu lớn hơn số còn trong quỹ' : 'Số tiền rút lớn hơn số còn trong quỹ');
    }
    // Chi tiêu từ quỹ bắt buộc gắn khoản chi: chọn giao dịch chi đã có, hoặc tạo giao dịch chi mới
    const creating = spending && txnMode === 'new';
    if (spending && !creating && !txn) return toast.error('Chọn khoản chi đã ghi nhận, hoặc tạo giao dịch chi mới');
    if (creating && !newAccount) return toast.error('Chọn tài khoản cho giao dịch chi');
    if (creating && !newContent.trim()) return toast.error('Nhập nội dung giao dịch chi');
    setSaving(true);
    try {
      await addContribution(goal.id, {
        kind,
        amount,
        date,
        note: note.trim() || null,
        transactionId: creating ? null : (txn?.id ?? null),
        excludeFromStats: txn && !spending ? exclude : undefined,
        ...(creating ? { newTransaction: { accountId: newAccount!, content: newContent.trim(), categoryId: newCategoryId } } : {}),
      });
      const reached = goal.current < goal.targetAmount && after >= goal.targetAmount;
      const reopened = spending && goal.ongoing && after < goal.targetAmount;
      toast.success(
        reached
          ? `🎉 Chúc mừng! "${goal.name}" đã về đích`
          : reopened
            ? `Đã ghi chi tiêu — quỹ quay lại tích lũy, cần nạp bù ${formatVND(goal.targetAmount - after)}`
            : spending
            ? balanceAfter <= 0
              ? `Đã ghi chi tiêu — "${goal.name}" đã tiêu hết`
              : creating
                ? 'Đã ghi chi tiêu từ quỹ và tạo khoản chi'
                : 'Đã ghi chi tiêu từ quỹ'
            : kind === 'WITHDRAW'
              ? 'Đã ghi rút tiền'
              : 'Đã ghi nạp tiền'
      );
      onSaved();
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal isOpen onClose={onClose} title={`${spending ? 'Chi tiêu từ quỹ' : 'Nạp / rút'}: ${goal.name}`} size="md">
      <form onSubmit={submit} className="flex flex-col gap-4 font-jakarta">
        <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-slate-100" role="radiogroup" aria-label="Loại">
          {KINDS.map((k) => (
            <button
              key={k.value}
              type="button"
              role="radio"
              aria-checked={kind === k.value}
              onClick={() => changeKind(k.value)}
              className={`py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                kind === k.value
                  ? `bg-white shadow-sm ${k.value === 'SPEND' ? 'text-violet-700' : 'text-slate-900'}`
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {k.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-500 -mt-2">
          {spending && goal.ongoing
            ? 'Bạn đã dùng tiền của quỹ duy trì. Số còn trong quỹ giảm và quỹ quay lại tích lũy để nạp bù.'
            : KINDS.find((k) => k.value === kind)!.hint}
        </p>

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
          {spending && goal.balance > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1.5">
              <button type="button" className="px-2 py-0.5 rounded bg-violet-50 text-violet-700 text-[11px] font-bold" onClick={() => setAmount(goal.balance)}>
                Tiêu hết: {formatVND(goal.balance)}
              </button>
            </div>
          )}
          {amount ? (
            <p className="text-xs text-slate-500 pt-1.5 fin-num">
              {spending && goal.ongoing ? (
                <>
                  Sau khi tiêu: quỹ còn <strong className={balanceAfter < 0 ? 'text-rose-600' : 'text-slate-900'}>{formatVND(balanceAfter)}</strong> /{' '}
                  {formatVND(goal.targetAmount)} ({pct(Math.max(0, after) / goal.targetAmount)})
                  {after < goal.targetAmount ? ' — quỹ sẽ quay lại tích lũy' : ''}
                </>
              ) : spending ? (
                <>
                  Còn trong quỹ sau khi tiêu: <strong className={balanceAfter < 0 ? 'text-rose-600' : 'text-slate-900'}>{formatVND(balanceAfter)}</strong>
                  {' '}(đã tích lũy vẫn là {formatVND(goal.saved)} — {pct(goal.progress)} mục tiêu)
                </>
              ) : (
                <>
                  Sau khi ghi: <strong className="text-slate-900">{formatVND(after)}</strong> / {formatVND(goal.targetAmount)} ({pct(Math.max(0, after) / goal.targetAmount)})
                </>
              )}
            </p>
          ) : null}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="contrib-date" className="block text-xs text-slate-500 mb-1">Ngày</label>
            <DatePicker id="contrib-date" max={today} value={date} disabled={!!txn} onChange={setDate} className="w-full" />
          </div>
          <div>
            <label htmlFor="contrib-note" className="block text-xs text-slate-500 mb-1">Ghi chú</label>
            <input id="contrib-note" className="input-field" value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} placeholder="Không bắt buộc" />
          </div>
        </div>

        {spending ? (
          // Chi tiêu từ quỹ: bắt buộc gắn với khoản chi (được tính vào thống kê chi tiêu)
          <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-3 flex flex-col gap-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Link2 className="w-4 h-4 text-slate-400" aria-hidden /> Khoản chi dùng tiền quỹ
              </span>
              <span className="text-[11px] font-semibold text-amber-700">Bắt buộc</span>
            </div>
            <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-white border border-slate-200" role="radiogroup" aria-label="Cách gắn khoản chi">
              {(
                [
                  ['existing', 'Chọn giao dịch đã có'],
                  ['new', 'Tạo giao dịch chi mới'],
                ] as const
              ).map(([m, label]) => (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={txnMode === m}
                  onClick={() => setTxnMode(m)}
                  className={`py-1.5 rounded-md text-xs font-semibold transition-colors ${txnMode === m ? 'bg-teal-50 text-teal-800' : 'text-slate-500 hover:text-slate-900'}`}
                >
                  {label}
                </button>
              ))}
            </div>
            {txnMode === 'existing' ? (
              <>
                <TreeSelect<number>
                  ariaLabel="Chọn khoản chi"
                  options={txns.map((t) => ({
                    value: t.id,
                    label: `${formatVNDate(t.transactionDate)} · ${t.content.slice(0, 50)}`,
                    meta: formatVND(t.amount),
                    keywords: `${t.account.name} ${t.content}`,
                    icon: <AccountIcon type="BANK" />,
                  }))}
                  value={txnId}
                  onChange={pickTxn}
                  clearable
                  placeholder={isLoading ? 'Đang tải…' : txns.length ? 'Chọn khoản chi (90 ngày gần nhất)…' : 'Chưa có khoản chi phù hợp'}
                  disabled={!isLoading && !txns.length}
                  className="w-full"
                />
                {!isLoading && !txns.length && (
                  <button type="button" className="self-start text-xs font-semibold text-teal-700 hover:underline" onClick={() => setTxnMode('new')}>
                    Chưa có giao dịch? Tạo giao dịch chi mới
                  </button>
                )}
              </>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Tài khoản chi</label>
                  <AccountSelect accounts={activeAccounts} value={newAccount} onChange={(id) => id !== null && setNewAccountId(id)} className="w-full" />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Danh mục</label>
                  <CategorySelect categories={categories} value={newCategoryId} onChange={setNewCategoryId} direction="OUT" className="w-full" />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="contrib-txn-content" className="block text-xs text-slate-500 mb-1">Nội dung giao dịch</label>
                  <input id="contrib-txn-content" className="input-field" value={newContent} maxLength={500} onChange={(e) => setNewContent(e.target.value)} />
                </div>
              </div>
            )}
            <p className="text-xs text-slate-600">
              Khoản chi này được tính vào thống kê chi tiêu.{txnMode === 'new' ? ' Số tiền và ngày lấy theo lần chi tiêu; xóa lần ghi này thì giao dịch cũng bị xóa.' : ''}
            </p>
          </div>
        ) : (
        /* Gắn với giao dịch chuyển tiền thật */
        <div className="rounded-xl border border-slate-200 p-3 flex flex-col gap-2.5">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-900 cursor-pointer">
            <input type="checkbox" checked={linking} onChange={(e) => { setLinking(e.target.checked); if (!e.target.checked) setTxnId(null); }} />
            <Link2 className="w-4 h-4 text-slate-400" aria-hidden />
            Gắn với giao dịch {spending ? 'chi tiêu' : direction === 'OUT' ? 'chuyển tiền đi' : 'tiền vào'} đã ghi nhận
          </label>
          {linking && (
            <>
              <TreeSelect<number>
                ariaLabel="Chọn giao dịch"
                options={txns.map((t) => ({
                  value: t.id,
                  label: `${formatVNDate(t.transactionDate)} · ${t.content.slice(0, 50)}`,
                  meta: formatVND(t.amount),
                  keywords: `${t.account.name} ${t.content}`,
                  icon: <AccountIcon type="BANK" />,
                }))}
                value={txnId}
                onChange={pickTxn}
                clearable
                placeholder={isLoading ? 'Đang tải…' : txns.length ? 'Chọn giao dịch (90 ngày gần nhất)…' : 'Không có giao dịch phù hợp'}
                disabled={!isLoading && !txns.length}
                className="w-full"
              />
              {txn &&
                (txn.excludeFromStats ? (
                  <p className="text-xs text-slate-500">Giao dịch này đã được loại khỏi thống kê (VD chuyển khoản nội bộ).</p>
                ) : (
                  <label className="flex items-start gap-2 text-xs text-slate-600 cursor-pointer">
                    <input type="checkbox" className="mt-0.5" checked={exclude} onChange={(e) => setExclude(e.target.checked)} />
                    <span>
                      {spending
                        ? 'Loại giao dịch này khỏi thống kê thu chi. Thường nên để trống: đây là khoản chi thật, chỉ tích nếu không muốn nó làm lệch thống kê tháng.'
                        : 'Loại giao dịch này khỏi thống kê thu chi — tiền để dành không phải khoản chi tiêu.'}{' '}
                      Xóa lần ghi này thì giao dịch được tính lại như cũ.
                    </span>
                  </label>
                ))}
            </>
          )}
        </div>
        )}


        <div className="flex justify-end gap-2">
          <button type="button" className="fin-btn fin-btn-outline" onClick={onClose}>
            Hủy
          </button>
          <button type="submit" className={`fin-btn ${spending ? 'bg-violet-600 text-white hover:bg-violet-700' : 'fin-btn-primary'}`} disabled={saving}>
            {saving
              ? 'Đang lưu…'
              : spending
                ? 'Ghi chi tiêu'
                : kind === 'WITHDRAW'
                  ? 'Ghi rút tiền'
                  : kind === 'INTEREST'
                    ? 'Ghi tiền lãi'
                    : 'Ghi nạp tiền'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
