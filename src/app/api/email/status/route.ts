import { handle, json } from '@/lib/api';
import { emailPollMinutes, getLastEmailRun, isEmailConfigured } from '@/lib/email/imap';
import { EMAIL_PROVIDERS } from '@/lib/email/providers';

// Không trả về tài khoản / mật khẩu email, chỉ trạng thái
export const GET = handle(async () =>
  json({
    configured: isEmailConfigured(),
    pollMinutes: emailPollMinutes(),
    lastRun: await getLastEmailRun(),
    providers: EMAIL_PROVIDERS.map((p) => ({
      id: p.id,
      bankName: p.bankName,
      description: p.description,
      covers: p.covers,
      reportsBalance: p.reportsBalance,
      from: p.fromFilter(),
    })),
  })
);
