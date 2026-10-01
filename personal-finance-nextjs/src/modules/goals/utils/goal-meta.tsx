import {
  Baby,
  BadgeCheck,
  Bike,
  BookOpen,
  Camera,
  Car,
  CircleAlert,
  CircleCheck,
  CircleDashed,
  Clock,
  Ellipsis,
  Gem,
  Gift,
  GraduationCap,
  HeartHandshake,
  House,
  Infinity as InfinityIcon,
  Laptop,
  ShoppingCart,
  Wallet,
  Palmtree,
  PiggyBank,
  Plane,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  Sofa,
  Stethoscope,
  TrendingUp,
  Umbrella,
  type LucideIcon,
} from 'lucide-react';
import type { GoalDTO, GoalJar, GoalPriority, GoalStatus, SpendStatus } from '../types';

// Thẻ nổi trên nền trang: viền rõ hơn .fin-card mặc định + bóng đổ nhiều lớp, nhấc nhẹ khi rê chuột
export const CARD =
  'relative overflow-hidden bg-white rounded-2xl border border-slate-200/90 ' +
  'shadow-[0_1px_2px_rgba(15,23,42,0.06),0_6px_20px_-6px_rgba(15,23,42,0.12)] ' +
  'transition-[box-shadow,border-color,transform] duration-200 ' +
  'hover:border-slate-300 hover:shadow-[0_2px_4px_rgba(15,23,42,0.06),0_14px_32px_-10px_rgba(15,23,42,0.18)] hover:-translate-y-px';

// Icon chọn được cho mục tiêu (tên lưu trong DB)
export const GOAL_ICONS: Record<string, LucideIcon> = {
  ShieldCheck, Umbrella, PiggyBank, Plane, Palmtree, Camera, Car, Bike, House, Sofa, Laptop, Smartphone,
  TrendingUp, Gem, GraduationCap, BookOpen, Baby, HeartHandshake, Stethoscope, Gift,
};

// Nhóm hũ tài chính: nhãn, icon mặc định, màu
export const JARS: Record<GoalJar, { label: string; icon: LucideIcon; defaultIcon: string; color: string }> = {
  SAFETY: { label: 'An toàn tài chính', icon: ShieldCheck, defaultIcon: 'ShieldCheck', color: '#0f766e' },
  PURCHASE: { label: 'Mua sắm lớn', icon: ShoppingBag, defaultIcon: 'Laptop', color: '#2a78d6' },
  EXPERIENCE: { label: 'Trải nghiệm & du lịch', icon: Plane, defaultIcon: 'Plane', color: '#059669' },
  INVESTMENT: { label: 'Đầu tư / Hưu trí', icon: TrendingUp, defaultIcon: 'TrendingUp', color: '#4a3aa7' },
  SELF: { label: 'Nâng tầm bản thân', icon: GraduationCap, defaultIcon: 'GraduationCap', color: '#eb6834' },
  OTHER: { label: 'Hũ khác', icon: Ellipsis, defaultIcon: 'PiggyBank', color: '#64748b' },
};

export const PRIORITIES: Record<GoalPriority, { label: string; short: string; badge: string; rank: number }> = {
  HIGH: { label: 'Ưu tiên cao nhất (cấp thiết)', short: 'Ưu tiên cao', badge: 'bg-rose-50 text-rose-600 border-rose-200', rank: 0 },
  NORMAL: { label: 'Bình thường (nạp định kỳ)', short: 'Bình thường', badge: 'bg-slate-100 text-slate-600 border-slate-200', rank: 1 },
  FLEXIBLE: { label: 'Linh hoạt (tùy dòng tiền dư)', short: 'Linh hoạt', badge: 'bg-slate-100 text-slate-600 border-slate-200', rank: 2 },
};

// Trạng thái: luôn có icon + chữ, không chỉ dựa vào màu
export const STATUS: Record<GoalStatus, { label: string; badge: string; fill: string; Icon: LucideIcon }> = {
  done: { label: 'Hoàn thành', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', fill: '#059669', Icon: BadgeCheck },
  on_track: { label: 'Đúng lộ trình', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', fill: '#0f766e', Icon: CircleCheck },
  behind: { label: 'Chậm tiến độ', badge: 'bg-amber-100 text-amber-800 border-amber-200', fill: '#f59e0b', Icon: Clock },
  overdue: { label: 'Quá hạn', badge: 'bg-rose-50 text-rose-600 border-rose-200', fill: '#f43f5e', Icon: CircleAlert },
  no_deadline: { label: 'Không đặt hạn', badge: 'bg-slate-100 text-slate-600 border-slate-200', fill: '#0f766e', Icon: CircleDashed },
  no_plan: { label: 'Chưa có kế hoạch nạp', badge: 'bg-slate-100 text-slate-500 border-slate-200', fill: '#94a3b8', Icon: CircleDashed },
};

// Tình trạng sử dụng tiền của quỹ (màu tím: tách khỏi màu trạng thái tích lũy)
export const SPEND_STATUS: Record<SpendStatus, { label: string; badge: string; Icon: LucideIcon }> = {
  unspent: { label: 'Chưa tiêu', badge: 'bg-white text-slate-600 border-slate-200', Icon: Wallet },
  partial: { label: 'Đã tiêu một phần', badge: 'bg-violet-50 text-violet-700 border-violet-200', Icon: ShoppingCart },
  spent: { label: 'Đã tiêu hết', badge: 'bg-violet-100 text-violet-800 border-violet-300', Icon: ShoppingCart },
};

export function SpendBadge({ goal }: { goal: Pick<GoalDTO, 'spendStatus'> }) {
  const s = SPEND_STATUS[goal.spendStatus];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-semibold ${s.badge}`}>
      <s.Icon className="w-3 h-3" aria-hidden /> {s.label}
    </span>
  );
}

// Quỹ duy trì: tiêu bớt thì quay lại tích lũy
export function OngoingBadge() {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-semibold bg-sky-50 text-sky-700 border-sky-200"
      title="Quỹ duy trì: tiến độ tính theo số tiền còn trong quỹ — tiêu bớt thì tự quay lại tích lũy"
    >
      <InfinityIcon className="w-3.5 h-3.5" aria-hidden /> Quỹ duy trì
    </span>
  );
}

export function GoalIcon({ goal, size = 'lg' }: { goal: Pick<GoalDTO, 'icon' | 'jar'>; size?: 'md' | 'lg' }) {
  const Icon = GOAL_ICONS[goal.icon] ?? JARS[goal.jar].icon;
  const color = JARS[goal.jar].color;
  const box = size === 'lg' ? 'w-12 h-12 rounded-xl' : 'w-9 h-9 rounded-lg';
  return (
    <span className={`${box} inline-flex items-center justify-center shrink-0`} style={{ backgroundColor: `${color}1a`, color }} aria-hidden>
      <Icon className={size === 'lg' ? 'w-6 h-6' : 'w-5 h-5'} />
    </span>
  );
}

// "2027-03" → "Tháng 03/2027"
export const monthText = (m: string) => `Tháng ${m.slice(5)}/${m.slice(0, 4)}`;
export const pct = (v: number) => `${Math.floor(v * 100)}%`;
export const nf = new Intl.NumberFormat('vi-VN');
export const rateText = (r: number) => `${String(r).replace('.', ',')}%/năm`;
