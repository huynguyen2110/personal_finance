'use client';

interface Props {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  disabled?: boolean;
  size?: 'sm' | 'md';
}

// Công tắc bật/tắt kiểu iOS, dùng cho trạng thái quy tắc
export default function Switch({ checked, onChange, label, disabled, size = 'md' }: Props) {
  const track = size === 'sm' ? 'h-4 w-7' : 'h-5 w-9';
  const knob = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4';
  const shift = size === 'sm' ? 'translate-x-3' : 'translate-x-4';
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onChange(!checked);
      }}
      className={`relative inline-flex ${track} shrink-0 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-700/30 disabled:opacity-50 disabled:cursor-not-allowed ${
        checked ? 'bg-teal-700' : 'bg-slate-300'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 ${knob} rounded-full bg-white shadow-sm transition-transform ${checked ? shift : ''}`}
        aria-hidden
      />
    </button>
  );
}
