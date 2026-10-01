'use client';

// Tiêu đề từng trang (nằm dưới TopBar). Phần tài khoản/đăng xuất và nút mở menu đã chuyển lên TopBar.
interface HeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export default function Header({ title, subtitle, actions }: HeaderProps) {
  return (
    <header className="flex flex-wrap items-center justify-between min-h-16 px-4 md:px-6 py-3 gap-3">
      <div className="min-w-0">
        <h1 className="text-lg md:text-xl font-bold text-text font-heading truncate">{title}</h1>
        {subtitle && <p className="text-xs md:text-sm text-text-secondary mt-0.5 truncate">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 md:gap-3">{actions}</div>}
    </header>
  );
}
