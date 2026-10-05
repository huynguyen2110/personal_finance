'use client';

import { Network, Pause, Play, Square, Timer } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/modules/mindmap/lib/utils';
import { Todo } from '../api';
import { useUpdateTodo } from '../hooks';

type Mode = 'focus' | 'short' | 'long';
const MINUTES: Record<Mode, number> = { focus: 25, short: 5, long: 15 };
const CIRCUMFERENCE = 2 * Math.PI * 44;

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * Pomodoro: phiên Focus 25 phút, nghỉ ngắn 5, nghỉ dài 15. Hết phiên Focus (hoặc bấm "Kết thúc & ghi nhận")
 * thì cộng số phút đã tập trung vào todo đang chọn → thời gian tự tích lũy vào nhánh trên bản đồ.
 * `startToken` đổi = bắt đầu phiên Focus mới (bấm nút đồng hồ trên một việc).
 */
export function FocusTimer({
  target,
  startToken,
}: {
  target: Todo | null;
  startToken: number;
}) {
  const updateTodo = useUpdateTodo();
  const [mode, setMode] = useState<Mode>('focus');
  const [remaining, setRemaining] = useState(MINUTES.focus * 60);
  const [running, setRunning] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const endAtRef = useRef(0);
  const targetRef = useRef(target);
  useEffect(() => {
    targetRef.current = target;
  }, [target]);

  const total = MINUTES[mode] * 60;

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
    setRemaining(MINUTES[next] * 60);
  };

  // Đếm theo mốc kết thúc (không cộng dồn setInterval) để không lệch khi tab bị tạm dừng
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      const left = Math.max(0, Math.round((endAtRef.current - Date.now()) / 1000));
      setRemaining(left);
      if (left === 0) {
        setRunning(false);
        if (mode === 'focus') {
          logMinutes(MINUTES.focus);
          setMode('short');
          setRemaining(MINUTES.short * 60);
        } else {
          setNotice('Hết giờ nghỉ — sẵn sàng phiên Focus tiếp theo');
          setMode('focus');
          setRemaining(MINUTES.focus * 60);
        }
      }
    }, 500);
    return () => clearInterval(id);
  }, [running, mode, logMinutes]);

  const start = useCallback((seconds: number) => {
    endAtRef.current = Date.now() + seconds * 1000;
    setRunning(true);
    setNotice(null);
  }, []);

  // Bấm đồng hồ trên một việc → bắt đầu phiên Focus mới cho việc đó
  const lastToken = useRef(startToken);
  useEffect(() => {
    if (startToken === lastToken.current) return;
    lastToken.current = startToken;
    setMode('focus');
    setRemaining(MINUTES.focus * 60);
    start(MINUTES.focus * 60);
  }, [startToken, start]);

  const toggle = () => {
    if (running) setRunning(false);
    else start(remaining);
  };

  const stopAndLog = () => {
    if (mode === 'focus') logMinutes(Math.floor((total - remaining) / 60));
    reset('focus');
  };

  const label = running
    ? mode === 'focus'
      ? 'Đang tập trung'
      : 'Đang nghỉ'
    : remaining < total
      ? 'Đã tạm dừng'
      : 'Sẵn sàng kích hoạt';

  return (
    <div className="relative flex flex-col items-center overflow-hidden rounded-xl bg-white p-6 text-center shadow-sm">
      <div className="mb-3 flex w-full items-center justify-between">
        <span className="flex items-center gap-1.5 font-semibold text-violet-700">
          <Timer size={19} /> Chế độ tập trung
        </span>
        <span className="rounded-md bg-violet-600 px-1.5 py-0.5 text-[11px] font-semibold text-white">
          Pomodoro
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
            stroke={mode === 'focus' ? '#630ed4' : '#006a61'}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={CIRCUMFERENCE * (1 - remaining / total)}
            className="transition-[stroke-dashoffset] duration-500"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[40px] leading-tight font-bold tracking-tighter text-gray-900 tabular-nums">
            {pad(Math.floor(remaining / 60))}:{pad(remaining % 60)}
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
            {running ? <Pause size={19} /> : <Play size={19} />}
            {running
              ? 'Tạm dừng'
              : remaining < total
                ? 'Tiếp tục'
                : mode === 'focus'
                  ? `Bắt đầu Focus (${MINUTES.focus}p)`
                  : `Bắt đầu nghỉ (${MINUTES[mode]}p)`}
          </button>
          {remaining < total && (
            <button
              type="button"
              onClick={stopAndLog}
              title={mode === 'focus' ? 'Kết thúc & ghi nhận số phút đã tập trung' : 'Bỏ giờ nghỉ'}
              className="flex items-center justify-center rounded-xl bg-[#f2f3ff] px-3 text-gray-700 transition hover:bg-[#eaedff]"
            >
              <Square size={17} />
            </button>
          )}
        </div>
        <div className="flex items-center justify-center gap-3 text-[11px] font-semibold text-gray-500">
          {(['focus', 'short', 'long'] as const).map((m, i) => (
            <span key={m} className="flex items-center gap-3">
              {i > 0 && <span>•</span>}
              <button
                type="button"
                onClick={() => reset(m)}
                className={cn('transition hover:text-violet-700', mode === m && 'text-violet-700')}
              >
                {m === 'focus' ? 'Focus (25p)' : m === 'short' ? 'Nghỉ ngắn (5p)' : 'Nghỉ dài (15p)'}
              </button>
            </span>
          ))}
        </div>
      </div>

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
