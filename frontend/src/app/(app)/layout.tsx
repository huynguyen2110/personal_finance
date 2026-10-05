import AuthGuard from '@/components/shared/AuthGuard';

// Mọi trang sau đăng nhập: launcher ("/") và các module (/finance, /growth…). Khung sidebar nằm ở layout của từng module.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AuthGuard>{children}</AuthGuard>;
}
