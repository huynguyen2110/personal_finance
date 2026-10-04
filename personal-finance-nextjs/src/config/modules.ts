import {
  BarChart3,
  ChartColumn,
  CheckSquare,
  ListChecks,
  Landmark,
  LayoutDashboard,
  ListOrdered,
  Network,
  PiggyBank,
  Settings,
  Sprout,
  Tags,
  Target,
  Wallet,
  type LucideIcon,
} from 'lucide-react';

// Danh sách module của ứng dụng: launcher ("/"), sidebar và nút chuyển module đều đọc từ đây.
// Thêm module mới = thêm một mục ở đây + thư mục src/modules/<id> + route src/app/(app)/<id>.

export interface ModuleNavItem {
  href: string;
  icon: LucideIcon;
  label: string;
  keywords?: string[]; // từ khóa thêm cho ô tìm kiếm ở launcher
}

export interface ModuleNavGroup {
  heading: string;
  items: ModuleNavItem[];
}

export type AppModuleId = 'finance' | 'growth';

export interface AppModule {
  id: AppModuleId;
  name: string;
  description: string;
  icon: LucideIcon;
  // Màu ô biểu tượng (gradient) trên launcher và logo sidebar
  from: string;
  to: string;
  basePath: string;
  // Trang mở khi bấm vào module
  home: string;
  nav: ModuleNavGroup[];
  keywords?: string[];
}

export const APP_MODULES: AppModule[] = [
  {
    id: 'finance',
    name: 'Tài chính cá nhân',
    description: 'Thu chi tự động từ email ngân hàng, ngân sách, mục tiêu tiết kiệm',
    icon: Wallet,
    from: '#0f766e',
    to: '#10b981',
    basePath: '/finance',
    home: '/finance/dashboard',
    keywords: ['chi tiêu', 'tiền', 'finance', 'ngân hàng'],
    nav: [
      {
        heading: 'Theo dõi',
        items: [
          { href: '/finance/dashboard', icon: LayoutDashboard, label: 'Tổng quan' },
          { href: '/finance/transactions', icon: ListOrdered, label: 'Giao dịch', keywords: ['thu', 'chi'] },
          { href: '/finance/reports', icon: ChartColumn, label: 'Thống kê', keywords: ['báo cáo', 'so sánh'] },
        ],
      },
      {
        heading: 'Kế hoạch',
        items: [
          { href: '/finance/budgets', icon: Target, label: 'Ngân sách', keywords: ['hạn mức'] },
          { href: '/finance/goals', icon: PiggyBank, label: 'Mục tiêu tiết kiệm', keywords: ['quỹ', 'tích lũy'] },
        ],
      },
      {
        heading: 'Thiết lập',
        items: [
          { href: '/finance/categories', icon: Tags, label: 'Danh mục & Quy tắc' },
          { href: '/finance/accounts', icon: Landmark, label: 'Tài khoản', keywords: ['ngân hàng', 'ví'] },
          { href: '/finance/settings', icon: Settings, label: 'Cài đặt', keywords: ['email'] },
        ],
      },
    ],
  },
  {
    id: 'growth',
    name: 'Phát triển bản thân',
    description: 'Lĩnh vực cần phát triển, hành động, gợi ý nên làm gì tiếp và todo hằng ngày',
    icon: Sprout,
    from: '#7c3aed',
    to: '#c026d3',
    basePath: '/growth',
    home: '/growth',
    keywords: ['kế hoạch', 'mục tiêu', 'kỹ năng', 'sơ đồ', 'mindmap'],
    nav: [
      {
        heading: 'Phát triển bản thân',
        items: [
          { href: '/growth', icon: ListChecks, label: 'Kế hoạch', keywords: ['gợi ý', 'ưu tiên'] },
          { href: '/growth/map', icon: Network, label: 'Sơ đồ', keywords: ['mindmap', 'lĩnh vực', 'hành động'] },
          { href: '/growth/todos', icon: CheckSquare, label: 'Todo hằng ngày', keywords: ['việc', 'todo'] },
          { href: '/growth/stats', icon: BarChart3, label: 'Thống kê', keywords: ['tiến độ', 'thời gian'] },
        ],
      },
    ],
  },
];

export function getModule(id: AppModuleId): AppModule {
  return APP_MODULES.find((m) => m.id === id)!;
}

// Mục menu đang mở: mục có href khớp dài nhất (để "/growth" không sáng khi đang ở "/growth/todos")
export function activeNavHref(pathname: string, module: AppModule): string | null {
  let best: string | null = null;
  for (const it of module.nav.flatMap((g) => g.items)) {
    if ((pathname === it.href || pathname.startsWith(`${it.href}/`)) && (!best || it.href.length > best.length)) best = it.href;
  }
  return best;
}
