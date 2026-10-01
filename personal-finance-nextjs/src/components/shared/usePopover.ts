'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';

export interface PopoverPos {
  top: number;
  left: number;
  width: number;
  up: boolean;
}

interface Options {
  // Chiều rộng tối thiểu của panel (px); mặc định bằng nút mở
  minWidth?: number;
  // Chiều cao ước lượng để quyết định lật panel lên trên
  estimatedHeight?: number;
  // false: panel rộng đúng minWidth, không giãn theo nút mở (VD lịch)
  matchTriggerWidth?: boolean;
}

const GAP = 6;
const EDGE = 8;

// Định vị panel nổi (portal) bám theo nút mở: tính vị trí, lật lên khi thiếu chỗ, đóng khi bấm ra ngoài.
export function usePopover<T extends HTMLElement = HTMLButtonElement>({ minWidth = 0, estimatedHeight = 320, matchTriggerWidth = true }: Options = {}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<PopoverPos | null>(null);
  const triggerRef = useRef<T>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const place = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const below = window.innerHeight - r.bottom - GAP;
    const up = below < Math.min(estimatedHeight, 220) && r.top > below;
    const width = matchTriggerWidth ? Math.max(r.width, minWidth) : minWidth;
    const left = Math.min(Math.max(EDGE, r.left), Math.max(EDGE, window.innerWidth - width - EDGE));
    setPos({ top: up ? r.top - GAP : r.bottom + GAP, left, width, up });
  }, [minWidth, estimatedHeight, matchTriggerWidth]);

  useLayoutEffect(() => {
    if (!open) return;
    place();
    const onScroll = (e: Event) => {
      if (panelRef.current && e.target instanceof Node && panelRef.current.contains(e.target)) return;
      place();
    };
    window.addEventListener('resize', place);
    document.addEventListener('scroll', onScroll, true);
    return () => {
      window.removeEventListener('resize', place);
      document.removeEventListener('scroll', onScroll, true);
    };
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (panelRef.current?.contains(t) || triggerRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [open]);

  const panelStyle: CSSProperties | undefined = pos
    ? { top: pos.top, left: pos.left, minWidth: pos.width, transform: pos.up ? 'translateY(-100%)' : undefined }
    : undefined;

  return { open, setOpen, pos, panelStyle, triggerRef, panelRef };
}
