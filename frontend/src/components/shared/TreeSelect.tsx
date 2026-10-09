'use client';

import { Check, ChevronDown, CornerDownRight, Search, X } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { normalizeText } from '@/lib/text';
import { usePopover } from './usePopover';

export interface TreeOption<V extends string | number = string | number> {
  value: V;
  label: string;
  // Hiển thị 2 cấp: dòng con thụt vào dưới dòng cha
  depth?: 0 | 1;
  icon?: ReactNode;
  // Dòng phụ bên phải (VD "đang 2.000.000 ₫")
  meta?: string;
  // Nhãn nhóm (VD "Chi" / "Thu"); các option kề nhau cùng group được gom lại
  group?: string;
  // Chuỗi dùng để tìm kiếm (mặc định: label + group)
  keywords?: string;
  // Chỉ hiện làm nhãn, không chọn được (VD cha của một danh mục con được gợi ý)
  disabled?: boolean;
}

export interface TreeSelectProps<V extends string | number> {
  options: TreeOption<V>[];
  value: V | null;
  onChange: (value: V | null) => void;
  placeholder?: string;
  // Icon nút khi chưa chọn gì
  placeholderIcon?: ReactNode;
  // Icon cố định trên nút, bất kể đang chọn gì (VD icon lịch cho bộ lọc kỳ)
  triggerIcon?: ReactNode;
  id?: string;
  // Cho phép bấm × để trả về null
  clearable?: boolean;
  // Hiện ô tìm kiếm (mặc định: khi có từ 8 lựa chọn trở lên)
  searchable?: boolean;
  size?: 'sm' | 'md';
  // 'ghost': nút không viền, chữ màu chủ đạo (dùng cho sắp xếp, số dòng/trang)
  variant?: 'input' | 'ghost';
  disabled?: boolean;
  className?: string;
  ariaLabel?: string;
  // Khi chọn 1 dòng con, nút hiển thị "Cha › Con"
  showParentInTrigger?: boolean;
  // Class thêm cho khung dropdown (render qua portal, VD đổi tông màu theo module)
  panelClassName?: string;
  searchPlaceholder?: string;
}

// Chỉ số option kế tiếp theo hướng `dir` mà chọn được; không có thì giữ nguyên
function nextEnabled<V extends string | number>(list: TreeOption<V>[], from: number, dir: 1 | -1): number {
  for (let i = from + dir; i >= 0 && i < list.length; i += dir) if (!list[i].disabled) return i;
  return Math.min(Math.max(from, 0), list.length - 1);
}
// Dropdown tùy chỉnh thay cho <select> thuần: hỗ trợ cây 2 cấp, icon, nhóm, tìm kiếm & phím tắt.
export default function TreeSelect<V extends string | number>({
  options,
  value,
  onChange,
  placeholder = 'Chọn…',
  placeholderIcon,
  triggerIcon,
  id,
  clearable = false,
  searchable,
  size = 'md',
  variant = 'input',
  disabled,
  className = '',
  ariaLabel,
  showParentInTrigger = true,
  panelClassName = '',
  searchPlaceholder = 'Tìm danh mục…',
}: TreeSelectProps<V>) {
  const { open, setOpen, pos, panelStyle, triggerRef, panelRef } = usePopover({ minWidth: 260 });
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listboxId = useId();

  const canSearch = searchable ?? options.length >= 8;

  const selected = useMemo(() => options.find((o) => o.value === value) ?? null, [options, value]);
  const selectedParent = useMemo(() => {
    if (!selected || selected.depth !== 1) return null;
    const i = options.indexOf(selected);
    for (let k = i - 1; k >= 0; k--) if (!options[k].depth) return options[k];
    return null;
  }, [options, selected]);

  // Lọc theo từ khóa (bỏ dấu); giữ dòng cha khi có con khớp để không mất ngữ cảnh
  const visible = useMemo(() => {
    const q = normalizeText(query.trim());
    if (!q) return options;
    const hit = (o: TreeOption<V>) => normalizeText(`${o.label} ${o.keywords ?? ''}`).includes(q);
    const keep = new Set<number>();
    options.forEach((o, i) => {
      if (!hit(o)) return;
      keep.add(i);
      if (o.depth === 1) for (let k = i - 1; k >= 0; k--) if (!options[k].depth) { keep.add(k); break; }
    });
    return options.filter((_, i) => keep.has(i));
  }, [options, query]);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => (canSearch ? searchRef.current : panelRef.current)?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [open, canSearch, panelRef]);

  // Cuộn dòng đang active vào tầm nhìn
  useEffect(() => {
    if (!open) return;
    const li = listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`);
    li?.scrollIntoView({ block: 'nearest' });
  }, [active, open]);

  function openPanel() {
    const idx = options.findIndex((o) => o.value === value);
    setActive(idx >= 0 ? idx : nextEnabled(options, -1, 1));
    setQuery('');
    setOpen(true);
  }

  function close() {
    setOpen(false);
    setQuery('');
  }

  function pick(o: TreeOption<V>) {
    onChange(o.value);
    close();
    triggerRef.current?.focus();
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      // Chỉ đóng dropdown, không để Esc lan tới Modal bên ngoài
      e.preventDefault();
      e.stopPropagation();
      close();
      triggerRef.current?.focus();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => nextEnabled(visible, i, 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => nextEnabled(visible, i, -1));
    } else if (e.key === 'Home') {
      e.preventDefault();
      setActive(nextEnabled(visible, -1, 1));
    } else if (e.key === 'End') {
      e.preventDefault();
      setActive(nextEnabled(visible, visible.length, -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const o = visible[active];
      if (o && !o.disabled) pick(o);
    } else if (e.key === 'Tab') {
      close();
    }
  }

  function onTriggerKey(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!open) openPanel();
    }
  }

  const sm = size === 'sm';
  const triggerCls = [
    'tsel-trigger group',
    sm ? 'tsel-trigger-sm' : '',
    variant === 'ghost' ? 'tsel-trigger-ghost' : '',
    open ? 'tsel-open' : '',
    !selected ? 'tsel-empty' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const triggerLabel = selected
    ? showParentInTrigger && selectedParent
      ? (
          <>
            <span className="text-text-muted font-normal">{selectedParent.label} ›</span> {selected.label}
          </>
        )
      : selected.label
    : placeholder;

  return (
    <>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        className={triggerCls}
        onClick={() => (open ? close() : openPanel())}
        onKeyDown={onTriggerKey}
      >
        {(triggerIcon ?? selected?.icon ?? placeholderIcon) && <span className="tsel-trigger-icon">{triggerIcon ?? selected?.icon ?? placeholderIcon}</span>}
        <span className="tsel-trigger-label">{triggerLabel}</span>
        {clearable && selected && !disabled ? (
          <span
            role="button"
            aria-label="Bỏ chọn"
            tabIndex={-1}
            className="tsel-clear"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onChange(null);
              close();
            }}
          >
            <X className="w-3.5 h-3.5" />
          </span>
        ) : null}
        <ChevronDown className={`tsel-chevron ${open ? 'rotate-180' : ''}`} aria-hidden />
      </button>

      {open &&
        pos &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={panelRef}
            tabIndex={-1}
            className={`tsel-panel ${pos.up ? 'tsel-panel-up' : ''} ${panelClassName}`}
            style={panelStyle}
            onKeyDown={onKey}
          >
            {canSearch && (
              <div className="tsel-search">
                <Search className="w-4 h-4 text-text-muted shrink-0" aria-hidden />
                <input
                  ref={searchRef}
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setActive(0);
                  }}
                  placeholder={searchPlaceholder}
                  aria-label="Tìm kiếm"
                  autoComplete="off"
                />
                {query && (
                  <button
                    type="button"
                    className="tsel-search-clear"
                    onClick={() => {
                      setQuery('');
                      setActive(0);
                      searchRef.current?.focus();
                    }}
                    aria-label="Xóa tìm kiếm"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
            <ul ref={listRef} id={listboxId} role="listbox" aria-label={ariaLabel} className="tsel-list">
              {visible.length === 0 && <li className="tsel-empty-state">Không có kết quả cho &ldquo;{query}&rdquo;</li>}
              {visible.map((o, i) => {
                const showGroup = o.group && (i === 0 || visible[i - 1].group !== o.group);
                const isSel = o.value === value;
                return (
                  <li key={String(o.value)} role="presentation">
                    {showGroup && <div className="tsel-group">{o.group}</div>}
                    <div
                      role="option"
                      aria-selected={isSel}
                      data-index={i}
                      aria-disabled={o.disabled || undefined}
                      className={`tsel-option ${o.depth === 1 ? 'tsel-child' : ''} ${o.disabled ? 'tsel-disabled' : ''} ${i === active ? 'tsel-active' : ''} ${isSel ? 'tsel-selected' : ''}`}
                      onMouseMove={() => !o.disabled && active !== i && setActive(i)}
                      onClick={() => !o.disabled && pick(o)}
                    >
                      {o.depth === 1 && <CornerDownRight className="tsel-branch" aria-hidden />}
                      {o.icon && <span className="tsel-option-icon">{o.icon}</span>}
                      <span className="tsel-option-label">{o.label}</span>
                      {o.meta && <span className="tsel-meta fin-num">{o.meta}</span>}
                      {isSel && <Check className="tsel-check" aria-hidden />}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>,
          document.body,
        )}
    </>
  );
}
