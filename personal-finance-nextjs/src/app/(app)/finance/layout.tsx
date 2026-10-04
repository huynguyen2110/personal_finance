import MainLayout from '@/components/layout/MainLayout';

export default function FinanceLayout({ children }: { children: React.ReactNode }) {
  return <MainLayout moduleId="finance">{children}</MainLayout>;
}
