'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { ChartSpline, Infinity as InfinityIcon, Landmark, PlusCircle, Save, Target, Trash2 } from 'lucide-react';
import Modal from '@/components/shared/Modal';
import DatePicker from '@/components/shared/DatePicker';
import TreeSelect from '@/components/shared/TreeSelect';
import AccountSelect from '@/components/shared/AccountSelect';
import ConfirmModal from '@/components/shared/ConfirmModal';
import { errorMessage } from '@/lib/api-client';
import { formatVND } from '@/lib/money';
import { useAccounts } from '@/modules/finance/accounts/lib';
import { useMonthStartDay } from '@/modules/finance/settings/lib';
import { monthOfDate, todayVN } from '@/lib/dates';
import { createGoal, deleteGoal, updateGoal } from '../lib';
import type { GoalDTO, GoalInput, GoalJar, GoalPriority } from '../types';
import { GOAL_ICONS, JARS, PRIORITIES, monthText, nf } from '../utils/goal-meta';
import { monthsLeftUntil, projectMonth, simulateGoal } from '../utils/goal-calc';
import MoneyInput from './MoneyInput';

interface Props {
  goal: GoalDTO | null; // null = tạo mới
  month: string; // tháng hiện tại "YYYY-MM"
  avgMonthlyExpense: number | null;
  onClose: () => void;
  onSaved: () => void;
}

const QUICK_ADD = [10_000_000, 20_000_000, 50_000_000, 100_000_000];
const OTHER_HOLDING = -1;

function Label({ children, htmlFor, hint }: { children: React.ReactNode; htmlFor?: string; hint?: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="flex items-center justify-between gap-2 text-sm font-semibold text-slate-900 mb-1.5">
      <span>{children}</span>
      {hint && <span className="text-xs font-normal text-slate-500">{hint}</span>}
    </label>
  );
}

export default function GoalFormModal({ goal, month, avgMonthlyExpense, onClose, onSaved }: Props) {
  const editing = !!goal;
  const { data: accounts = [] } = useAccounts();

  const [name, setName] = useState(goal?.name ?? '');
  const [jar, setJar] = useState<GoalJar>(goal?.jar ?? 'SAFETY');
  const [icon, setIcon] = useState(goal?.icon ?? JARS.SAFETY.defaultIcon);
  const [iconTouched, setIconTouched] = useState(editing);
  const [showIcons, setShowIcons] = useState(false);
  const [target, setTarget] = useState<number | null>(goal?.targetAmount ?? null);
  const [initial, setInitial] = useState<number | null>(null);
  const [deadline, setDeadline] = useState(goal?.deadline ?? '');
  const [priority, setPriority] = useState<GoalPriority>(goal?.priority ?? 'NORMAL');
  // Quỹ duy trì mặc định theo hũ (An toàn tài chính) cho tới khi người dùng tự chọn
  const [ongoing, setOngoing] = useState(goal?.ongoing ?? true);
  const [ongoingTouched, setOngoingTouched] = useState(editing);
  const [monthlyPlan, setMonthlyPlan] = useState<number | null>(goal?.monthlyPlan ?? null);
  const [planDay, setPlanDay] = useState(goal?.planDay ? String(goal.planDay) : '');
  const [sourceAccountId, setSourceAccountId] = useState<number | null>(goal?.sourceAccount?.id ?? null);
  const [holdingAccountId, setHoldingAccountId] = useState<number | null>(
    goal?.holdingAccount?.id ?? (goal?.holdingName ? OTHER_HOLDING : null)
  );
  const [holdingName, setHoldingName] = useState(goal?.holdingName ?? '');
  const [rate, setRate] = useState(goal?.interestRate !== null && goal?.interestRate !== undefined ? String(goal.interestRate).replace('.', ',') : '');
  const [note, setNote] = useState(goal?.note ?? '');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const rateNum = rate.trim() ? Number(rate.replace(',', '.')) : null;
  const rateValid = rateNum === null || (Number.isFinite(rateNum) && rateNum >= 0 && rateNum <= 100);
  // Số tính tiến độ: quỹ duy trì = còn trong quỹ, quỹ một lần = đã tích lũy
  const saved = editing ? (ongoing ? goal.balance : goal.saved) : (initial ?? 0);
  const remaining = Math.max(0, (target ?? 0) - saved);

  // Tính ngay khi nhập: cần nạp bao nhiêu/tháng, dự kiến đạt khi nào, lãi đến khi đạt
  // Hạn là một ngày; số lần nạp còn lại tính theo tháng (tài chính) chứa ngày đó
  const sd = useMonthStartDay();
  const today = todayVN();
  const monthsLeft = deadline && deadline >= today ? monthsLeftUntil(month, monthOfDate(deadline, sd)) : null;
  const required = monthsLeft && remaining > 0 ? Math.ceil(remaining / monthsLeft) : null;
  const rateForSim = monthlyPlan ?? required ?? 0;
  const sim = target ? simulateGoal(saved, target, rateForSim, rateValid ? rateNum : null) : null;
  const projected = sim ? projectMonth(month, sim.months) : null;
  const sixMonths = avgMonthlyExpense ? Math.round((avgMonthlyExpense * 6) / 100_000) * 100_000 : null;

  function pickJar(j: GoalJar) {
    setJar(j);
    if (!iconTouched) setIcon(JARS[j].defaultIcon);
    if (!ongoingTouched) setOngoing(j === 'SAFETY');
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return toast.error('Nhập tên mục tiêu');
    if (!target) return toast.error('Nhập số tiền mục tiêu');
    if (!rateValid) return toast.error('Lãi suất không hợp lệ (0–100%/năm)');
    const day = planDay ? Number(planDay) : null;
    if (day !== null && (!Number.isInteger(day) || day < 1 || day > 31)) return toast.error('Ngày nạp phải từ 1 đến 31');

    const payload: GoalInput = {
      name: name.trim(),
      icon,
      jar,
      priority,
      ongoing,
      targetAmount: target,
      deadline: deadline || null,
      monthlyPlan: monthlyPlan || null,
      planDay: monthlyPlan ? day : null,
      sourceAccountId: monthlyPlan ? sourceAccountId : null,
      holdingAccountId: holdingAccountId && holdingAccountId > 0 ? holdingAccountId : null,
      holdingName: holdingAccountId === OTHER_HOLDING ? holdingName.trim() || null : null,
      interestRate: rateNum,
      note: note.trim() || null,
    };
    setSaving(true);
    try {
      if (editing) await updateGoal(goal.id, payload);
      else await createGoal({ ...payload, initialAmount: initial ?? 0 });
      toast.success(editing ? 'Đã lưu mục tiêu' : 'Đã tạo mục tiêu — bắt đầu tích lũy thôi!');
      onSaved();
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!goal) return;
    try {
      await deleteGoal(goal.id);
      toast.success('Đã xóa mục tiêu');
      onSaved();
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  const SelectedIcon = GOAL_ICONS[icon] ?? JARS[jar].icon;

  return (
    <Modal isOpen onClose={onClose} title={editing ? 'Sửa mục tiêu tiết kiệm' : 'Tạo mục tiêu tiết kiệm mới'} size="lg">
      <form onSubmit={submit} className="flex flex-col gap-5 font-jakarta">
        {/* Tên + biểu tượng */}
        <div>
          <Label htmlFor="goal-name" hint="Bấm biểu tượng để đổi">
            Tên mục tiêu & biểu tượng
          </Label>
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="w-11 h-11 rounded-xl border border-slate-200 flex items-center justify-center shrink-0 hover:bg-slate-50"
              style={{ color: JARS[jar].color }}
              onClick={() => setShowIcons((v) => !v)}
              aria-expanded={showIcons}
              aria-label="Đổi biểu tượng"
            >
              <SelectedIcon className="w-5 h-5" />
            </button>
            <input
              id="goal-name"
              className="input-field"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: Quỹ khẩn cấp 6 tháng, Mua laptop mới…"
              maxLength={100}
              autoFocus
            />
          </div>
          {showIcons && (
            <div className="grid grid-cols-10 gap-1.5 mt-2 p-2 rounded-xl bg-slate-50 border border-slate-200">
              {Object.entries(GOAL_ICONS).map(([key, Icon]) => (
                <button
                  key={key}
                  type="button"
                  aria-label={key}
                  aria-pressed={icon === key}
                  onClick={() => {
                    setIcon(key);
                    setIconTouched(true);
                    setShowIcons(false);
                  }}
                  className={`h-9 rounded-lg flex items-center justify-center border ${
                    icon === key ? 'border-teal-700 bg-teal-50 text-teal-700' : 'border-transparent text-slate-600 hover:bg-white'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Nhóm hũ */}
        <div>
          <Label>Nhóm hũ tài chính</Label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {(Object.keys(JARS) as GoalJar[]).map((j) => {
              const J = JARS[j];
              const active = jar === j;
              return (
                <button
                  key={j}
                  type="button"
                  aria-pressed={active}
                  onClick={() => pickJar(j)}
                  className={`flex items-center gap-2 p-2.5 rounded-xl text-left text-[13px] leading-tight transition-colors ${
                    active ? 'border-2 border-teal-700 bg-teal-50 text-teal-800 font-semibold' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <J.icon className="w-4 h-4 shrink-0" aria-hidden />
                  {J.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Loại quỹ */}
        <div>
          <Label hint="Ảnh hưởng khi bạn tiêu tiền của quỹ">Loại quỹ</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" role="radiogroup" aria-label="Loại quỹ">
            {(
              [
                [true, 'Quỹ duy trì (tích lũy trọn đời)', 'VD quỹ khẩn cấp. Tiêu bớt thì quỹ quay lại tích lũy để nạp bù cho đầy.', InfinityIcon],
                [false, 'Quỹ một lần', 'VD mua điện thoại. Đạt mục tiêu là xong, tiêu tiền không làm giảm tiến độ.', Target],
              ] as const
            ).map(([value, title, desc, Icon]) => {
              const active = ongoing === value;
              return (
                <button
                  key={String(value)}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => {
                    setOngoing(value);
                    setOngoingTouched(true);
                  }}
                  className={`flex items-start gap-2.5 p-3 rounded-xl text-left transition-colors ${
                    active ? 'border-2 border-teal-700 bg-teal-50' : 'border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${active ? 'text-teal-700' : 'text-slate-400'}`} aria-hidden />
                  <span>
                    <span className={`block text-[13px] font-semibold ${active ? 'text-teal-800' : 'text-slate-800'}`}>{title}</span>
                    <span className="block text-xs text-slate-500 mt-0.5 leading-snug">{desc}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Số tiền */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="goal-target">Số tiền mục tiêu</Label>
            <MoneyInput id="goal-target" value={target} onChange={setTarget} size="lg" />
            <div className="flex flex-wrap items-center gap-1.5 pt-1.5">
              {QUICK_ADD.map((v) => (
                <button
                  key={v}
                  type="button"
                  className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 text-[11px] font-bold"
                  onClick={() => setTarget((t) => (t ?? 0) + v)}
                >
                  +{v / 1_000_000}M
                </button>
              ))}
              {jar === 'SAFETY' && sixMonths && (
                <button
                  type="button"
                  className="px-2 py-0.5 rounded bg-teal-50 text-teal-700 text-[11px] font-bold"
                  onClick={() => setTarget(sixMonths)}
                  title={`Chi tiêu trung bình 6 tháng qua: ${formatVND(avgMonthlyExpense)}/tháng`}
                >
                  = 6 tháng chi tiêu
                </button>
              )}
            </div>
          </div>
          {editing ? (
            <div>
              <Label>{ongoing ? 'Đang có trong quỹ' : 'Đã tích lũy'}</Label>
              <p className="input-field !bg-slate-50 fin-num !text-[18px] !font-bold !py-2.5 text-teal-700">{formatVND(saved)}</p>
              <p className="text-xs text-slate-500 pt-1.5">Thay đổi bằng nút Nạp tiền / Lịch sử nạp rút.</p>
            </div>
          ) : (
            <div>
              <Label htmlFor="goal-initial" hint={target && initial ? <span className="text-emerald-700 font-semibold">{Math.floor((initial / target) * 100)}% mục tiêu</span> : null}>
                Số tiền đã có sẵn
              </Label>
              <MoneyInput id="goal-initial" value={initial} onChange={setInitial} size="lg" />
            </div>
          )}
        </div>

        {/* Thời hạn + ưu tiên */}
        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="goal-deadline" hint={deadline ? <button type="button" className="text-teal-700 hover:underline" onClick={() => setDeadline('')}>Bỏ hạn</button> : 'Không bắt buộc'}>
                Thời hạn hoàn thành
              </Label>
              <DatePicker id="goal-deadline" min={today} value={deadline} onChange={setDeadline} clearable placeholder="Không đặt hạn" className="w-full" />
            </div>
            <div>
              <Label htmlFor="goal-priority">Mức độ ưu tiên</Label>
              <TreeSelect<GoalPriority>
                id="goal-priority"
                ariaLabel="Mức độ ưu tiên"
                options={(Object.keys(PRIORITIES) as GoalPriority[]).map((p) => ({ value: p, label: PRIORITIES[p].label }))}
                value={priority}
                onChange={(v) => v && setPriority(v)}
                className="w-full"
              />
            </div>
          </div>
          {target ? (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200/70 flex items-start gap-3">
              <ChartSpline className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" aria-hidden />
              <p className="flex-1 text-xs text-slate-800 leading-relaxed fin-num">
                {remaining === 0 ? (
                  'Số đã có đủ mục tiêu — mục tiêu sẽ được đánh dấu hoàn thành.'
                ) : required ? (
                  <>
                    Cần nạp <strong className="text-teal-700">~{nf.format(required)} ₫/tháng</strong> trong <strong>{monthsLeft} tháng</strong> (tính cả tháng này) để đạt đúng hạn.
                    {monthlyPlan && monthlyPlan < required && (
                      <span className="text-amber-700"> Kế hoạch {nf.format(monthlyPlan)} ₫/tháng chưa đủ{projected ? `, dự kiến đạt ${monthText(projected)}` : ''}.</span>
                    )}
                  </>
                ) : monthlyPlan ? (
                  <>Với {nf.format(monthlyPlan)} ₫/tháng, dự kiến đạt <strong>{projected ? monthText(projected) : 'chưa xác định'}</strong>.</>
                ) : (
                  'Đặt thời hạn hoặc số tiền nạp hàng tháng để web tính lộ trình và nhắc bạn mỗi kỳ.'
                )}
              </p>
            </div>
          ) : null}
        </div>

        {/* Kế hoạch nạp định kỳ */}
        <div className="flex flex-col gap-3 p-3.5 rounded-xl border border-slate-200 bg-slate-50/60">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold text-slate-900">Kế hoạch nạp hàng tháng</span>
            {required && monthlyPlan !== required && (
              <button type="button" className="text-xs font-semibold text-teal-700 hover:underline" onClick={() => setMonthlyPlan(required)}>
                Dùng mức cần nạp ({nf.format(required)} ₫)
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor="goal-plan" className="block text-xs text-slate-500 mb-1">Số tiền / tháng</label>
              <MoneyInput id="goal-plan" value={monthlyPlan} onChange={setMonthlyPlan} placeholder="Không đặt" />
            </div>
            <div>
              <label htmlFor="goal-day" className="block text-xs text-slate-500 mb-1">Ngày nạp trong tháng</label>
              <input
                id="goal-day"
                inputMode="numeric"
                className="input-field fin-num"
                placeholder="VD: 5"
                value={planDay}
                disabled={!monthlyPlan}
                onChange={(e) => setPlanDay(e.target.value.replace(/[^\d]/g, '').slice(0, 2))}
              />
            </div>
            <div>
              <label htmlFor="goal-source" className="block text-xs text-slate-500 mb-1">Tài khoản nguồn</label>
              <AccountSelect id="goal-source" ariaLabel="Tài khoản nguồn" accounts={accounts} value={sourceAccountId} onChange={setSourceAccountId} allLabel="Không chọn" disabled={!monthlyPlan} className="w-full" />
            </div>
          </div>
        </div>

        {/* Nơi giữ tiền + lãi suất */}
        <div className="flex flex-col gap-3 p-3.5 rounded-xl border border-slate-200 bg-slate-50/60">
          <div className="flex items-center gap-2">
            <Landmark className="w-4 h-4 text-teal-700" aria-hidden />
            <span className="text-sm font-semibold text-slate-900">Nơi giữ tiền & lãi suất</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="goal-holding" className="block text-xs text-slate-500 mb-1">Tài khoản / sổ tiết kiệm</label>
              <AccountSelect
                id="goal-holding"
                ariaLabel="Tài khoản / sổ tiết kiệm"
                accounts={accounts}
                value={holdingAccountId}
                onChange={setHoldingAccountId}
                allLabel="Không ghi"
                extra={[{ value: OTHER_HOLDING, label: 'Khác (tự nhập)…', icon: <span className="w-6 h-6 rounded-md inline-flex items-center justify-center bg-amber-50 text-amber-700" aria-hidden><Landmark className="w-3.5 h-3.5" /></span> }]}
                className="w-full"
              />
              {holdingAccountId === OTHER_HOLDING && (
                <input
                  className="input-field mt-2"
                  placeholder="VD: Cake - Hũ tiết kiệm, Sổ tiết kiệm ACB"
                  value={holdingName}
                  maxLength={100}
                  onChange={(e) => setHoldingName(e.target.value)}
                  aria-label="Tên nơi giữ tiền"
                />
              )}
            </div>
            <div>
              <label htmlFor="goal-rate" className="block text-xs text-slate-500 mb-1">Lãi suất (% / năm)</label>
              <div className="relative">
                <input
                  id="goal-rate"
                  inputMode="decimal"
                  className={`input-field fin-num pr-16 ${rateValid ? '' : '!border-rose-400'}`}
                  placeholder="VD: 5,5"
                  value={rate}
                  onChange={(e) => setRate(e.target.value.replace(/[^\d.,]/g, ''))}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">%/năm</span>
              </div>
            </div>
          </div>
          {rateValid && rateNum ? (
            <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-200 fin-num">
              <span className="text-slate-600">Ước tính lãi nhận được đến khi đạt mục tiêu (lãi nhập gốc hàng tháng):</span>
              <span className="font-semibold text-emerald-700 text-sm">{sim && sim.months !== null ? `+${formatVND(sim.interest)}` : '—'}</span>
            </div>
          ) : null}
        </div>

        <div>
          <label htmlFor="goal-note" className="block text-xs text-slate-500 mb-1">Ghi chú</label>
          <textarea id="goal-note" rows={2} className="input-field" value={note} maxLength={1000} onChange={(e) => setNote(e.target.value)} />
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
          {editing && (
            <button type="button" className="fin-btn fin-btn-ghost text-rose-600 mr-auto" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="w-4 h-4" /> Xóa mục tiêu
            </button>
          )}
          <button type="button" className="fin-btn fin-btn-outline" onClick={onClose}>
            Hủy
          </button>
          <button type="submit" className="fin-btn fin-btn-primary" disabled={saving}>
            {editing ? <Save className="w-4 h-4" /> : <PlusCircle className="w-4 h-4" />}
            {saving ? 'Đang lưu…' : editing ? 'Lưu thay đổi' : 'Tạo mục tiêu & bắt đầu tích lũy'}
          </button>
        </div>
      </form>

      <ConfirmModal
        isOpen={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={remove}
        title="Xóa mục tiêu"
        message={`Xóa "${goal?.name}" cùng toàn bộ lịch sử nạp/rút? Các giao dịch đã được web loại khỏi thống kê khi gắn vào mục tiêu sẽ được tính lại.`}
        confirmText="Xóa"
      />
    </Modal>
  );
}
