import { QueryClient } from '@tanstack/react-query';

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        retry: (count, error) => (error as { status?: number })?.status !== 401 && count < 1,
      },
    },
  });
}

// Gần như mọi thao tác ghi đều ảnh hưởng số dư, thống kê, ngân sách → làm mới toàn bộ dữ liệu tài chính.
// Đơn giản và đủ nhanh cho app một người dùng.
export function invalidateFinanceData(qc: QueryClient) {
  return qc.invalidateQueries({ predicate: (q) => q.queryKey[0] !== 'auth' });
}
