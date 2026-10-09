'use client';

import { Clock, List, PenLine } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { GOption, GSelect } from '@/modules/mindmap/components/ui/GSelect';
import { cn, formatMinutes } from '@/modules/mindmap/lib/utils';

const CUSTOM = -1;
const MAX_MINUTES = 1440;

const PRESETS: GOption<number>[] = [
  { value: 15, label: '15 phút', meta: 'khởi động' },
  { value: 25, label: '25 phút', meta: '1 Pomodoro' },
  { value: 45, label: '45 phút', meta: 'khối sâu' },
  { value: 60, label: '1 giờ' },
  { value: 90, label: '1 giờ 30 phút' },
  { value: 120, label: '2 giờ', meta: 'khối rất sâu' },
].map((o) => ({ ...o, icon: <Clock size={14} className="text-gray-400" /> }));

const OPTIONS: GOption<number>[] = [
  ...PRESETS,
  { value: CUSTOM, label: 'Tự nhập thời gian…', icon: <PenLine size={14} className="text-violet-500" /> },
];

const isPreset = (v: number | null) => v !== null && PRESETS.some((p) => p.value === v);

/**
 * "40" / "40p" → 40 phút; "1:30", "1h30", "1g30", "1 giờ 30" → 90; "2h" → 120.
 * Trả về null khi rỗng, NaN khi sai định dạng hoặc ngoài 1–1440 phút.
 */
export function parseDuration(text: string): number | null {
  const t = text.trim().toLowerCase();
  if (!t) return null;
  let minutes = NaN;
  const plain = t.match(/^(\d+)\s*(p|ph|phút|m|min)?$/);
  const hm = t.match(/^(\d+)\s*(?::|h|g|giờ)\s*(\d{1,2})?\s*(p|ph|phút|m|min)?$/);
  if (plain) minutes = Number(plain[1]);
  else if (hm) minutes = Number(hm[1]) * 60 + Number(hm[2] ?? 0);
  return minutes >= 1 && minutes <= MAX_MINUTES ? minutes : NaN;
}

/** Chọn thời lượng có sẵn, hoặc "Tự nhập thời gian…" để gõ số phút / giờ:phút. */
export function DurationPicker({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (minutes: number | null) => void;
}) {
  // Giá trị không nằm trong danh sách có sẵn (đã tự nhập trước đó) → mở sẵn ô nhập
  const [custom, setCustom] = useState(() => value !== null && !isPreset(value));
  const [text, setText] = useState(() => (value !== null && !isPreset(value) ? String(value) : ''));
  const inputRef = useRef<HTMLInputElement>(null);

  // Mở ô nhập: focus và bôi chọn giá trị cũ để gõ là thay luôn
  useEffect(() => {
    if (!custom) return;
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [custom]);

  const parsed = parseDuration(text);
  const invalid = Number.isNaN(parsed);

  const backToList = () => {
    setCustom(false);
    if (!isPreset(value)) onChange(null);
  };

  if (!custom) {
    return (
      <GSelect
        options={OPTIONS}
        value={value}
        onChange={(v) => {
          if (v === CUSTOM) {
            setText(value !== null ? String(value) : '');
            setCustom(true);
          } else {
            onChange(v);
          }
        }}
        clearable
        searchable={false}
        placeholder="Chưa ước lượng thời gian"
        placeholderIcon={<Clock size={14} className="text-gray-400" />}
        ariaLabel="Thời lượng dự kiến"
      />
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <div
        className={cn(
          'flex min-h-[2.625rem] items-center gap-2 rounded-xl bg-[#f2f3ff] pr-1 pl-3 transition focus-within:bg-white focus-within:ring-2',
          invalid ? 'ring-2 ring-red-300 focus-within:ring-red-300' : 'focus-within:ring-violet-300',
        )}
      >
        <Clock size={14} className="shrink-0 text-violet-500" />
        <input
          ref={inputRef}
          value={text}
          inputMode="text"
          aria-label="Tự nhập thời lượng"
          aria-invalid={invalid}
          placeholder="VD: 40 hoặc 1:30"
          onChange={(e) => {
            setText(e.target.value);
            const p = parseDuration(e.target.value);
            onChange(Number.isNaN(p) ? null : p);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault();
              backToList();
            }
          }}
          className="w-full min-w-0 bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"
        />
        <span className="shrink-0 text-xs font-semibold text-gray-400">phút</span>
        <button
          type="button"
          onClick={backToList}
          title="Chọn từ danh sách có sẵn (Esc)"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-500 transition hover:bg-[#eaedff] hover:text-violet-700"
        >
          <List size={16} />
        </button>
      </div>
      <span className={cn('px-1 text-[11px] font-semibold', invalid ? 'text-red-500' : 'text-gray-400')}>
        {invalid
          ? 'Sai định dạng — VD: 40 hoặc 1:30'
          : parsed !== null
            ? `= ${formatMinutes(parsed)}`
            : 'Bỏ trống = chưa ước lượng'}
      </span>
    </div>
  );
}
