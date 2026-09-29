import { redirect } from 'next/navigation';
import { HOME_ROUTE } from '@/lib/auth/constants';

export default function Home() {
  redirect(HOME_ROUTE);
}
