'use client';

import { Clock } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { vnParts } from '@/lib/dates';
import { usePopover } from './usePopover';

interface Props {
  // "HH:mm" 24 giờ; chuỗi rỗng = chưa chọn
  value: string;
  onChange: (value: string) => void;
  // Bước phút trong cột phút (mặc định 5); phút hiện tại lẻ bước vẫn được hiện để không mất giá trị
  minuteStep?: number;
  placeholder?: string;
  disabled?: boolean;
  size?: 'sm' | 'md';
  className?: string;
  ariaLabel?: string;
  id?: string;
}

const PANEL_W = 232;
const pad = (n: number) => String(n).padStart(2, '0');
const HOURS = Array.from({ length: 24 }, (_, i) => pad(i));

function parse(v: string): { h: number; m: number } | null {
  const m = /^(\d{2}):(\d{2})$/.exec(v);
  if (!m) return null;
  const h = Number(m[1]);
  const mi = Number(m[2]);
  if (h > 23 || mi > 59) return null;
  return { h, m: mi };
}

function nowVN(): { h: number; m: number } {
  const p = vnParts(new Date());
  return { h: p.hour, m: p.minute };
}

// Chọn giờ:phút 24h bằng hai cột cuộn (giờ, phút) thay cho <input type="time"> của trình duyệt.
export default function TimePicker({
  value,
  onChange,
  minuteStep = 5,
  placeholder = 'Chọn giờ',
  disabled,
  size = 'md',
  className = '',
  ariaLabel = 'Giờ',
  id,
}: Props) {
  const { open, setOpen, pos, panelStyle, triggerRef, panelRef } = usePopover({ minWidth: PANEL_W, matchTriggerWidth: false, estimatedHeight: 300 });
  // Cột đang có focus bàn phím
  const [col, setCol] = useState<'h' | 'm'>('h');
  const hourCol = useRef<HTMLDivElement>(null);
  const minCol = useRef<HTMLDivElement>(null);
  const dialogId = useId();

  const parsed = parse(value);
  const minutes = (() => {
    const list: number[] = [];
    for (let m = 0; m < 60; m += minuteStep) list.push(m);
    if (parsed && !list.includes(parsed.m)) list.push(parsed.m);
    return list.sort((a, b) => a - b);
  })();

  function openPanel() {
    setCol('h');
    setOpen(true);
  }

  function close() {
    setOpen(false);
    triggerRef.current?.focus();
  }

  function set(h: number, m: number) {
    onChange(`${pad(h)}:${pad(m)}`);
  }

  // Khi mở: cuộn giờ/phút đang chọn vào giữa cột và đưa focus vào cột giờ
  useEffect(() => {
    if (!open || !pos) return;
    const cur = parsed ?? nowVN();
    const center = (root: HTMLDivElement | null, v: number) => {
      const el = root?.querySelector<HTMLElement>(`[data-v="${v}"]`);
      if (el && root) root.scrollTop = el.offsetTop - root.clientHeight / 2 + el.offsetHeight / 2;
      return el;
    };
    const hEl = center(hourCol.current, cur.h);
    center(minCol.current, parsed ? parsed.m : minutes.reduce((best, m) => (Math.abs(m - cur.m) < Math.abs(best - cur.m) ? m : best), minutes[0]));
    hEl?.focus({ preventScroll: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, pos]);

  function focusCell(which: 'h' | 'm', v: number) {
    const root = which === 'h' ? hourCol.current : minCol.current;
    const el = root?.querySelector<HTMLElement>(`[data-v="${v}"]`);
    el?.focus();
    el?.scrollIntoView({ block: 'nearest' });
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      close();
      return;
    }
    if (e.key === 'Tab') return;
    const cur = parsed ?? nowVN();
    const step = (dir: 1 | -1) => {
      if (col === 'h') {
        const h = (cur.h + dir + 24) % 24;
        set(h, cur.m);
        focusCell('h', h);
      } else {
        const i = minutes.indexOf(cur.m);
        const next = minutes[(Math.max(i, 0) + dir + minutes.length) % minutes.length];
        set(cur.h, next);
        focusCell('m', next);
      }
    };
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      step(1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      step(-1);
    } else if (e.key === 'ArrowRight' && col === 'h') {
      e.preventDefault();
      setCol('m');
      focusCell('m', cur.m);
    } else if (e.key === 'ArrowLeft' && col === 'm') {
      e.preventDefault();
      setCol('h');
      focusCell('h', cur.h);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (!parsed) set(cur.h, cur.m);
      close();
    }
  }

  const triggerCls = ['dpk-trigger', size === 'sm' ? 'dpk-trigger-sm' : '', open ? 'dpk-open' : '', !value ? 'dpk-empty' : '', className].filter(Boolean).join(' ');

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
        <Clock className="dpk-trigger-icon" aria-hidden />
        <span className="dpk-trigger-label fin-num">{value || placeholder}</span>
      </button>

      {open &&
        pos &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={panelRef}
            id={dialogId}
            role="dialog"
            aria-label={ariaLabel}
            className={`tpk-panel ${pos.up ? 'dpk-panel-up' : ''}`}
            style={panelStyle}
            onKeyDown={onKey}
          >
            <div className="tpk-cols">
              <div className="tpk-col">
                <div className="tpk-col-head">Giờ</div>
                <div ref={hourCol} className="tpk-list" role="listbox" aria-label="Giờ">
                  {HOURS.map((h, i) => {
                    const sel = parsed?.h === i;
                    return (
                      <button
                        key={h}
                        type="button"
                        role="option"
                        aria-selected={sel}
                        data-v={i}
                        tabIndex={sel || (!parsed && i === nowVN().h) ? 0 : -1}
                        className={`tpk-cell ${sel ? 'tpk-selected' : ''}`}
                        onFocus={() => setCol('h')}
                        onClick={() => {
                          set(i, parsed?.m ?? 0);
                          setCol('m');
                          focusCell('m', parsed?.m ?? 0);
                        }}
                      >
                        {h}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="tpk-sep" aria-hidden>
                :
              </div>
              <div className="tpk-col">
                <div className="tpk-col-head">Phút</div>
                <div ref={minCol} className="tpk-list" role="listbox" aria-label="Phút">
                  {minutes.map((m) => {
                    const sel = parsed?.m === m;
                    return (
                      <button
                        key={m}
                        type="button"
                        role="option"
                        aria-selected={sel}
                        data-v={m}
                        tabIndex={sel ? 0 : -1}
                        className={`tpk-cell ${sel ? 'tpk-selected' : ''}`}
                        onFocus={() => setCol('m')}
                        onClick={() => {
                          set(parsed?.h ?? nowVN().h, m);
                          close();
                        }}
                      >
                        {pad(m)}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="dpk-foot">
              <button
                type="button"
                className="dpk-quick"
                onClick={() => {
                  const n = nowVN();
                  set(n.h, n.m);
                  close();
                }}
              >
                Bây giờ
              </button>
              <button type="button" className="dpk-quick dpk-quick-muted" onClick={close}>
                Xong
              </button>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
