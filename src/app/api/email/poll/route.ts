import { z } from 'zod';
import { handle, json, parseBody, HttpError } from '@/lib/api';
import { isEmailConfigured, pollBankEmails } from '@/lib/email/imap';

const Body = z.object({
  // Đọc lại thư trong N ngày gần nhất (bỏ qua mốc đã đọc). Trùng lặp được tự loại.
  sinceDays: z.number().int().min(1).max(365).optional(),
});

export const POST = handle(async (req: Request) => {
  if (!isEmailConfigured()) throw new HttpError(400, 'Chưa cấu hình IMAP_USER / IMAP_PASSWORD trong .env');
  const body = await parseBody(req, Body);
  const summary = await pollBankEmails(body);
  if (summary.error) throw new HttpError(502, `Không đọc được hộp thư: ${summary.error}`);
  return json(summary);
});
