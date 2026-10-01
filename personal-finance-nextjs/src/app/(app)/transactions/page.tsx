import { Suspense } from 'react';
import TransactionsPage from '@/modules/transactions/components/TransactionsPage';

// useSearchParams trong TransactionsPage cần Suspense boundary
export default function Page() {
  return (
    <Suspense>
      <TransactionsPage />
    </Suspense>
  );
}
