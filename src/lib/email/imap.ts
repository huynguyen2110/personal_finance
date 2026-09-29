import { ImapFlow, type SearchObject } from 'imapflow';
import { simpleParser } from 'mailparser';
import { loadActiveRules } from '../categorize';
import { getAppState, setAppState } from '../appState';
import { EMAIL_PROVIDERS, parseBankEmail } from './providers';
import { ingestBankEmail } from './ingestEmail';

// Đọc email thông báo giao dịch của các ngân hàng hỗ trợ (Vietcombank, Cake, ACB…) qua IMAP
// (VD Gmail + mật khẩu ứng dụng). Mỗi lần chỉ lấy thư mới hơn UID đã đọc; lần đầu lấy 30 ngày gần nhất.

const CURSOR_KEY = 'email.cursor';
const LAST_RUN_KEY = 'email.lastRun';
const FIRST_RUN_DAYS = 30;

interface Cursor {
  uidValidity: string;
  lastUid: number;
}

export interface EmailPollSummary {
  at: string;
  scanned: number; // số thư từ người gửi là ngân hàng đã xem
  created: number;
  merged: number; // gộp với giao dịch đã có từ nguồn nhập khác
  duplicates: number;
  skipped: number; // thư không phải thông báo giao dịch (OTP, khuyến mãi…)
  error?: string;
}

function config() {
  return {
    host: process.env.IMAP_HOST || 'imap.gmail.com',
    port: Number(process.env.IMAP_PORT) || 993,
    user: process.env.IMAP_USER || '',
    pass: process.env.IMAP_PASSWORD || '',
    mailbox: process.env.IMAP_MAILBOX || 'INBOX',
  };
}

export function isEmailConfigured(): boolean {
  const c = config();
  return !!c.user && !!c.pass;
}

export function emailPollMinutes(): number {
  const v = Number(process.env.EMAIL_POLL_MINUTES ?? 3);
  return Number.isFinite(v) && v >= 0 ? v : 3;
}

export async function getLastEmailRun(): Promise<EmailPollSummary | null> {
  return getAppState<EmailPollSummary>(LAST_RUN_KEY);
}

let running: Promise<EmailPollSummary> | null = null;

// Không chạy chồng: nếu đang đọc thì trả về kết quả của lần đang chạy
export function pollBankEmails(opts: { sinceDays?: number } = {}): Promise<EmailPollSummary> {
  if (!running) {
    running = doPoll(opts).finally(() => {
      running = null;
    });
  }
  return running;
}

async function doPoll(opts: { sinceDays?: number }): Promise<EmailPollSummary> {
  const c = config();
  const summary: EmailPollSummary = {
    at: new Date().toISOString(),
    scanned: 0,
    created: 0,
    merged: 0,
    duplicates: 0,
    skipped: 0,
  };
  if (!isEmailConfigured()) {
    summary.error = 'Chưa cấu hình IMAP_USER / IMAP_PASSWORD trong .env';
    return summary;
  }

  const client = new ImapFlow({
    host: c.host,
    port: c.port,
    secure: c.port === 993,
    auth: { user: c.user, pass: c.pass },
    logger: false,
  });

  try {
    await client.connect();
    const lock = await client.getMailboxLock(c.mailbox);
    try {
      const mailbox = client.mailbox;
      const uidValidity = mailbox ? String(mailbox.uidValidity) : '';
      const cursor = await getAppState<Cursor>(CURSOR_KEY);
      const incremental = !opts.sinceDays && cursor?.uidValidity === uidValidity;

      // Thư từ bất kỳ ngân hàng nào được hỗ trợ
      const senders = EMAIL_PROVIDERS.map((p) => ({ from: p.fromFilter() }));
      const query: SearchObject = senders.length === 1 ? { ...senders[0] } : { or: senders };
      if (opts.sinceDays) query.since = new Date(Date.now() - opts.sinceDays * 86400e3);
      else if (incremental) query.uid = `${cursor!.lastUid + 1}:*`;
      else query.since = new Date(Date.now() - FIRST_RUN_DAYS * 86400e3);

      const found = (await client.search(query, { uid: true })) || [];
      // "N:*" luôn trả về ít nhất thư cuối cùng dù UID nhỏ hơn N → lọc lại
      const uids = incremental ? found.filter((u) => u > cursor!.lastUid) : found;

      let maxUid = cursor?.uidValidity === uidValidity ? cursor.lastUid : 0;
      if (uids.length) {
        const rules = await loadActiveRules();
        for await (const msg of client.fetch(uids, { uid: true, source: true }, { uid: true })) {
          summary.scanned++;
          maxUid = Math.max(maxUid, msg.uid);
          if (!msg.source) continue;
          const mail = await simpleParser(msg.source);
          const parsed = parseBankEmail({
            html: mail.html || null,
            text: mail.text || null,
            from: mail.from?.text ?? null,
            receivedAt: mail.date ?? null,
          });
          if (!parsed.ok) {
            summary.skipped++;
            continue;
          }
          const r = await ingestBankEmail(parsed.data, { messageId: mail.messageId ?? null }, rules);
          if (r.status === 'created') summary.created++;
          else if (r.status === 'merged') summary.merged++;
          else summary.duplicates++;
        }
      }
      await setAppState(CURSOR_KEY, { uidValidity, lastUid: maxUid } satisfies Cursor);
    } finally {
      lock.release();
    }
    await client.logout();
  } catch (e) {
    summary.error = e instanceof Error ? e.message : String(e);
    client.close();
  }

  await setAppState(LAST_RUN_KEY, summary);
  return summary;
}
