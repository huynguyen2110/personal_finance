import {
  UtensilsCrossed, ShoppingBasket, Car, House, ShoppingBag, Clapperboard, HeartPulse,
  GraduationCap, Gift, Ellipsis, Briefcase, Award, HandCoins, RotateCcw, TrendingUp,
  CircleHelp, Tag, Coffee, Plane, Baby, PawPrint, Dumbbell, Shirt, Smartphone, Wifi, Zap,
  Fuel, Bus, Wallet, PiggyBank, Landmark, Receipt, Banknote, Building2, Sparkles, Wrench,
  BookOpen, Music, Gamepad2, Stethoscope, Pill, Users, ArrowLeftRight, CreditCard,
  type LucideIcon,
} from 'lucide-react';

// Bộ icon chọn được cho danh mục (tên lưu trong DB)
export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  UtensilsCrossed, Coffee, ShoppingBasket, Car, Bus, Fuel, Plane, House, Building2, Zap, Wifi,
  Receipt, ShoppingBag, Shirt, Smartphone, Clapperboard, Music, Gamepad2, HeartPulse, Stethoscope,
  Pill, Dumbbell, GraduationCap, BookOpen, Gift, Baby, PawPrint, Users, Wrench, Sparkles,
  Briefcase, Award, HandCoins, RotateCcw, TrendingUp, PiggyBank, Wallet, Banknote, Landmark,
  CreditCard, ArrowLeftRight, Tag, Ellipsis, CircleHelp,
};

export const CATEGORY_COLORS = [
  '#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7', '#e34948', '#898781',
];

interface Props {
  icon?: string | null;
  color?: string | null;
  size?: 'sm' | 'md';
}

// Chip icon danh mục: nền nhạt theo màu danh mục, icon cùng màu.
export default function CategoryIcon({ icon, color, size = 'md' }: Props) {
  const Icon = (icon && CATEGORY_ICONS[icon]) || CircleHelp;
  const c = color || '#94A3B8';
  const box = size === 'sm' ? 'w-6 h-6 rounded-md' : 'w-8 h-8 rounded-lg';
  const ic = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';
  return (
    <span
      className={`${box} inline-flex items-center justify-center flex-shrink-0`}
      style={{ backgroundColor: `${c}1f`, color: c }}
      aria-hidden
    >
      <Icon className={ic} />
    </span>
  );
}
