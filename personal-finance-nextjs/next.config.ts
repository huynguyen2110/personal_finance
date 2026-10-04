import type { NextConfig } from "next";

// Các trang tài chính trước đây nằm ở gốc (/dashboard…) → nay thuộc module /finance. Giữ link/bookmark cũ.
const FINANCE_PAGES = ['dashboard', 'transactions', 'reports', 'budgets', 'goals', 'categories', 'accounts', 'settings'];

// Frontend thuần: mọi dữ liệu lấy từ API NestJS (NEXT_PUBLIC_API_URL)
const nextConfig: NextConfig = {
  async redirects() {
    return FINANCE_PAGES.map((p) => ({ source: `/${p}/:path*`, destination: `/finance/${p}/:path*`, permanent: true }));
  },
};

export default nextConfig;
