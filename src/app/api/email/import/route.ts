import { z } from 'zod';
import { handle, json, parseBody, HttpError } from '@/lib/api';
import { parseBankEmail } from '@/lib/email/providers';
import { emailContent, ingestBankEmail, isSelfTransfer } from '@/lib/email/ingestEmail';

const Body = z.object({
  // Nội dung email thông báo copy từ trình đọc mail (văn bản) hoặc mã HTML gốc của thư
  content: z.string().min(20, { error: 'Dán nội dung email' }).max(500_000),
  // true: chỉ đọc thử, không lưu
  dryRun: z.boolean().default(false),
});

export const POST = handle(async (req: Request) => {
  const { content, dryRun } = await parseBody(req, Body);
  const isHtml = /<\s*(table|td|tr|div|html|body)\b/i.test(content);
  const parsed = parseBankEmail(isHtml ? { html: content } : { text: content });
  if (!parsed.ok) throw new HttpError(422, `Không đọc được email: ${parsed.reason}`);

  const p = parsed.data;
  const preview = {
    bankName: p.bankName,
    referenceCode: p.referenceCode,
    transactionDate: p.transactionDate.toISOString(),
    accountTail: p.accountNumber.slice(-4),
    direction: p.direction,
    amount: p.amount,
    fee: p.fee,
    content: emailContent(p),
    selfTransfer: isSelfTransfer(p),
    balanceAfter: p.balanceAfter,
  };
  if (dryRun) return json({ preview });

  const result = await ingestBankEmail(p);
  return json({ preview, result });
});
