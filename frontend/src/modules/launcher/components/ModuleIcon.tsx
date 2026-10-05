import type { AppModule } from '@/config/modules';

const SIZES = {
  sm: { box: 'w-9 h-9 rounded-lg', icon: 18 },
  lg: { box: 'w-[72px] h-[72px] rounded-[20px]', icon: 34 },
} as const;

// Ô biểu tượng gradient của một module (launcher, nút chuyển module)
export default function ModuleIcon({ module: m, size = 'lg' }: { module: AppModule; size?: keyof typeof SIZES }) {
  const s = SIZES[size];
  return (
    <span
      className={`${s.box} shrink-0 inline-flex items-center justify-center text-white shadow-[0_8px_20px_-6px_rgba(15,23,42,0.35)]`}
      style={{ background: `linear-gradient(135deg, ${m.from}, ${m.to})` }}
      aria-hidden
    >
      <m.icon size={s.icon} strokeWidth={1.9} />
    </span>
  );
}
