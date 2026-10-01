'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { Link2, Trash2 } from 'lucide-react';
import Modal from '@/components/shared/Modal';
import ConfirmModal from '@/components/shared/ConfirmModal';
import { errorMessage } from '@/lib/api-client';
import { formatVND } from '@/lib/money';
import { formatVNDate } from '@/lib/dates';
import { deleteContribution, useContributions } from '../lib';
import type { ContributionDTO, ContributionKind, GoalDTO } from '../types';

const KIND: Record<ContributionKind, { label: string; badge: string; sign: 1 | -1 }> = {
  OPENING: { label: 'Số dư ban đầu', badge: 'bg-slate-100 text-slate-600', sign: 1 },
  DEPOSIT: { label: 'Nạp', badge: 'bg-emerald-50 text-emerald-700', sign: 1 },
  INTEREST: { label: 'Tiền lãi', badge: 'bg-teal-50 text-teal-700', sign: 1 },
  WITHDRAW: { label: 'Rút', badge: 'bg-rose-50 text-rose-600', sign: -1 },
  SPEND: { label: 'Đã tiêu', badge: 'bg-violet-50 text-violet-700', sign: -1 },
};

export default function HistoryModal({ goal, onClose, onChanged }: { goal: GoalDTO; onClose: () => void; onChanged: () => void }) {
  const { data: rows, isLoading } = useContributions(goal.id);
  const [deleting, setDeleting] = useState<ContributionDTO | null>(null);

  const sum = (kinds: ContributionKind[]) => (rows ?? []).filter((r) => kinds.includes(r.kind)).reduce((s, r) => s + r.amount, 0);

  async function remove(c: ContributionDTO) {
    try {
      await deleteContribution(c.id);
      toast.success('Đã xóa');
      onChanged();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  return (
    <Modal isOpen onClose={onClose} title={`Lịch sử nạp/rút/tiêu: ${goal.name}`} size="lg">
      <div className="flex flex-col gap-4 font-jakarta">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 fin-num">
          {[
            ['Đã nạp', sum(['OPENING', 'DEPOSIT']), 'text-slate-900'],
            ['Tiền lãi', sum(['INTEREST']), 'text-teal-700'],
            ['Đã rút', sum(['WITHDRAW']), 'text-rose-600'],
            ['Đã tiêu', sum(['SPEND']), 'text-violet-700'],
          ].map(([label, v, cls]) => (
            <div key={label as string} className="rounded-xl bg-slate-50 p-3">
              <p className="fin-label">{label}</p>
              <p className={`text-[16px] font-bold mt-1 ${cls}`}>{formatVND(v as number)}</p>
            </div>
          ))}
        </div>

        <p className="text-xs text-slate-500 fin-num -mt-1">
          Còn trong quỹ: <strong className="text-slate-900">{formatVND(goal.balance)}</strong> · Đã tích lũy:{' '}
          <strong className="text-slate-900">{formatVND(goal.saved)}</strong> · Tiến độ tính theo{' '}
          {goal.ongoing ? 'số còn trong quỹ (quỹ duy trì)' : 'số đã tích lũy (quỹ một lần)'}
        </p>

        {isLoading ? (
          <div className="h-24 rounded-xl bg-slate-100 animate-pulse" />
        ) : !rows?.length ? (
          <p className="text-sm text-slate-500 text-center py-6">Chưa có lần nạp/rút nào.</p>
        ) : (
          <ul className="divide-y divide-slate-100 -mx-1">
            {rows.map((r) => {
              const k = KIND[r.kind];
              return (
                <li key={r.id} className="flex items-start gap-3 px-1 py-2.5">
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold shrink-0 mt-0.5 ${k.badge}`}>{k.label}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-900 fin-num">{formatVNDate(r.date)}{r.note ? ` · ${r.note}` : ''}</p>
                    {r.transaction && (
                      <p className="text-xs text-slate-500 flex items-center gap-1 truncate">
                        <Link2 className="w-3 h-3 shrink-0" aria-hidden />
                        {r.transaction.account.name} · {r.transaction.content}
                        {r.excludedTxn ? ' · đã loại khỏi thống kê' : ''}
                      </p>
                    )}
                  </div>
                  <span
                    className={`text-sm font-semibold fin-num shrink-0 ${r.kind === 'SPEND' ? 'text-violet-700' : k.sign < 0 ? 'text-rose-600' : 'text-emerald-700'}`}
                  >
                    {k.sign < 0 ? '−' : '+'}
                    {formatVND(r.amount)}
                  </span>
                  <button type="button" className="btn-icon !p-1.5 hover:!text-rose-600" aria-label="Xóa lần nạp/rút này" onClick={() => setDeleting(r)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <ConfirmModal
        isOpen={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && remove(deleting)}
        title="Xóa lần nạp/rút"
        message={
          deleting
            ? `Xóa "${KIND[deleting.kind].label} ${formatVND(deleting.amount)}" ngày ${formatVNDate(deleting.date)}?${
                deleting.excludedTxn ? ' Giao dịch gắn kèm sẽ được tính lại vào thống kê.' : ''
              }`
            : ''
        }
        confirmText="Xóa"
      />
    </Modal>
  );
}
