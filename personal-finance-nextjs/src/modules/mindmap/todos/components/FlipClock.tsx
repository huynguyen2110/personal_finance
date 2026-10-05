'use client';

import { Minimize2, Pause, Play, Square } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/modules/mindmap/lib/utils';

/** Một ô số của đồng hồ lật; đổi giá trị → nửa trên lật xuống, nửa dưới lật lên (CSS trong mindmap.css). */
function FlipCard({ value }: { value: string }) {
  // Giữ số trước đó để vẽ hai nửa đang lật; điều chỉnh state ngay khi render (không cần effect)
  const [shown, setShown] = useState({ cur: value, prev: value, key: 0 });
  if (value !== shown.cur) setShown({ cur: value, prev: shown.cur, key: shown.key + 1 });
  const { cur, prev, key } = shown;

  return (
    <div
      className="flip-card shrink-0 rounded-[0.08em] shadow-[0_20px_60px_rgba(0,0,0,0.6)]"
      style={{ width: 'var(--flip-w)', height: 'calc(var(--flip-w) * 0.86)' }}
    >
      {/* Tĩnh: nửa trên = số mới, nửa dưới = số cũ (bị nửa lật lên che khi lật xong) */}
      <div className="flip-half flip-top">
        <span>{cur}</span>
      </div>
      <div className="flip-half flip-bottom">
        <span>{key === 0 ? cur : prev}</span>
      </div>
      {key > 0 && (
        <>
          <div key={`t${key}`} className="flip-half flip-top flipping">
            <span>{prev}</span>
          </div>
          <div key={`b${key}`} className="flip-half flip-bottom flipping">
            <span>{cur}</span>
          </div>
        </>
      )}
      {/* Khe giữa + 2 chốt hai bên như đồng hồ lật thật */}
      <div className="pointer-events-none absolute inset-x-0 top-1/2 z-10 h-[0.035em] -translate-y-1/2 bg-black/80" />
      <div className="pointer-events-none absolute top-1/2 -left-[0.04em] z-10 h-[0.16em] w-[0.08em] -translate-y-1/2 rounded-sm bg-[#0a0a0b]" />
      <div className="pointer-events-none absolute top-1/2 -right-[0.04em] z-10 h-[0.16em] w-[0.08em] -translate-y-1/2 rounded-sm bg-[#0a0a0b]" />
    </div>
  );
}

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * Pomodoro toàn màn hình kiểu đồng hồ lật: nền đen, hai ô phút : giây.
 * Mở bằng Fullscreen API (không được thì vẫn phủ kín cửa sổ); Esc hoặc nút thu nhỏ để thoát.
 */
export function FlipClockOverlay({
  remaining,
  running,
  modeLabel,
  targetTitle,
  canStop,
  onToggle,
  onStop,
  onClose,
}: {
  remaining: number;
  running: boolean;
  modeLabel: string;
  targetTitle: string | null;
  canStop: boolean;
  onToggle: () => void;
  onStop: () => void;
  onClose: () => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [idle, setIdle] = useState(false);
  // Callback mới nhất (cha có thể truyền hàm mới mỗi lần render) — effect fullscreen chỉ chạy một lần
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  // Vào fullscreen khi mở; thoát fullscreen (Esc của trình duyệt) → đóng lớp phủ
  useEffect(() => {
    rootRef.current?.requestFullscreen?.().catch(() => undefined);
    const onChange = () => {
      if (!document.fullscreenElement) closeRef.current();
    };
    document.addEventListener('fullscreenchange', onChange);
    return () => {
      document.removeEventListener('fullscreenchange', onChange);
      if (document.fullscreenElement) void document.exitFullscreen();
    };
  }, []);

  // Phím tắt: Space = chạy / tạm dừng, Esc = thoát (khi trình duyệt không cho fullscreen)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        onToggle();
      } else if (e.key === 'Escape' && !document.fullscreenElement) {
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onToggle, onClose]);

  // Ẩn thanh điều khiển + con trỏ sau 3 giây không động chuột
  useEffect(() => {
    let timer = setTimeout(() => setIdle(true), 3000);
    const wake = () => {
      setIdle(false);
      clearTimeout(timer);
      timer = setTimeout(() => setIdle(true), 3000);
    };
    window.addEventListener('mousemove', wake);
    window.addEventListener('touchstart', wake);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('mousemove', wake);
      window.removeEventListener('touchstart', wake);
    };
  }, []);

  const ctrl =
    'flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white/80 transition hover:bg-white/20 hover:text-white';

  return createPortal(
    <div
      ref={rootRef}
      className={cn(
        'fixed inset-0 z-[1000] flex flex-col items-center justify-center bg-black select-none',
        idle && 'cursor-none',
      )}
      onDoubleClick={onClose}
    >
      <div
        className="flex items-center font-bold text-[#bdbdc2] tabular-nums"
        style={
          {
            '--flip-w': 'min(42vw, 68vh)',
            gap: 'calc(var(--flip-w) * 0.04)',
            fontSize: 'calc(var(--flip-w) * 0.62)',
            lineHeight: 1,
            letterSpacing: '-0.04em',
            fontFamily: "'Helvetica Neue', 'Plus Jakarta Sans', Arial, sans-serif",
          } as React.CSSProperties
        }
      >
        <FlipCard value={pad(Math.floor(remaining / 60))} />
        <FlipCard value={pad(remaining % 60)} />
      </div>

      <div
        className={cn(
          'absolute inset-x-0 bottom-8 flex flex-col items-center gap-4 transition-opacity duration-500',
          idle ? 'opacity-0' : 'opacity-100',
        )}
        onDoubleClick={(e) => e.stopPropagation()}
      >
        <p className="max-w-[80vw] truncate text-sm font-semibold tracking-wide text-white/50">
          {modeLabel}
          {targetTitle && <span className="text-white/80"> • {targetTitle}</span>}
        </p>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggle}
            title={running ? 'Tạm dừng (Space)' : 'Chạy (Space)'}
            className={cn(ctrl, 'h-14 w-14 bg-white/15')}
          >
            {running ? <Pause size={24} /> : <Play size={24} />}
          </button>
          {canStop && (
            <button type="button" onClick={onStop} title="Kết thúc & ghi nhận" className={ctrl}>
              <Square size={20} />
            </button>
          )}
          <button type="button" onClick={onClose} title="Thu nhỏ (Esc)" className={ctrl}>
            <Minimize2 size={20} />
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
