'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import { CalendarRange, CircleCheck, Info, MailSearch, PiggyBank, RefreshCw, Save, Target, Trash2, TrendingUp } from 'lucide-react';
import Header from '@/components/layout/Header';
import DatePicker from '@/components/shared/DatePicker';
import ConfirmModal from '@/components/shared/ConfirmModal';
import { errorMessage } from '@/lib/api-client';
import { invalidateFinanceData } from '@/lib/query-client';
import { addMonths, currentMonthVN, formatMonthLabel, formatMonthRange, formatVNDate, formatVNDateTime, MAX_MONTH_START_DAY, MIN_MONTH_START_DAY, monthRange, todayVN } from '@/lib/dates';
import { EMAIL_QUERY_KEYS, pollEmailsFromStart, purgeEmailBeforeStart, useEmailBeforeStart, useEmailStatus } from '@/modules/email/lib';
import { updateSettings, useSettings } from '../lib';

export default function SettingsPage() {
  const { data, isLoading } = useSettings();
  return (
    <div className="font-jakarta">
      <Header title="Cài đặt" subtitle="Tùy chỉnh cách ứng dụng tính toán và hiển thị" />
      <div className="px-4 md:px-6 pb-8 flex flex-col gap-4 md:gap-6 max-w-4xl">
        {isLoading || !data ? (
          <div className="fin-card h-64 animate-pulse" />
        ) : (
          <>
            <MonthStartCard key={`m-${data.monthStartDay}`} initial={data.monthStartDay} />
            <EmailStartCard key={`e-${data.emailStartDate ?? ''}`} initial={data.emailStartDate} />
          </>
        )}
      </div>
    </div>
  );
}

// Chu kỳ tháng: ngày bắt đầu "tháng" tài chính (VD ngày nhận lương)
function MonthStartCard({ initial }: { initial: number }) {
  const qc = useQueryClient();
  const [day, setDay] = useState(initial);
  const [saving, setSaving] = useState(false);
  const dirty = day !== initial;

  const today = todayVN();
  const month = currentMonthVN(day);
  const range = monthRange(month, day);
  const nextMonth = addMonths(month, 1);

  async function save() {
    setSaving(true);
    try {
      await updateSettings({ monthStartDay: day });
      toast.success(day === 1 ? 'Đã chuyển về tháng lịch (ngày 1)' : `Tháng sẽ bắt đầu từ ngày ${day} hàng tháng`);
      // Mọi số liệu theo tháng (ngân sách, thống kê, quỹ) đổi theo → tải lại tất cả
      invalidateFinanceData(qc);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="fin-card p-5 md:p-6 flex flex-col gap-5">
      <div className="flex items-start gap-3">
        <span className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
          <CalendarRange className="w-5 h-5" aria-hidden />
        </span>
        <div>
          <h2 className="text-[16px] font-semibold text-slate-900">Ngày bắt đầu tháng</h2>
          <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
            Nếu bạn nhận lương vào một ngày cố định, hãy đặt ngày đó làm đầu tháng. Ngân sách, thống kê theo tháng và kế hoạch nạp quỹ sẽ
            tính theo chu kỳ lương thay vì tháng lịch.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="fin-label">Tháng bắt đầu từ ngày</span>
          <select className="select-field !rounded-lg !bg-slate-50 text-sm font-semibold fin-num" value={day} onChange={(e) => setDay(Number(e.target.value))}>
            {Array.from({ length: MAX_MONTH_START_DAY - MIN_MONTH_START_DAY + 1 }, (_, i) => i + MIN_MONTH_START_DAY).map((d) => (
              <option key={d} value={d}>
                {d === 1 ? 'Ngày 1 — tháng lịch thông thường' : `Ngày ${d} hàng tháng`}
              </option>
            ))}
          </select>
          <span className="text-[11px] text-slate-500">Tối đa ngày 28 để tháng nào cũng có ngày này.</span>
        </label>

        <div className="rounded-xl bg-slate-50 border border-slate-200 p-3.5 flex flex-col gap-2 text-xs text-slate-600">
          <span className="fin-label">Xem trước</span>
          <p>
            Hôm nay <b className="text-slate-900 fin-num">{formatVNDate(today)}</b> thuộc{' '}
            <b className="text-teal-800">{formatMonthLabel(month).replace('T', 'tháng ')}</b>
          </p>
          <p className="fin-num">
            {formatMonthLabel(month).replace('T', 'Tháng ')}: <b className="text-slate-900">{formatMonthRange(month, day)}</b>
          </p>
          <p className="fin-num">
            {formatMonthLabel(nextMonth).replace('T', 'Tháng ')}: <b className="text-slate-900">{formatMonthRange(nextMonth, day)}</b>
          </p>
          {day > 1 && (
            <p className="text-slate-500">
              Còn <b className="text-slate-900 fin-num">{Math.max(0, Math.round((new Date(`${range.to}T00:00:00+07:00`).getTime() - new Date(`${today}T00:00:00+07:00`).getTime()) / 86400000))}</b> ngày
              tới kỳ lương tiếp theo ({formatVNDate(monthRange(nextMonth, day).from)}).
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Effect icon={Target} title="Ngân sách">
          Hạn mức và số đã chi của &ldquo;tháng&rdquo; tính từ ngày lương tới trước ngày lương kế tiếp. Nhịp chi so với thời gian cũng theo chu kỳ này.
        </Effect>
        <Effect icon={TrendingUp} title="Tổng quan & Thống kê">
          Bộ lọc &ldquo;Tháng này / Tháng trước&rdquo; và cột tháng trong biểu đồ, ma trận danh mục gom theo chu kỳ lương.
        </Effect>
        <Effect icon={PiggyBank} title="Mục tiêu tiết kiệm">
          Thặng dư tháng, kế hoạch nạp và kỷ luật nạp chấm theo chu kỳ lương; ngày nạp kế hoạch vẫn là ngày lịch bạn chọn.
        </Effect>
      </div>

      <div className="flex items-start gap-2 text-xs text-slate-500">
        <Info className="w-4 h-4 shrink-0 mt-0.5" aria-hidden />
        <span>
          Hạn mức đã đặt được lưu theo nhãn tháng (VD &ldquo;T10/2026&rdquo;) nên không mất khi đổi ngày; chỉ khoảng ngày tính số liệu thay đổi. Giao dịch
          và lịch sử theo ngày không bị ảnh hưởng.
        </span>
      </div>

      <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
        {!dirty && (
          <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700">
            <CircleCheck className="w-4 h-4" aria-hidden /> Đang áp dụng: {initial === 1 ? 'tháng lịch (ngày 1)' : `ngày ${initial} hàng tháng`}
          </span>
        )}
        <div className="ml-auto flex gap-2">
          <button type="button" className="fin-btn fin-btn-outline" disabled={!dirty || saving} onClick={() => setDay(initial)}>
            Hoàn tác
          </button>
          <button type="button" className="fin-btn fin-btn-primary" disabled={!dirty || saving} onClick={save}>
            <Save className="w-4 h-4" aria-hidden /> {saving ? 'Đang lưu…' : 'Lưu cài đặt'}
          </button>
        </div>
      </div>
    </section>
  );
}

// Nguồn dữ liệu email: chỉ lấy giao dịch từ hộp thư kể từ một ngày (dữ liệu các tháng cũ không đầy đủ)
function EmailStartCard({ initial }: { initial: string | null }) {
  const qc = useQueryClient();
  const { data: email } = useEmailStatus();
  const { data: before } = useEmailBeforeStart(!!initial);
  const [date, setDate] = useState(initial ?? '');
  const [saving, setSaving] = useState(false);
  const [rescanning, setRescanning] = useState(false);
  const [purging, setPurging] = useState(false);
  const [confirmPurge, setConfirmPurge] = useState(false);
  const value = date || null;
  const dirty = value !== initial;
  const today = todayVN();

  const refreshEmail = () => {
    qc.invalidateQueries({ queryKey: EMAIL_QUERY_KEYS.STATUS });
    qc.invalidateQueries({ queryKey: EMAIL_QUERY_KEYS.BEFORE_START });
  };

  async function save() {
    setSaving(true);
    try {
      await updateSettings({ emailStartDate: value });
      toast.success(value ? `Chỉ lấy giao dịch email từ ${formatVNDate(value)}` : 'Đã bỏ giới hạn ngày bắt đầu lấy email');
      invalidateFinanceData(qc);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  async function rescan() {
    setRescanning(true);
    try {
      const s = await pollEmailsFromStart();
      toast.success(`Đọc ${s.scanned} thư từ ${formatVNDate(s.startDate ?? initial ?? today)}: ${s.created} giao dịch mới, ${s.merged} gộp, ${s.duplicates} đã có, bỏ qua ${s.beforeStart ?? 0} trước ngày bắt đầu`, { duration: 8000 });
      invalidateFinanceData(qc);
    } catch (e) {
      toast.error(errorMessage(e), { duration: 8000 });
      refreshEmail();
    } finally {
      setRescanning(false);
    }
  }

  async function purge() {
    setPurging(true);
    try {
      const r = await purgeEmailBeforeStart();
      toast.success(`Đã xóa ${r.deleted} giao dịch email trước ${formatVNDate(r.startDate)}`);
      invalidateFinanceData(qc);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setPurging(false);
      setConfirmPurge(false);
    }
  }

  return (
    <section className="fin-card p-5 md:p-6 flex flex-col gap-5">
      <div className="flex items-start gap-3">
        <span className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
          <MailSearch className="w-5 h-5" aria-hidden />
        </span>
        <div>
          <h2 className="text-[16px] font-semibold text-slate-900">Ngày bắt đầu lấy dữ liệu từ email</h2>
          <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
            Nếu các tháng trước thiếu email thông báo (đổi máy, mới bật thông báo…), hãy chọn ngày bắt đầu có dữ liệu đầy đủ. Web chỉ ghi nhận giao dịch
            từ email kể từ ngày này; thư cũ hơn bị bỏ qua khi đọc hộp thư.
          </p>
        </div>
      </div>

      {email && !email.configured && (
        <p className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
          <Info className="w-4 h-4 shrink-0 mt-0.5" aria-hidden /> Chưa cấu hình hộp thư (IMAP_USER / IMAP_PASSWORD) nên cài đặt này chưa có tác dụng.
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <span className="fin-label">Lấy giao dịch từ ngày</span>
          <DatePicker mode="date" value={date} onChange={setDate} max={today} clearable placeholder="Không giới hạn" ariaLabel="Ngày bắt đầu lấy dữ liệu email" />
          <span className="text-[11px] text-slate-500">Để trống = không giới hạn (lần đọc đầu lấy 30 ngày gần nhất).</span>
        </div>

        <div className="rounded-xl bg-slate-50 border border-slate-200 p-3.5 flex flex-col gap-2 text-xs text-slate-600">
          <span className="fin-label">Trạng thái</span>
          <p>
            Đang áp dụng: <b className="text-slate-900 fin-num">{initial ? `từ ${formatVNDate(initial)}` : 'không giới hạn'}</b>
          </p>
          {email?.lastRun && (
            <p className="fin-num">
              Lần đọc gần nhất {formatVNDateTime(email.lastRun.at)}: quét {email.lastRun.scanned} thư, thêm {email.lastRun.created}
              {email.lastRun.beforeStart ? `, bỏ qua ${email.lastRun.beforeStart} trước ngày bắt đầu` : ''}.
            </p>
          )}
          {initial && before && (
            <p className="fin-num">
              Giao dịch email trước ngày bắt đầu còn trong hệ thống: <b className={before.count ? 'text-amber-800' : 'text-slate-900'}>{before.count}</b> / {before.total}
            </p>
          )}
        </div>
      </div>

      {initial && email?.configured && (
        <div className="flex flex-col sm:flex-row gap-2">
          <button type="button" className="fin-btn fin-btn-outline text-teal-700" onClick={rescan} disabled={rescanning || dirty}>
            <RefreshCw className={`w-4 h-4 ${rescanning ? 'animate-spin' : ''}`} aria-hidden /> {rescanning ? 'Đang đọc lại…' : `Đọc lại toàn bộ email từ ${formatVNDate(initial)}`}
          </button>
          {before && before.count > 0 && (
            <button type="button" className="fin-btn fin-btn-outline !text-rose-600 hover:!bg-rose-50 hover:!border-rose-200" onClick={() => setConfirmPurge(true)} disabled={purging || dirty}>
              <Trash2 className="w-4 h-4" aria-hidden /> Xóa {before.count} giao dịch email trước ngày này
            </button>
          )}
        </div>
      )}

      <div className="flex items-start gap-2 text-xs text-slate-500">
        <Info className="w-4 h-4 shrink-0 mt-0.5" aria-hidden />
        <span>
          Giao dịch nhập tay, nhập file và email bạn tự dán vào không bị giới hạn bởi ngày này. Việc xóa chỉ áp dụng cho giao dịch đọc từ email và không
          hoàn tác được; khoản nạp quỹ gắn với chúng được giữ lại.
        </span>
      </div>

      <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
        {!dirty && (
          <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700">
            <CircleCheck className="w-4 h-4" aria-hidden /> {initial ? `Chỉ lấy email từ ${formatVNDate(initial)}` : 'Không giới hạn ngày bắt đầu'}
          </span>
        )}
        <div className="ml-auto flex gap-2">
          <button type="button" className="fin-btn fin-btn-outline" disabled={!dirty || saving} onClick={() => setDate(initial ?? '')}>
            Hoàn tác
          </button>
          <button type="button" className="fin-btn fin-btn-primary" disabled={!dirty || saving} onClick={save}>
            <Save className="w-4 h-4" aria-hidden /> {saving ? 'Đang lưu…' : 'Lưu cài đặt'}
          </button>
        </div>
      </div>

      <ConfirmModal
        isOpen={confirmPurge}
        onClose={() => setConfirmPurge(false)}
        onConfirm={purge}
        title="Xóa giao dịch email cũ"
        message={`Xóa ${before?.count ?? 0} giao dịch đọc từ email có ngày trước ${initial ? formatVNDate(initial) : ''}? Thao tác này không hoàn tác được. Giao dịch nhập tay/nhập file được giữ nguyên.`}
        confirmText={purging ? 'Đang xóa…' : 'Xóa'}
      />
    </section>
  );
}

function Effect({ icon: Icon, title, children }: { icon: typeof Target; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 p-3 flex flex-col gap-1.5">
      <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-900">
        <Icon className="w-4 h-4 text-teal-700" aria-hidden /> {title}
      </span>
      <p className="text-xs text-slate-600 leading-relaxed">{children}</p>
    </div>
  );
}
