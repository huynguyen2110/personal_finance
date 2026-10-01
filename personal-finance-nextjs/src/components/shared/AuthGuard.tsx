'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { hasSession } from '@/lib/auth-storage';

// Bảo vệ các trang sau đăng nhập ở phía client (token nằm ở localStorage nên proxy phía server không đọc được).
// Hết phiên giữa chừng thì api-client tự chuyển về /login khi gọi API.
export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ok, setOk] = useState(false);

  useEffect(() => {
    if (hasSession()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- chỉ biết được phiên sau khi mount (localStorage)
      setOk(true);
    } else {
      router.replace(`/login?from=${encodeURIComponent(pathname)}`);
    }
  }, [router, pathname]);

  if (!ok) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-dark">
        <span className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" aria-label="Đang tải" />
      </div>
    );
  }
  return <>{children}</>;
}
