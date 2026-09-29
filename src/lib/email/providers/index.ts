import { toTokens } from '../tokens';
import type { BankEmailProvider, EmailParseResult } from '../types';
import { vcbProvider } from './vcb';
import { cakeProvider } from './cake';
import { acbProvider } from './acb';

// Mỗi ngân hàng một bộ đọc email. Thêm ngân hàng mới: viết provider rồi thêm vào đây.
export const EMAIL_PROVIDERS: BankEmailProvider[] = [vcbProvider, cakeProvider, acbProvider];

// Đọc một email: ưu tiên bộ đọc khớp người gửi / nội dung, rồi thử lần lượt các bộ còn lại.
export function parseBankEmail(input: {
  html?: string | null;
  text?: string | null;
  from?: string | null;
  receivedAt?: Date | null; // header Date của email
}): EmailParseResult {
  const variants = toTokens(input);
  if (!variants.length) return { ok: false, reason: 'Email trống' };
  const meta = { receivedAt: input.receivedAt ?? null };

  let firstReason: string | null = null;
  for (const tokens of variants) {
    const detected = EMAIL_PROVIDERS.filter((p) => p.detect(tokens, input.from ?? null));
    const order = [...detected, ...EMAIL_PROVIDERS.filter((p) => !detected.includes(p))];
    for (const p of order) {
      const r = p.parse(tokens, meta);
      if (r.ok) return r;
      if (detected.includes(p) && !firstReason) firstReason = `${p.bankName}: ${r.reason}`;
    }
  }
  return { ok: false, reason: firstReason ?? 'Không phải email thông báo giao dịch của ngân hàng được hỗ trợ' };
}
