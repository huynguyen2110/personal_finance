'use client';

import { HeartPulse, Infinity as InfinityIcon, PiggyBank, ShoppingCart, Target, TrendingDown, TrendingUp } from 'lucide-react';
import { formatCompactVND, formatVND } from '@/lib/money';
import type { GoalsOverviewData, HealthFactorKey, HealthLevel } from '../types';
import { CARD, nf } from '../utils/goal-meta';

const pct = (v: number) => `${Math.round(v * 100)}%`;

const LEVEL: Record<HealthLevel, { label: string; badge: string; ring: string }> = {
  excellent: { label: 'Rất tốt', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', ring: '#059669' },
  stable: { label: 'Ổn định', badge: 'bg-teal-50 text-teal-700 border-teal-200', ring: '#0f766e' },
  improve: { label: 'Cần cải thiện', badge: 'bg-amber-100 text-amber-800 border-amber-200', ring: '#f59e0b' },
  alert: { label: 'Báo động', badge: 'bg-rose-50 text-rose-600 border-rose-200', ring: '#cc1e44' },
};

const FACTOR_LABEL: Record<HealthFactorKey, string> = {
  emergency: 'Quỹ khẩn cấp',
  savingsRate: 'Tỷ lệ tiết kiệm 3 tháng',
  discipline: 'Kỷ luật nạp',
  onTrack: 'Mục tiêu đúng lộ trình',
};

function Kpi({ label, icon: Icon, iconClass, children }: { label: string; icon: typeof PiggyBank; iconClass: string; children: React.ReactNode }) {
  return (
    <div className={`${CARD} p-4 flex flex-col gap-2 min-w-0`}>
      <div className="flex items-center justify-between">
        <span className="fin-label">{label}</span>
        <span className={`p-1.5 rounded-lg bg-slate-100 ${iconClass}`}>
          <Icon className="w-4 h-4" aria-hidden />
        </span>
      </div>
      {children}
    </div>
  );
}

function Bar({ value, color, label }: { value: number; color: string; label: string }) {
  return (
    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden" role="progressbar" aria-label={label} aria-valuenow={Math.round(value * 100)} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${Math.min(100, Math.max(0, value * 100))}%`, backgroundColor: color }} />
    </div>
  );
}

// Giá trị hiển thị + lời khuyên ngắn cho từng yếu tố sức khỏe tài chính
function factorText(key: HealthFactorKey, h: GoalsOverviewData['health']): { value: string; hint: string } {
  switch (key) {
    case 'emergency':
      return h.emergencyMonths === null
        ? { value: '—', hint: 'Chưa đủ dữ liệu chi tiêu để tính' }
        : {
            value:
              h.emergencyMonths >= h.emergencyTargetMonths
                ? `~${Math.round(h.emergencyMonths)} tháng ✓`
                : `${h.emergencyMonths.toFixed(1).replace('.', ',')}/${h.emergencyTargetMonths} tháng`,
            hint: h.emergencyMonths >= h.emergencyTargetMonths ? 'Đủ chi tiêu khi có biến cố' : `Nên đủ ${h.emergencyTargetMonths} tháng chi tiêu`,
          };
    case 'savingsRate':
      return h.savingsRate === null
        ? { value: '—', hint: 'Chưa có thu nhập 3 tháng qua' }
        : h.savingsRate < 0
          ? { value: 'Chi vượt thu', hint: `Chi nhiều hơn thu ${pct(-h.savingsRate)} thu nhập` }
          : { value: pct(h.savingsRate), hint: h.savingsRate >= h.goodSavingsRate ? 'Để dành tốt' : `Nên để dành ≥ ${pct(h.goodSavingsRate)} thu nhập` };
    case 'discipline':
      return h.disciplineRatio === null
        ? { value: '—', hint: 'Đặt kế hoạch nạp hàng tháng để chấm' }
        : { value: pct(h.disciplineRatio), hint: 'Thực nạp so với kế hoạch' };
    case 'onTrack':
      return h.onTrack.total
        ? { value: `${h.onTrack.ok}/${h.onTrack.total}`, hint: 'Mục tiêu có hạn đang kịp tiến độ' }
        : { value: '—', hint: 'Chưa có mục tiêu đặt hạn' };
  }
}

const scoreColor = (s: number) => (s >= 0.8 ? '#059669' : s >= 0.5 ? '#0f766e' : s >= 0.3 ? '#f59e0b' : '#cc1e44');

export default function GoalsOverview({ data }: { data: GoalsOverviewData }) {
  const { ongoing, oneTime, statusCounts: sc, health } = data;
  const diff = data.savedThisMonth - data.savedLastMonth;
  const level = health.level ? LEVEL[health.level] : null;
  const oneTimeProgress = oneTime.target > 0 ? oneTime.current / oneTime.target : 0;
  const tracked = sc.on_track + sc.behind + sc.overdue;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-[1fr_1fr_1fr_1.35fr] gap-4">
      {/* Đang tiết kiệm */}
      <Kpi label="Đang tiết kiệm" icon={PiggyBank} iconClass="text-teal-700">
        <p className="text-[28px] leading-9 font-bold tracking-[-0.02em] text-slate-900 fin-num">
          {nf.format(data.totalBalance)} <span className="text-base font-semibold text-slate-500">₫</span>
        </p>
        <div className="flex flex-wrap items-center justify-between gap-1 text-xs text-slate-600 fin-num">
          <span>
            Tháng này: <strong className={data.savedThisMonth >= 0 ? 'text-emerald-700' : 'text-rose-600'}>{data.savedThisMonth >= 0 ? '+' : '−'}{formatVND(Math.abs(data.savedThisMonth))}</strong>
          </span>
          {diff !== 0 && (
            <span className={`inline-flex items-center gap-1 font-semibold ${diff > 0 ? 'text-emerald-700' : 'text-rose-600'}`} title={`Tháng trước: ${formatVND(data.savedLastMonth)}`}>
              {diff > 0 ? <TrendingUp className="w-3.5 h-3.5" aria-hidden /> : <TrendingDown className="w-3.5 h-3.5" aria-hidden />}
              {diff > 0 ? '+' : '−'}{formatCompactVND(Math.abs(diff))} so với tháng trước
            </span>
          )}
        </div>
        <p className="flex items-center gap-1.5 text-[11px] text-slate-500 fin-num">
          <ShoppingCart className="w-3.5 h-3.5 text-violet-600" aria-hidden />
          Đã tiêu từ quỹ: <strong className="text-violet-700">{formatVND(data.totalSpent)}</strong> · Tổng đã tích lũy {formatCompactVND(data.totalSaved)}
        </p>
      </Kpi>

      {/* Quỹ duy trì */}
      <Kpi label="Quỹ duy trì" icon={InfinityIcon} iconClass="text-sky-700">
        <div className="flex items-baseline gap-2 flex-wrap">
          <p className="text-[28px] leading-9 font-bold tracking-[-0.02em] text-slate-900 fin-num">
            {nf.format(ongoing.balance)} <span className="text-base font-semibold text-slate-500">₫</span>
          </p>
          {data.totalBalance > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-sky-50 border border-sky-200 text-sky-700 text-xs font-semibold fin-num">
              {pct(ongoing.share)} tổng tiết kiệm
            </span>
          )}
        </div>
        {ongoing.count ? (
          <>
            <Bar value={ongoing.target ? ongoing.balance / ongoing.target : 0} color="#0284c7" label="Mức đầy của quỹ duy trì" />
            <div className="flex flex-wrap items-center justify-between gap-1 text-xs text-slate-600 fin-num">
              <span>
                {ongoing.count} quỹ · đầy {pct(ongoing.target ? ongoing.balance / ongoing.target : 0)} / {formatCompactVND(ongoing.target)}
              </span>
              <span className={ongoing.refill > 0 ? 'text-amber-700 font-semibold' : 'text-emerald-700 font-semibold'}>
                {ongoing.refill > 0 ? `Cần nạp bù ${formatCompactVND(ongoing.refill)}` : 'Đã đầy'}
              </span>
            </div>
          </>
        ) : (
          <p className="text-xs text-slate-500">Chưa có quỹ duy trì.</p>
        )}
      </Kpi>

      {/* Mục tiêu một lần */}
      <Kpi label="Mục tiêu một lần" icon={Target} iconClass="text-indigo-600">
        <div className="flex items-baseline gap-2">
          <p className="text-[28px] leading-9 font-bold tracking-[-0.02em] text-slate-900 fin-num">{pct(oneTimeProgress)}</p>
          <span className="text-xs text-slate-500 fin-num">
            {formatCompactVND(oneTime.current)} / {formatCompactVND(oneTime.target)}
          </span>
        </div>
        {tracked > 0 ? (
          <div className="flex items-center gap-2">
            <div className="flex flex-1 h-1.5 gap-0.5 rounded-full overflow-hidden" aria-hidden>
              {sc.overdue > 0 && <span className="bg-rose-500" style={{ flex: sc.overdue }} />}
              {sc.behind > 0 && <span className="bg-amber-500" style={{ flex: sc.behind }} />}
              {sc.on_track > 0 && <span className="bg-teal-700" style={{ flex: sc.on_track }} />}
            </div>
          </div>
        ) : (
          <Bar value={oneTimeProgress} color="#4f46e5" label="Tiến độ chung các mục tiêu một lần" />
        )}
        <p className="text-xs text-slate-600 fin-num">
          {oneTime.count} đang tích lũy{oneTime.done ? ` · ${oneTime.done} đã xong` : ''}
          {tracked > 0 && (
            <>
              {' · '}
              <span className="text-teal-700 font-semibold">{sc.on_track} đúng lộ trình</span>
              {sc.behind > 0 && <span className="text-amber-700 font-semibold"> · {sc.behind} chậm</span>}
              {sc.overdue > 0 && <span className="text-rose-600 font-semibold"> · {sc.overdue} quá hạn</span>}
            </>
          )}
        </p>
      </Kpi>

      {/* Sức khỏe tài chính */}
      <Kpi label="Sức khỏe tài chính" icon={HeartPulse} iconClass="text-rose-500">
        {health.score === null || !level ? (
          <p className="text-xs text-slate-500">Chưa đủ dữ liệu để chấm điểm.</p>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <div
                className="relative w-14 h-14 rounded-full shrink-0"
                style={{ background: `conic-gradient(${level.ring} ${health.score * 3.6}deg, #dae2fd 0deg)` }}
                role="img"
                aria-label={`Điểm sức khỏe tài chính ${health.score}/100`}
              >
                <span className="absolute inset-1.5 rounded-full bg-white flex items-center justify-center text-[17px] font-bold text-slate-900 fin-num">
                  {health.score}
                </span>
              </div>
              <div className="min-w-0">
                <span className={`inline-flex px-2 py-0.5 rounded-full border text-xs font-semibold ${level.badge}`}>{level.label}</span>
              </div>
            </div>
            <ul className="flex flex-col gap-1.5 mt-1">
              {health.factors.map((f) => {
                const t = factorText(f.key, health);
                return (
                  <li key={f.key} className="grid grid-cols-[1fr_auto] items-center gap-x-2 gap-y-0.5 text-xs" title={t.hint}>
                    <span className="text-slate-600 truncate">{FACTOR_LABEL[f.key]}</span>
                    <span className={`font-semibold fin-num text-right ${f.score === null ? 'text-slate-400' : 'text-slate-900'}`}>{t.value}</span>
                    <span className="col-span-2">
                      {f.score === null ? (
                        <span className="block text-[11px] text-slate-400">{t.hint}</span>
                      ) : (
                        <Bar value={f.score} color={scoreColor(f.score)} label={FACTOR_LABEL[f.key]} />
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </Kpi>
    </div>
  );
}
