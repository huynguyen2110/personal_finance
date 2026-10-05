'use client';

import { useLayoutEffect, useRef, useState } from 'react';

const nf = new Intl.NumberFormat('vi-VN');
const MAX = 1e13;
// Gõ số nhỏ (VD "5", "25", "150") → gợi ý nhân thêm nghìn / chục nghìn / trăm nghìn / triệu
const SUGGEST_BELOW = 1000;
const MULTIPLIERS = [1e3, 1e4, 1e5, 1e6];

export function moneySuggestions(value: number | null): number[] {
  if (!value || value >= SUGGEST_BELOW) return [];
  return MULTIPLIERS.map((m) => value * m).filter((v) => v <= MAX);
}

// Ô nhập tiền: phân cách hàng nghìn khi gõ, giá trị là số đồng (null = trống).
// Khi đang gõ một số nhỏ thì hiện hàng gợi ý (5 → 5.000 / 50.000 / 500.000 / 5.000.000) để nhập nhanh.
export default function MoneyInput({
  value,
  onChange,
  id,
  size = 'md',
  placeholder,
  ariaLabel,
  autoFocus,
  invalid,
  className = '',
  showCurrency = true,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  id?: string;
  size?: 'sm' | 'md' | 'lg';
  placeholder?: string;
  ariaLabel?: string;
  autoFocus?: boolean;
  invalid?: boolean;
  // Thêm class cho ô nhập (VD canh phải trong bảng)
  className?: string;
  showCurrency?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const suggestions = focused ? moneySuggestions(value) : [];
  const sizeClass = size === 'lg' ? '!text-[18px] !font-bold !py-2.5' : size === 'sm' ? '!py-1.5' : '';

  // Giữ vị trí con trỏ khi sửa giữa số: ô được định dạng lại (thêm/bớt dấu chấm) sau mỗi lần gõ nên trình duyệt
  // đẩy con trỏ về cuối. Nhớ "sau bao nhiêu chữ số" rồi đặt lại con trỏ sau đúng chừng ấy chữ số trong chuỗi mới.
  const inputRef = useRef<HTMLInputElement>(null);
  const caretDigits = useRef<number | null>(null);
  // Tăng mỗi lần sửa để luôn render lại (kể cả khi số không đổi, VD gõ số 0 ở đầu) → effect đặt lại con trỏ
  const [edits, setEdits] = useState(0);
  const text = value === null ? '' : nf.format(value);

  useLayoutEffect(() => {
    const el = inputRef.current;
    const want = caretDigits.current;
    if (!el || want === null || document.activeElement !== el) return;
    caretDigits.current = null;
    let pos = 0;
    let seen = 0;
    while (pos < text.length && seen < want) {
      if (/\d/.test(text[pos])) seen++;
      pos++;
    }
    el.setSelectionRange(pos, pos);
  }, [edits, text]);

  // Đặt giá trị mới từ chuỗi chữ số, con trỏ nằm sau `caret` chữ số
  const commit = (digits: string, caret: number) => {
    const next = digits ? Math.min(Number(digits), MAX) : null;
    // Số 0 ở đầu bị bỏ khi đổi sang số → lùi con trỏ tương ứng
    const dropped = digits.length - (next === null ? 0 : String(next).length);
    caretDigits.current = Math.max(0, caret - Math.max(0, dropped));
    setEdits((n) => n + 1);
    onChange(next);
  };

  // Backspace/Delete ngay cạnh dấu chấm: xóa luôn chữ số bên kia dấu chấm (không thì không có gì thay đổi)
  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const el = e.currentTarget;
    const start = el.selectionStart ?? 0;
    if (start !== el.selectionEnd || (e.key !== 'Backspace' && e.key !== 'Delete')) return;
    const sepIndex = e.key === 'Backspace' ? start - 1 : start;
    if (sepIndex < 0 || sepIndex >= text.length || /\d/.test(text[sepIndex])) return;
    e.preventDefault();
    const digits = text.replace(/\D/g, '');
    const before = text.slice(0, start).replace(/\D/g, '').length;
    if (e.key === 'Backspace' && before > 0) commit(digits.slice(0, before - 1) + digits.slice(before), before - 1);
    if (e.key === 'Delete' && before < digits.length) commit(digits.slice(0, before) + digits.slice(before + 1), before);
  };

  return (
    <div>
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          id={id}
          inputMode="numeric"
          autoComplete="off"
          autoFocus={autoFocus}
          aria-label={ariaLabel}
          aria-invalid={invalid || undefined}
          placeholder={placeholder ?? '0'}
          className={`input-field fin-num ${showCurrency ? 'pr-8' : ''} ${sizeClass} ${className}`}
          value={text}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={onKeyDown}
          onChange={(e) => {
            const raw = e.target.value;
            const caret = raw.slice(0, e.target.selectionStart ?? raw.length).replace(/\D/g, '').length;
            commit(raw.replace(/\D/g, ''), caret);
          }}
        />
        {showCurrency && <span className="absolute right-3 text-sm font-semibold text-slate-400 pointer-events-none">₫</span>}
      </div>
      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1.5" role="group" aria-label="Gợi ý số tiền">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              tabIndex={-1}
              // Giữ focus ở ô nhập để gõ tiếp được ngay
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onChange(s)}
              className="px-2 py-0.5 rounded-md border border-teal-200 bg-teal-50 text-teal-800 text-xs font-semibold fin-num hover:bg-teal-100"
            >
              {nf.format(s)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
