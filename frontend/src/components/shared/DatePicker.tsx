'use client';

import { CalendarDays, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { addDaysStr, addMonths, currentMonthVN, formatVNDate, monthRange, todayVN, weekdayOf } from '@/lib/dates';
import { usePopover } from './usePopover';

export type DatePickerMode = 'date' | 'month';

interface Props {
  // 'date': giá trị "YYYY-MM-DD"; 'month': "YYYY-MM"
  mode?: DatePickerMode;
  // Chuỗi rỗng = chưa chọn
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  placeholder?: string;
  // Hiện nút × để xóa giá trị
  clearable?: boolean;
  disabled?: boolean;
  size?: 'sm' | 'md';
  // 'ghost': nút không viền (dùng trong thanh chuyển tháng)
  variant?: 'input' | 'ghost';
  className?: string;
  ariaLabel?: string;
  id?: string;
}

const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const MONTHS = Array.from({ length: 12 }, (_, i) => `Tháng ${i + 1}`);
const PANEL_W = 288;

const pad = (n: number) => String(n).padStart(2, '0');
const inRange = (v: string, min?: string, max?: string) => !(min && v < min) && !(max && v > max);

// Nhãn hiển thị trên nút: "02/07/2024" hoặc "Tháng 7/2024"
export function formatPickerValue(value: string, mode: DatePickerMode): string {
  if (!value) return '';
  if (mode === 'month') {
    const [y, m] = value.split('-');
    return `Tháng ${Number(m)}/${y}`;
  }
  return formatVNDate(value);
}

// 42 ô lịch (6 tuần, bắt đầu Thứ 2) cho tháng "YYYY-MM"
function monthGrid(month: string): { date: string; inMonth: boolean }[] {
  const first = `${month}-01`;
  const lead = (weekdayOf(first) + 6) % 7;
  const start = addDaysStr(first, -lead);
  return Array.from({ length: 42 }, (_, i) => {
    const date = addDaysStr(start, i);
    return { date, inMonth: date.slice(0, 7) === month };
  });
}

// Lịch chọn ngày / tháng tùy chỉnh thay cho <input type="date|month">: panel nổi, điều hướng bàn phím, cùng phong cách TreeSelect.
export default function DatePicker({
  mode = 'date',
  value,
  onChange,
  min,
  max,
  placeholder,
  clearable = false,
  disabled,
  size = 'md',
  variant = 'input',
  className = '',
  ariaLabel,
  id,
}: Props) {
  const { open, setOpen, pos, panelStyle, triggerRef, panelRef } = usePopover({ minWidth: PANEL_W, matchTriggerWidth: false, estimatedHeight: 340 });
  // Tháng đang xem (chế độ ngày) / năm đang xem (chế độ tháng)
  const [viewMonth, setViewMonth] = useState(() => (value || todayVN()).slice(0, 7));
  const [viewYear, setViewYear] = useState(() => Number((value || todayVN()).slice(0, 4)));
  // Chế độ ngày có thể lật sang lưới tháng để nhảy nhanh
  const [pane, setPane] = useState<'days' | 'months'>('days');
  // Ô đang có focus bàn phím (ngày "YYYY-MM-DD" hoặc tháng "YYYY-MM")
  const [focus, setFocus] = useState('');
  const gridRef = useRef<HTMLDivElement>(null);
  const dialogId = useId();

  const today = todayVN();
  const thisMonth = currentMonthVN();
  const showMonths = mode === 'month' || pane === 'months';

  function openPanel() {
    const base = value || (mode === 'month' ? thisMonth : today);
    setViewMonth(base.slice(0, 7));
    setViewYear(Number(base.slice(0, 4)));
    setPane('days');
    setFocus(mode === 'month' ? base.slice(0, 7) : base);
    setOpen(true);
  }

  function close() {
    setOpen(false);
    triggerRef.current?.focus();
  }

  function pick(v: string) {
    onChange(v);
    close();
  }

  // Đưa focus vào ô đang active sau mỗi lần đổi (panel chỉ xuất hiện khi đã có `pos`, nên phụ thuộc cả pos)
  useEffect(() => {
    if (!open || !pos) return;
    const el = gridRef.current?.querySelector<HTMLButtonElement>(`[data-value="${focus}"]`) ?? gridRef.current?.querySelector<HTMLButtonElement>('button:not(:disabled)');
    if (el && document.activeElement !== el) el.focus({ preventScroll: true });
  }, [open, pos, focus, pane, viewMonth, viewYear]);

  function moveDay(delta: number) {
    const next = addDaysStr(focus || today, delta);
    setFocus(next);
    setViewMonth(next.slice(0, 7));
  }
  function moveMonth(delta: number) {
    const next = addMonths(focus || thisMonth, delta);
    setFocus(next);
    setViewYear(Number(next.slice(0, 4)));
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      // Chỉ đóng lịch, không để Esc lan tới Modal bên ngoài
      e.preventDefault();
      e.stopPropagation();
      close();
      return;
    }
    if (e.key === 'Tab') return;
    const days = !showMonths;
    const map: Record<string, () => void> = days
      ? {
          ArrowLeft: () => moveDay(-1),
          ArrowRight: () => moveDay(1),
          ArrowUp: () => moveDay(-7),
          ArrowDown: () => moveDay(7),
          PageUp: () => {
            const m = addMonths(viewMonth, -1);
            setViewMonth(m);
            setFocus(`${m}-01`);
          },
          PageDown: () => {
            const m = addMonths(viewMonth, 1);
            setViewMonth(m);
            setFocus(`${m}-01`);
          },
          Home: () => setFocus(`${viewMonth}-01`),
          End: () => setFocus(monthRange(viewMonth).to),
        }
      : {
          ArrowLeft: () => moveMonth(-1),
          ArrowRight: () => moveMonth(1),
          ArrowUp: () => moveMonth(-3),
          ArrowDown: () => moveMonth(3),
          PageUp: () => moveMonth(-12),
          PageDown: () => moveMonth(12),
        };
    const fn = map[e.key];
    if (fn) {
      e.preventDefault();
      fn();
    }
  }

  // Chọn một tháng trong lưới: chế độ tháng → trả giá trị; chế độ ngày → chuyển sang xem ngày của tháng đó
  function pickMonth(m: string) {
    if (mode === 'month') {
      pick(m);
      return;
    }
    setViewMonth(m);
    setPane('days');
    const f = focus && focus.slice(0, 7) === m ? focus : `${m}-01`;
    setFocus(f);
  }

  const label = formatPickerValue(value, mode);
  const ph = placeholder ?? (mode === 'month' ? 'Chọn tháng' : 'Chọn ngày');
  const quickValue = mode === 'month' ? thisMonth : today;
  const quickOk = inRange(quickValue, min, max);
  const [vy, vm] = viewMonth.split('-').map(Number);

  const triggerCls = [
    'dpk-trigger',
    variant === 'ghost' ? 'dpk-trigger-ghost' : '',
    size === 'sm' ? 'dpk-trigger-sm' : '',
    open ? 'dpk-open' : '',
    !value ? 'dpk-empty' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? dialogId : undefined}
        className={triggerCls}
        onClick={() => (open ? setOpen(false) : openPanel())}
        onKeyDown={(e) => {
          if (!open && (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            openPanel();
          }
        }}
      >
        <CalendarDays className="dpk-trigger-icon" aria-hidden />
        <span className="dpk-trigger-label fin-num">{label || ph}</span>
        {clearable && value && !disabled ? (
          <span
            role="button"
            aria-label="Xóa"
            tabIndex={-1}
            className="dpk-clear"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onChange('');
              setOpen(false);
            }}
          >
            <X className="w-3.5 h-3.5" />
          </span>
        ) : null}
      </button>

      {open &&
        pos &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={panelRef}
            id={dialogId}
            role="dialog"
            aria-label={ariaLabel ?? (mode === 'month' ? 'Chọn tháng' : 'Chọn ngày')}
            className={`dpk-panel ${pos.up ? 'dpk-panel-up' : ''}`}
            style={panelStyle}
            onKeyDown={onKey}
          >
            <div className="dpk-head">
              <button
                type="button"
                className="dpk-nav"
                aria-label={showMonths ? 'Năm trước' : 'Tháng trước'}
                onClick={() => (showMonths ? setViewYear((y) => y - 1) : setViewMonth((m) => addMonths(m, -1)))}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {mode === 'date' ? (
                <button
                  type="button"
                  className="dpk-title"
                  aria-label={pane === 'days' ? 'Chọn tháng khác' : 'Quay lại lịch ngày'}
                  onClick={() => {
                    if (pane === 'days') {
                      setViewYear(vy);
                      setFocus(viewMonth);
                      setPane('months');
                    } else {
                      setPane('days');
                      setFocus(`${viewMonth}-01`);
                    }
                  }}
                >
                  {pane === 'days' ? `Tháng ${vm}, ${vy}` : `Năm ${viewYear}`}
                </button>
              ) : (
                <span className="dpk-title">Năm {viewYear}</span>
              )}
              <button
                type="button"
                className="dpk-nav"
                aria-label={showMonths ? 'Năm sau' : 'Tháng sau'}
                onClick={() => (showMonths ? setViewYear((y) => y + 1) : setViewMonth((m) => addMonths(m, 1)))}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {showMonths ? (
              <div ref={gridRef} className="dpk-months" role="grid">
                {MONTHS.map((name, i) => {
                  const m = `${viewYear}-${pad(i + 1)}`;
                  const selected = mode === 'month' ? value === m : viewMonth === m;
                  const monthMin = min ? min.slice(0, 7) : undefined;
                  const monthMax = max ? max.slice(0, 7) : undefined;
                  const off = !inRange(m, monthMin, monthMax);
                  return (
                    <button
                      key={m}
                      type="button"
                      role="gridcell"
                      data-value={m}
                      tabIndex={focus === m ? 0 : -1}
                      disabled={off}
                      aria-selected={selected}
                      className={`dpk-cell dpk-month ${selected ? 'dpk-selected' : ''} ${m === thisMonth ? 'dpk-today' : ''}`}
                      onClick={() => pickMonth(m)}
                      onFocus={() => focus !== m && setFocus(m)}
                    >
                      {name}
                    </button>
                  );
                })}
              </div>
            ) : (
              <>
                <div className="dpk-weekdays" aria-hidden>
                  {WEEKDAYS.map((w) => (
                    <span key={w}>{w}</span>
                  ))}
                </div>
                <div ref={gridRef} className="dpk-days" role="grid">
                  {monthGrid(viewMonth).map(({ date, inMonth }) => {
                    const off = !inRange(date, min, max);
                    return (
                      <button
                        key={date}
                        type="button"
                        role="gridcell"
                        data-value={date}
                        tabIndex={focus === date ? 0 : -1}
                        disabled={off}
                        aria-selected={value === date}
                        aria-label={formatVNDate(date)}
                        className={`dpk-cell dpk-day ${inMonth ? '' : 'dpk-outside'} ${value === date ? 'dpk-selected' : ''} ${date === today ? 'dpk-today' : ''}`}
                        onClick={() => pick(date)}
                        onFocus={() => focus !== date && setFocus(date)}
                      >
                        {Number(date.slice(8, 10))}
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            <div className="dpk-foot">
              <button type="button" className="dpk-quick" disabled={!quickOk} onClick={() => pick(quickValue)}>
                {mode === 'month' ? 'Tháng này' : 'Hôm nay'}
              </button>
              {clearable && value && (
                <button type="button" className="dpk-quick dpk-quick-muted" onClick={() => pick('')}>
                  Xóa
                </button>
              )}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
