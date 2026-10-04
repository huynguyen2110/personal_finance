'use client';

import { nf } from '../utils/goal-meta';

// Ô nhập tiền: hiển thị phân cách hàng nghìn khi gõ, giá trị là số đồng (null = trống)
export default function MoneyInput({
  value,
  onChange,
  id,
  size = 'md',
  placeholder,
  ariaLabel,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  id?: string;
  size?: 'md' | 'lg';
  placeholder?: string;
  ariaLabel?: string;
}) {
  return (
    <div className="relative flex items-center">
      <input
        id={id}
        inputMode="numeric"
        autoComplete="off"
        aria-label={ariaLabel}
        placeholder={placeholder ?? '0'}
        className={`input-field fin-num pr-8 ${size === 'lg' ? '!text-[18px] !font-bold !py-2.5' : ''}`}
        value={value === null ? '' : nf.format(value)}
        onChange={(e) => {
          const digits = e.target.value.replace(/[^\d]/g, '');
          onChange(digits ? Math.min(Number(digits), 1e13) : null);
        }}
      />
      <span className="absolute right-3 text-sm font-semibold text-slate-400 pointer-events-none">₫</span>
    </div>
  );
}
