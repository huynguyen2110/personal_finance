'use client';

import { Infinity as InfinityIcon, Maximize2, Network, Pause, Play, Square, Timer } from 'lucide-react';
import { useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { cn } from '@/modules/mindmap/lib/utils';
import { Todo } from '../api';
import { useUpdateTodo } from '../hooks';
import { FlipClockOverlay } from './FlipClock';

/** focus / short / long = đếm ngược; free = đếm lên không giới hạn (dừng thì ghi nhận). */
type Mode = 'focus' | 'short' | 'long' | 'free';
type TimedMode = Exclude<Mode, 'free'>;
// Thời lượng mặc định; phiên Focus chọn được (nhớ trong trình duyệt), nghỉ ngắn / dài cố định
const MINUTES: Record<TimedMode, number> = { focus: 25, short: 5, long: 15 };
const FOCUS_PRESETS = [15, 25, 45, 60, 90];
const FOCUS_MAX = 180;
const FOCUS_STORAGE_KEY = 'pf_focus_minutes';
const MODE_LABELS: Record<Exclude<Mode, 'focus'>, string> = {
  short: 'Nghỉ ngắn (5p)',
  long: 'Nghỉ dài (15p)',
  free: 'Vô hạn',
};
const SHORT_LABELS: Record<Exclude<Mode, 'focus'>, string> = {
  short: 'Nghỉ 5p',
  long: 'Nghỉ 15p',
  free: 'Vô hạn',
};
const CIRCUMFERENCE = 2 * Math.PI * 44;

const pad = (n: number) => String(n).padStart(2, '0');
/** 1505 → "25:05"; 3725 → "1:02:05" */
export function formatClock(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

/**
 * Thời lượng Focus đã chọn lần trước (mặc định 25p). Đọc ngay khi khởi tạo: khung Pomodoro chỉ render ở
 * trình duyệt (sau khi tải xong bản đồ) nên không lệch với HTML từ server; bị chặn lưu trữ → 25p.
 */
function readSavedFocus(): number {
  try {
    const saved = Number(localStorage.getItem(FOCUS_STORAGE_KEY));
    return Number.isInteger(saved) && saved >= 1 && saved <= FOCUS_MAX ? saved : MINUTES.focus;
  } catch {
    return MINUTES.focus;
  }
}

/** Hàng chọn thời lượng Focus: các mốc hay dùng + ô tự nhập số phút (Enter / rời ô để áp dụng). */
function FocusDurationPicker({ value, onChange }: { value: number; onChange: (minutes: number) => void }) {
  const custom = !FOCUS_PRESETS.includes(value);
  const [draft, setDraft] = useState(custom ? String(value) : '');
  // Đồng bộ ô tự nhập khi giá trị đổi từ nơi khác (VD nạp từ trình duyệt); điều chỉnh ngay khi render
  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    setDraft(FOCUS_PRESETS.includes(value) ? '' : String(value));
  }
  const commit = () => {
    const n = Number(draft);
    if (draft.trim() && Number.isFinite(n) && n >= 1) onChange(n);
    else setDraft(custom ? String(value) : '');
  };

  return (
    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-500">
      <span className="shrink-0">Thời lượng:</span>
      <div className="flex min-w-0 flex-1 items-center gap-1">
        {FOCUS_PRESETS.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => onChange(m)}
            className={cn(
              'flex-1 rounded-lg px-1 py-1 whitespace-nowrap transition',
              value === m ? 'bg-violet-600 text-white shadow-sm' : 'bg-[#f2f3ff] hover:bg-[#eaedff] hover:text-gray-900',
            )}
          >
            {m}p
          </button>
        ))}
        <label
          className={cn(
            'flex w-16 shrink-0 items-center rounded-lg px-1.5 py-1 transition focus-within:ring-2 focus-within:ring-violet-300',
            custom ? 'bg-violet-600 text-white' : 'bg-[#f2f3ff]',
          )}
          title={`Tự nhập (1–${FOCUS_MAX} phút)`}
        >
          <input
            type="number"
            min={1}
            max={FOCUS_MAX}
            value={draft}
            placeholder="Khác"
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
            className={cn(
              'w-full [appearance:textfield] bg-transparent text-right outline-none [&::-webkit-inner-spin-button]:appearance-none',
              custom ? 'placeholder:text-violet-200' : 'text-gray-900 placeholder:text-gray-400',
            )}
          />
          <span className="ml-0.5">p</span>
        </label>
      </div>
    </div>
  );
}

export interface FocusTimerHandle {
  /** Đang có phiên Focus / Vô hạn đã bắt đầu (đang chạy hoặc tạm dừng giữa chừng). */
  isActive: () => boolean;
  /** Số phút đã tập trung của phiên hiện tại. */
  elapsedMinutes: () => number;
  /** Kết thúc phiên hiện tại và ghi nhận số phút vào việc đang tập trung. */
  stopAndLog: () => void;
}

/**
 * Pomodoro: phiên Focus (mặc định 25 phút, chọn được 1–180), nghỉ ngắn 5, nghỉ dài 15, hoặc "Vô hạn" (đếm lên tới khi bấm dừng).
 * Hết phiên Focus / bấm "Kết thúc & ghi nhận" thì cộng số phút đã tập trung vào todo đang chọn →
 * thời gian tự tích lũy vào nhánh trên bản đồ.
 * `startToken` đổi = bắt đầu phiên mới cho việc vừa bấm đồng hồ (giữ chế độ Vô hạn nếu đang chọn).
 */
export function FocusTimer({
  target,
  startToken,
  ref,
}: {
  target: Todo | null;
  startToken: number;
  ref?: React.Ref<FocusTimerHandle>;
}) {
  const updateTodo = useUpdateTodo();
  const [mode, setMode] = useState<Mode>('focus');
  const [focusMinutes, setFocusMinutes] = useState(readSavedFocus);
  const [remaining, setRemaining] = useState(() => readSavedFocus() * 60);
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [big, setBig] = useState(false);
  const closeBig = useCallback(() => setBig(false), []);
  const endAtRef = useRef(0); // đếm ngược: thời điểm kết thúc
  const startedAtRef = useRef(0); // vô hạn: thời điểm chạy lại gần nhất
  const accumulatedRef = useRef(0); // vô hạn: số giây đã đếm trước lần chạy lại gần nhất
  const targetRef = useRef(target);
  useEffect(() => {
    targetRef.current = target;
  }, [target]);

  /** Số phút của một chế độ đếm ngược (Focus theo lựa chọn của người dùng). */
  const minutesOf = (m: TimedMode) => (m === 'focus' ? focusMinutes : MINUTES[m]);
  const free = mode === 'free';
  const total = free ? 0 : minutesOf(mode) * 60;
  const seconds = free ? elapsed : remaining;
  const started = free ? elapsed > 0 : remaining < total;

  const logMinutes = useCallback(
    (minutes: number) => {
      const t = targetRef.current;
      if (!t || minutes <= 0) return;
      updateTodo.mutate({
        id: t.id,
        durationMinutes: Math.min(1440, (t.durationMinutes ?? 0) + minutes),
      });
      setNotice(`Đã cộng ${minutes} phút vào “${t.title}”`);
    },
    [updateTodo],
  );

  const reset = (next: Mode) => {
    setRunning(false);
    setMode(next);
    accumulatedRef.current = 0;
    setElapsed(0);
    setRemaining(next === 'free' ? 0 : minutesOf(next) * 60);
  };

  /** Chọn thời lượng Focus (chỉ khi phiên chưa bắt đầu) và nhớ cho lần sau. */
  const chooseFocus = (minutes: number) => {
    const m = Math.min(FOCUS_MAX, Math.max(1, Math.round(minutes)));
    setFocusMinutes(m);
    if (mode === 'focus' && !running) setRemaining(m * 60);
    try {
      localStorage.setItem(FOCUS_STORAGE_KEY, String(m));
    } catch {
      /* bỏ qua */
    }
  };

  // Tính theo mốc thời gian (không cộng dồn setInterval) để không lệch khi tab bị tạm dừng
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      if (mode === 'free') {
        setElapsed(accumulatedRef.current + Math.floor((Date.now() - startedAtRef.current) / 1000));
        return;
      }
      const left = Math.max(0, Math.round((endAtRef.current - Date.now()) / 1000));
      setRemaining(left);
      if (left === 0) {
        setRunning(false);
        if (mode === 'focus') {
          logMinutes(focusMinutes);
          setMode('short');
          setRemaining(MINUTES.short * 60);
        } else {
          setNotice('Hết giờ nghỉ — sẵn sàng phiên Focus tiếp theo');
          setMode('focus');
          setRemaining(focusMinutes * 60);
        }
      }
    }, 500);
    return () => clearInterval(id);
  }, [running, mode, logMinutes, focusMinutes]);

  /** Chạy (hoặc chạy tiếp) — đếm ngược từ `fromSeconds`, hoặc đếm lên tiếp từ số đã tích lũy. */
  const start = useCallback((countUp: boolean, fromSeconds: number) => {
    if (countUp) startedAtRef.current = Date.now();
    else endAtRef.current = Date.now() + fromSeconds * 1000;
    setRunning(true);
    setNotice(null);
  }, []);

  // Bấm đồng hồ trên một việc → bắt đầu phiên mới cho việc đó (Vô hạn nếu đang ở chế độ đó, không thì Focus theo thời lượng đã chọn)
  const modeRef = useRef(mode);
  const focusMinutesRef = useRef(focusMinutes);
  useEffect(() => {
    modeRef.current = mode;
    focusMinutesRef.current = focusMinutes;
  }, [mode, focusMinutes]);
  const lastToken = useRef(startToken);
  useEffect(() => {
    if (startToken === lastToken.current) return;
    lastToken.current = startToken;
    accumulatedRef.current = 0;
    setElapsed(0);
    if (modeRef.current === 'free') {
      start(true, 0);
    } else {
      setMode('focus');
      setRemaining(focusMinutesRef.current * 60);
      start(false, focusMinutesRef.current * 60);
    }
  }, [startToken, start]);

  // Vô hạn: số giây chính xác tại lúc bấm (state `elapsed` chỉ cập nhật mỗi 0,5 giây)
  const freeNow = () =>
    running
      ? accumulatedRef.current + Math.floor((Date.now() - startedAtRef.current) / 1000)
      : accumulatedRef.current;

  const toggle = () => {
    if (running) {
      if (free) {
        accumulatedRef.current = freeNow();
        setElapsed(accumulatedRef.current);
      }
      setRunning(false);
    } else {
      start(free, remaining);
    }
  };

  // Số giây đã tập trung của phiên Focus đếm ngược (chính xác tại lúc gọi)
  const focusElapsed = () =>
    total - (running ? Math.max(0, Math.round((endAtRef.current - Date.now()) / 1000)) : remaining);
  const elapsedMinutes = () =>
    free ? Math.floor(freeNow() / 60) : mode === 'focus' ? Math.floor(focusElapsed() / 60) : 0;

  const stopAndLog = () => {
    logMinutes(elapsedMinutes());
    reset(free ? 'free' : 'focus');
  };

  useImperativeHandle(ref, () => ({
    isActive: () => (free || mode === 'focus') && (running || started),
    elapsedMinutes,
    stopAndLog,
  }));

  const label = running
    ? free
      ? 'Đang đếm — không giới hạn'
      : mode === 'focus'
        ? 'Đang tập trung'
        : 'Đang nghỉ'
    : started
      ? 'Đã tạm dừng'
      : 'Sẵn sàng kích hoạt';

  // Vô hạn: vòng chạy hết một vòng mỗi 60 phút
  const progress = free ? (elapsed % 3600) / 3600 : 1 - remaining / total;
  const ringColor = mode === 'focus' || free ? '#630ed4' : '#006a61';

  return (
    <div className="relative flex flex-col items-center overflow-hidden rounded-xl bg-white p-6 text-center shadow-sm">
      <div className="mb-3 flex w-full items-center justify-between">
        <span className="flex min-w-0 items-center gap-1.5 font-semibold whitespace-nowrap text-violet-700">
          <Timer size={19} className="shrink-0" /> Chế độ tập trung
        </span>
        <span className="flex items-center gap-1.5">
          <span className="rounded-md bg-violet-600 px-1.5 py-0.5 text-[11px] font-semibold text-white">
            {free ? 'Vô hạn' : 'Pomodoro'}
          </span>
          <button
            type="button"
            onClick={() => setBig(true)}
            title="Toàn màn hình (đồng hồ lật)"
            className="rounded-lg p-1 text-gray-500 transition hover:bg-[#eaedff] hover:text-violet-700"
          >
            <Maximize2 size={16} />
          </button>
        </span>
      </div>

      <p className="min-h-[18px] w-full truncate text-[13px] text-gray-500" title={target?.title}>
        {target ? (
          <>
            Đang tập trung: <b className="text-gray-900">{target.title}</b>
          </>
        ) : (
          'Bấm đồng hồ ở một việc để gắn phiên Focus cho việc đó'
        )}
      </p>

      <div className="relative my-4 flex h-52 w-52 items-center justify-center">
        <div className={cn('absolute inset-0 rounded-full bg-violet-600/5', running && 'animate-pulse')} />
        <svg className="h-52 w-52 -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="44" fill="transparent" stroke="#eaedff" strokeWidth="6" />
          <circle
            cx="50"
            cy="50"
            r="44"
            fill="transparent"
            stroke={ringColor}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={CIRCUMFERENCE * (1 - progress)}
            className="transition-[stroke-dashoffset] duration-500"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className={cn(
              'leading-tight font-bold tracking-tighter text-gray-900 tabular-nums',
              seconds >= 3600 ? 'text-[34px]' : 'text-[40px]',
            )}
          >
            {formatClock(seconds)}
          </span>
          <span className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-gray-500">
            <span className={cn('h-2 w-2 rounded-full bg-violet-600', running && 'animate-ping')} />
            {label}
          </span>
        </div>
      </div>

      <div className="flex w-full flex-col gap-2">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={toggle}
            className={cn(
              'flex flex-1 items-center justify-center gap-2 rounded-xl py-3 font-semibold text-white shadow-md transition',
              running ? 'bg-amber-700 hover:bg-amber-800' : 'bg-violet-700 hover:bg-violet-800',
            )}
          >
            {running ? <Pause size={19} /> : free && !started ? <InfinityIcon size={19} /> : <Play size={19} />}
            {running
              ? 'Tạm dừng'
              : started
                ? 'Tiếp tục'
                : free
                  ? 'Bắt đầu đếm (không giới hạn)'
                  : mode === 'focus'
                    ? `Bắt đầu Focus (${focusMinutes}p)`
                    : `Bắt đầu nghỉ (${MINUTES[mode]}p)`}
          </button>
          {started && (
            <button
              type="button"
              onClick={stopAndLog}
              title={free || mode === 'focus' ? 'Kết thúc & ghi nhận số phút đã tập trung' : 'Bỏ giờ nghỉ'}
              className="flex items-center justify-center rounded-xl bg-[#f2f3ff] px-3 text-gray-700 transition hover:bg-[#eaedff]"
            >
              <Square size={17} />
            </button>
          )}
        </div>
        {/* Chọn chế độ: thanh 4 ô đều nhau (không xuống dòng ở cột hẹp) */}
        <div className="grid grid-cols-4 gap-1 rounded-xl bg-[#f2f3ff] p-1 text-[11px] font-semibold">
          {(['focus', 'short', 'long', 'free'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => reset(m)}
              title={m === 'focus' ? `Focus (${focusMinutes}p)` : MODE_LABELS[m]}
              className={cn(
                'flex items-center justify-center gap-0.5 rounded-lg px-1 py-1.5 whitespace-nowrap transition',
                mode === m ? 'bg-white text-violet-700 shadow-sm' : 'text-gray-500 hover:text-gray-900',
              )}
            >
              {m === 'free' && <InfinityIcon size={13} />}
              {m === 'focus' ? `Focus ${focusMinutes}p` : SHORT_LABELS[m]}
            </button>
          ))}
        </div>
        {/* Thời lượng phiên Focus: chọn nhanh hoặc tự nhập (chỉ khi phiên chưa bắt đầu) */}
        {mode === 'focus' && !running && !started && (
          <FocusDurationPicker value={focusMinutes} onChange={chooseFocus} />
        )}
      </div>

      {big && (
        <FlipClockOverlay
          seconds={seconds}
          running={running}
          modeLabel={free ? 'Vô hạn' : mode === 'focus' ? 'Focus' : mode === 'short' ? 'Nghỉ ngắn' : 'Nghỉ dài'}
          targetTitle={mode === 'focus' || free ? (target?.title ?? null) : null}
          canStop={started}
          onToggle={toggle}
          onStop={stopAndLog}
          onClose={closeBig}
        />
      )}

      {notice && (
        <p className="mt-3 w-full rounded-lg bg-teal-50 px-2 py-1.5 text-xs font-semibold text-teal-800">{notice}</p>
      )}
      <div className="mt-4 flex w-full items-start gap-1.5 rounded-xl bg-[#f2f3ff] p-2 text-left text-[13px] text-gray-500">
        <Network size={17} className="mt-0.5 shrink-0 text-violet-600" />
        <span>
          Thời gian tập trung được cộng vào todo, và tự tích lũy vào nhánh tương ứng trên{' '}
          <b className="text-gray-900">Bản đồ năng lực</b>.
        </span>
      </div>
    </div>
  );
}
