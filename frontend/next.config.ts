import type { NextConfig } from "next";

// Các trang tài chính trước đây nằm ở gốc (/dashboard…) → nay thuộc module /finance. Giữ link/bookmark cũ.
const FINANCE_PAGES = ['dashboard', 'transactions', 'reports', 'budgets', 'goals', 'categories', 'accounts', 'settings'];

// Module Mindmap đổi thành "Phát triển bản thân" (/growth, một bản đồ duy nhất) → link cũ /mindmap/... vẫn mở được
const MINDMAP_REDIRECTS = [
  { source: '/mindmap', destination: '/growth' },
  { source: '/mindmap/todos', destination: '/growth/todos' },
  { source: '/mindmap/stats', destination: '/growth/stats' },
  { source: '/mindmap/:id/plan', destination: '/growth' },
  { source: '/mindmap/:id/nodes/:nodeId', destination: '/growth/nodes/:nodeId' },
  { source: '/mindmap/:id', destination: '/growth/map' },
];

// Frontend thuần: mọi dữ liệu lấy từ API NestJS (NEXT_PUBLIC_API_URL)
const nextConfig: NextConfig = {
  async redirects() {
    return [
      ...FINANCE_PAGES.map((p) => ({ source: `/${p}/:path*`, destination: `/finance/${p}/:path*`, permanent: true })),
      ...MINDMAP_REDIRECTS.map((r) => ({ ...r, permanent: true })),
    ];
  },
};

export default nextConfig;
