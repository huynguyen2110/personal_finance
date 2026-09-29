import { Suspense } from 'react';
import TransactionsView from './TransactionsView';

export default function TransactionsPage() {
  return (
    <Suspense>
      <TransactionsView />
    </Suspense>
  );
}
