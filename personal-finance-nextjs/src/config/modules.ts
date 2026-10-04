import {
  BarChart3,
  ChartColumn,
  CheckSquare,
  Landmark,
  LayoutDashboard,
  ListOrdered,
  Network,
  PiggyBank,
  Settings,
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

export type AppModuleId = 'finance' | 'mindmap';

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
    id: 'mindmap',
    name: 'Mindmap',
    description: 'Sơ đồ tư duy, trang ghi chú cho từng nhánh và todo hằng ngày',
    icon: Network,
    from: '#7c3aed',
    to: '#c026d3',
    basePath: '/mindmap',
    home: '/mindmap',
    keywords: ['sơ đồ', 'tư duy', 'ghi chú'],
    nav: [
      {
        heading: 'Mindmap',
        items: [
          { href: '/mindmap', icon: Network, label: 'Mindmap', keywords: ['sơ đồ'] },
          { href: '/mindmap/todos', icon: CheckSquare, label: 'Todo hằng ngày', keywords: ['việc', 'todo'] },
          { href: '/mindmap/stats', icon: BarChart3, label: 'Thống kê', keywords: ['tiến độ'] },
        ],
      },
    ],
  },
];

export function getModule(id: AppModuleId): AppModule {
  return APP_MODULES.find((m) => m.id === id)!;
}

// Mục menu đang mở: mục có href khớp dài nhất (để "/mindmap" không sáng khi đang ở "/mindmap/todos")
export function activeNavHref(pathname: string, module: AppModule): string | null {
  let best: string | null = null;
  for (const it of module.nav.flatMap((g) => g.items)) {
    if ((pathname === it.href || pathname.startsWith(`${it.href}/`)) && (!best || it.href.length > best.length)) best = it.href;
  }
  return best;
}
