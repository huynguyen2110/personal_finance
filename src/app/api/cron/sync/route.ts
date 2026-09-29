import { timingSafeEqual } from 'node:crypto';
import { NextRequest } from 'next/server';
import { handle, json, HttpError } from '@/lib/api';
import { isEmailConfigured, pollBankEmails } from '@/lib/email/imap';

// Gọi từ bên ngoài (VD Windows Task Scheduler) để đọc email ngân hàng ngay, khi đã tắt tự đọc
// (EMAIL_POLL_MINUTES=0) hoặc muốn chắc chắn:
//   curl "http://localhost:3002/api/cron/sync?secret=<CRON_SECRET>"
export const GET = handle(
  async (req: NextRequest) => {
    const secret = process.env.CRON_SECRET;
    const given = Buffer.from(req.nextUrl.searchParams.get('secret') ?? '');
    const ok = !!secret && given.length === Buffer.byteLength(secret) && timingSafeEqual(given, Buffer.from(secret));
    if (!ok) throw new HttpError(401, 'Unauthorized');
    if (!isEmailConfigured()) throw new HttpError(400, 'Chưa cấu hình IMAP_USER / IMAP_PASSWORD');
    return json({ email: await pollBankEmails() });
  },
  { public: true }
);
