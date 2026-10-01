import MainLayout from '@/components/layout/MainLayout';
import AuthGuard from '@/components/shared/AuthGuard';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <MainLayout>{children}</MainLayout>
    </AuthGuard>
  );
}
