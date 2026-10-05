'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, CalendarRange, ChevronRight, CircleCheck, Info, MailSearch, RefreshCw, Save, Trash2 } from 'lucide-react';
import Header from '@/components/layout/Header';
import DatePicker from '@/components/shared/DatePicker';
import TreeSelect from '@/components/shared/TreeSelect';
import ConfirmModal from '@/components/shared/ConfirmModal';
import { errorMessage } from '@/lib/api-client';
import { invalidateFinanceData } from '@/lib/query-client';
import { addMonths, currentMonthVN, formatMonthLabel, formatMonthRange, formatVNDate, formatVNDateTime, MAX_MONTH_START_DAY, MIN_MONTH_START_DAY, monthRange, todayVN } from '@/lib/dates';
import { EMAIL_QUERY_KEYS, pollEmailsFromStart, purgeEmailBeforeStart, useEmailBeforeStart, useEmailStatus } from '@/modules/finance/email/lib';
import { updateSettings, useSettings } from '../lib';

export default function SettingsPage() {
  const { data, isLoading } = useSettings();
  return (
    <div className="font-jakarta">
      <Header title="Cài đặt" subtitle="Tùy chỉnh cách ứng dụng tính toán và hiển thị" />
      <div className="px-4 md:px-6 pb-8 grid grid-cols-1 xl:grid-cols-[272px_minmax(0,1fr)] gap-4 md:gap-6 items-start">
        <SettingsNav
          items={[
            {
              href: '#month-start',
              icon: CalendarRange,
              tone: 'bg-teal-50 text-teal-700',
              title: 'Ngày bắt đầu tháng',
              status: data ? (data.monthStartDay === 1 ? 'Tháng lịch (ngày 1)' : `Ngày ${data.monthStartDay} hàng tháng`) : '…',
            },
            {
              href: '#email-start',
              icon: MailSearch,
              tone: 'bg-emerald-50 text-emerald-700',
              title: 'Dữ liệu từ email',
              status: data ? (data.emailStartDate ? `Từ ${formatVNDate(data.emailStartDate)}` : 'Không giới hạn') : '…',
            },
            {
              href: '#email-direction',
              icon: ArrowLeftRight,
              tone: 'bg-sky-50 text-sky-700',
              title: 'Loại email giao dịch',
              status: data ? (data.emailIncoming ? 'Cả tiền đến và tiền đi' : 'Chỉ tiền đi') : '…',
            },
          ]}
        />
        <div className="flex flex-col gap-4 md:gap-6 max-w-5xl min-w-0">
          {isLoading || !data ? (
            <div className="fin-card h-64 animate-pulse" />
          ) : (
            <>
              <MonthStartCard key={`m-${data.monthStartDay}`} initial={data.monthStartDay} />
              <EmailStartCard key={`e-${data.emailStartDate ?? ''}`} initial={data.emailStartDate} />
              <EmailDirectionCard key={`d-${data.emailIncoming}`} initial={data.emailIncoming} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

interface NavItem {
  href: string;
  icon: typeof CalendarRange;
  tone: string;
  title: string;
  status: string;
}

// Cột trái: danh sách mục cài đặt kèm giá trị đang áp dụng, dính khi cuộn trên màn rộng
function SettingsNav({ items }: { items: NavItem[] }) {
  return (
    <aside className="xl:sticky xl:top-20 flex flex-col gap-3">
      <nav className="fin-card p-2 flex xl:flex-col gap-1 overflow-x-auto" aria-label="Mục cài đặt">
        {items.map((it) => (
          <a
            key={it.href}
            href={it.href}
            className="group flex items-center gap-3 rounded-xl px-3 py-2.5 min-w-[220px] xl:min-w-0 hover:bg-slate-50 transition-colors"
          >
            <span className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${it.tone}`}>
              <it.icon className="w-4 h-4" aria-hidden />
            </span>
            <span className="flex flex-col min-w-0 flex-1">
              <span className="text-sm font-semibold text-slate-900 truncate">{it.title}</span>
              <span className="text-[11px] text-slate-500 truncate fin-num">{it.status}</span>
            </span>
            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 shrink-0 hidden xl:block" aria-hidden />
          </a>
        ))}
      </nav>
    </aside>
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
    <section id="month-start" className="fin-card p-5 md:p-6 flex flex-col gap-5 scroll-mt-20">
      <div className="flex items-start gap-3">
        <span className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
          <CalendarRange className="w-5 h-5" aria-hidden />
        </span>
        <div>
          <h2 className="text-[16px] font-semibold text-slate-900">Ngày bắt đầu tháng</h2>
          <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
            Ngân sách, thống kê và kế hoạch nạp quỹ tính theo chu kỳ bắt đầu từ ngày này.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] gap-4">
        <div className="flex flex-col gap-1.5">
          <span className="fin-label">Tháng bắt đầu từ ngày</span>
          <TreeSelect<number>
            ariaLabel="Tháng bắt đầu từ ngày"
            className="!rounded-lg !bg-slate-50 hover:!bg-white fin-num"
            options={Array.from({ length: MAX_MONTH_START_DAY - MIN_MONTH_START_DAY + 1 }, (_, i) => i + MIN_MONTH_START_DAY).map((d) => ({
              value: d,
              label: d === 1 ? 'Ngày 1 — tháng lịch thông thường' : `Ngày ${d} hàng tháng`,
              group: d === 1 ? undefined : 'Theo ngày lương',
            }))}
            value={day}
            onChange={(v) => v && setDay(v)}
          />
        </div>

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
    <section id="email-start" className="fin-card p-5 md:p-6 flex flex-col gap-5 scroll-mt-20">
      <div className="flex items-start gap-3">
        <span className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
          <MailSearch className="w-5 h-5" aria-hidden />
        </span>
        <div>
          <h2 className="text-[16px] font-semibold text-slate-900">Ngày bắt đầu lấy dữ liệu từ email</h2>
          <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
            Chỉ ghi nhận giao dịch từ email kể từ ngày này; thư cũ hơn bị bỏ qua.
          </p>
        </div>
      </div>

      {email && !email.configured && (
        <p className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
          <Info className="w-4 h-4 shrink-0 mt-0.5" aria-hidden /> Chưa cấu hình hộp thư (IMAP_USER / IMAP_PASSWORD) nên cài đặt này chưa có tác dụng.
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] gap-4">
        <div className="flex flex-col gap-1.5">
          <span className="fin-label">Lấy giao dịch từ ngày</span>
          <DatePicker mode="date" value={date} onChange={setDate} max={today} clearable placeholder="Không giới hạn" ariaLabel="Ngày bắt đầu lấy dữ liệu email" />
          <span className="text-[11px] text-slate-500">Để trống = không giới hạn.</span>
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

// Loại email giao dịch: lấy cả email tiền đến, hay chỉ email tiền đi (chi tiêu)
function EmailDirectionCard({ initial }: { initial: boolean }) {
  const qc = useQueryClient();
  const { data: email } = useEmailStatus();
  const [incoming, setIncoming] = useState(initial);
  const [saving, setSaving] = useState(false);
  const dirty = incoming !== initial;
  // Ngân hàng có gửi email báo tiền đến (chỉ những ngân hàng này chịu ảnh hưởng)
  const inBanks = email?.providers.filter((p) => p.covers.in).map((p) => p.bankName) ?? [];

  async function save() {
    setSaving(true);
    try {
      await updateSettings({ emailIncoming: incoming });
      toast.success(incoming ? 'Sẽ lấy cả email tiền đến và tiền đi' : 'Từ giờ chỉ lấy email tiền đi');
      qc.invalidateQueries({ queryKey: EMAIL_QUERY_KEYS.STATUS });
      invalidateFinanceData(qc);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  const options = [
    { value: true, title: 'Cả tiền đến và tiền đi', desc: 'Ghi nhận mọi giao dịch có email báo: lương, tiền được chuyển đến, chi tiêu…', Icon: ArrowLeftRight },
    { value: false, title: 'Chỉ tiền đi', desc: 'Bỏ qua email báo tiền đến. Thu nhập tự tính = hạn mức ngân sách + tiền đã nạp vào các quỹ tiết kiệm trong tháng; không theo dõi số dư tài khoản.', Icon: ArrowUpRight },
  ] as const;

  return (
    <section id="email-direction" className="fin-card p-5 md:p-6 flex flex-col gap-5 scroll-mt-20">
      <div className="flex items-start gap-3">
        <span className="w-10 h-10 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center shrink-0">
          <ArrowLeftRight className="w-5 h-5" aria-hidden />
        </span>
        <div>
          <h2 className="text-[16px] font-semibold text-slate-900">Loại email giao dịch</h2>
          <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">Chọn có ghi nhận email báo tiền đến hay chỉ lấy email tiền đi.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" role="radiogroup" aria-label="Loại email giao dịch">
        {options.map((o) => {
          const active = incoming === o.value;
          return (
            <button
              key={String(o.value)}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setIncoming(o.value)}
              className={`flex items-start gap-2.5 p-3 rounded-xl text-left transition-colors ${active ? 'border-2 border-teal-700 bg-teal-50' : 'border border-slate-200 hover:bg-slate-50'}`}
            >
              <o.Icon className={`w-5 h-5 shrink-0 mt-0.5 ${active ? 'text-teal-700' : 'text-slate-400'}`} aria-hidden />
              <span>
                <span className={`block text-[13px] font-semibold ${active ? 'text-teal-800' : 'text-slate-800'}`}>{o.title}</span>
                <span className="block text-xs text-slate-500 mt-0.5 leading-snug">{o.desc}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="rounded-xl bg-slate-50 border border-slate-200 p-3.5 flex flex-col gap-1.5 text-xs text-slate-600">
        <p className="flex items-start gap-2">
          <ArrowDownLeft className="w-4 h-4 shrink-0 text-slate-400" aria-hidden />
          <span>
            {inBanks.length ? (
              <>
                Ngân hàng có email báo tiền đến: <b className="text-slate-900">{inBanks.join(', ')}</b>.
              </>
            ) : (
              'Chưa có ngân hàng nào gửi email báo tiền đến.'
            )}{' '}
            Thay đổi chỉ áp dụng cho các lần đọc email sau; giao dịch đã ghi nhận được giữ nguyên.
          </span>
        </p>
        {email?.lastRun?.ignoredIncoming ? (
          <p className="fin-num pl-6">
            Lần đọc gần nhất {formatVNDateTime(email.lastRun.at)} đã bỏ qua <b className="text-slate-900">{email.lastRun.ignoredIncoming}</b> email tiền đến.
          </p>
        ) : null}
      </div>

      <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
        {!dirty && (
          <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700">
            <CircleCheck className="w-4 h-4" aria-hidden /> Đang áp dụng: {initial ? 'cả tiền đến và tiền đi' : 'chỉ tiền đi'}
          </span>
        )}
        <div className="ml-auto flex gap-2">
          <button type="button" className="fin-btn fin-btn-outline" disabled={!dirty || saving} onClick={() => setIncoming(initial)}>
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
