import { Injectable } from '@nestjs/common';
import { ImapFlow, type SearchObject } from 'imapflow';
import { simpleParser } from 'mailparser';
import { startOfVNDay } from '../../../../common/utils/dates.util';
import { AppStateService } from '../../../../services/app-state.service';
import { SettingsService } from '../../../../services/settings.service';
import { CategorizeService } from '../../rules/services/categorize.service';
import { EMAIL_PROVIDERS, parseBankEmail } from '../providers';
import { IngestEmailService } from './ingest-email.service';

// Đọc email thông báo giao dịch của các ngân hàng hỗ trợ (Vietcombank, Cake, ACB…) qua IMAP
// (VD Gmail + mật khẩu ứng dụng). Mỗi lần chỉ lấy thư mới hơn UID đã đọc.
// Lần đầu: lấy từ "ngày bắt đầu lấy dữ liệu" trong cài đặt, chưa đặt thì 30 ngày gần nhất.
// Giao dịch có ngày trước ngày bắt đầu luôn bị bỏ qua (kể cả khi đọc lại N ngày).
// Cài đặt "chỉ lấy tiền đi" → bỏ qua email báo tiền đến.

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
  beforeStart: number; // giao dịch trước ngày bắt đầu lấy dữ liệu → bỏ qua
  ignoredIncoming: number; // email tiền đến bị bỏ qua do cài đặt chỉ lấy tiền đi
  startDate: string | null; // ngày bắt đầu đang áp dụng lúc đọc
  incoming: boolean; // cài đặt lấy email tiền đến lúc đọc
  error?: string;
}

export interface PollOptions {
  sinceDays?: number;
  // Đọc lại toàn bộ thư kể từ ngày bắt đầu lấy dữ liệu (bỏ qua mốc UID đã đọc)
  fromStart?: boolean;
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

@Injectable()
export class ImapService {
  // Không chạy chồng: nếu đang đọc thì trả về kết quả của lần đang chạy
  private running: Promise<EmailPollSummary> | null = null;

  constructor(
    private readonly appState: AppStateService,
    private readonly settings: SettingsService,
    private readonly categorize: CategorizeService,
    private readonly ingestEmail: IngestEmailService,
  ) {}

  isConfigured(): boolean {
    const c = config();
    return !!c.user && !!c.pass;
  }

  pollMinutes(): number {
    const v = Number(process.env.EMAIL_POLL_MINUTES ?? 3);
    return Number.isFinite(v) && v >= 0 ? v : 3;
  }

  getLastRun(): Promise<EmailPollSummary | null> {
    return this.appState.get<EmailPollSummary>(LAST_RUN_KEY);
  }

  poll(opts: PollOptions = {}): Promise<EmailPollSummary> {
    if (!this.running) {
      this.running = this.doPoll(opts).finally(() => {
        this.running = null;
      });
    }
    return this.running;
  }

  private async doPoll(opts: PollOptions): Promise<EmailPollSummary> {
    const c = config();
    const startDate = await this.settings.emailStartDate();
    const startAt = startDate ? startOfVNDay(startDate) : null;
    const incoming = await this.settings.emailIncoming();
    const summary: EmailPollSummary = {
      at: new Date().toISOString(),
      scanned: 0,
      created: 0,
      merged: 0,
      duplicates: 0,
      skipped: 0,
      beforeStart: 0,
      ignoredIncoming: 0,
      startDate,
      incoming,
    };
    if (!this.isConfigured()) {
      summary.error = 'Chưa cấu hình IMAP_USER / IMAP_PASSWORD trong .env';
      return summary;
    }
    if (opts.fromStart && !startAt) {
      summary.error = 'Chưa đặt ngày bắt đầu lấy dữ liệu trong Cài đặt';
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
        const cursor = await this.appState.get<Cursor>(CURSOR_KEY);
        const rescan = !!opts.sinceDays || !!opts.fromStart;
        const incremental = !rescan && cursor?.uidValidity === uidValidity;

        // Thư từ bất kỳ ngân hàng nào được hỗ trợ
        const senders = EMAIL_PROVIDERS.map((p) => ({ from: p.fromFilter() }));
        const query: SearchObject = senders.length === 1 ? { ...senders[0] } : { or: senders };
        // Mốc thời gian tìm thư: không bao giờ sớm hơn ngày bắt đầu (nếu có)
        const notBefore = (d: Date) => (startAt && d < startAt ? startAt : d);
        if (opts.fromStart) query.since = startAt!;
        else if (opts.sinceDays) query.since = notBefore(new Date(Date.now() - opts.sinceDays * 86400e3));
        else if (incremental) query.uid = `${cursor!.lastUid + 1}:*`;
        else query.since = startAt ?? new Date(Date.now() - FIRST_RUN_DAYS * 86400e3);

        const found = (await client.search(query, { uid: true })) || [];
        // "N:*" luôn trả về ít nhất thư cuối cùng dù UID nhỏ hơn N → lọc lại
        const uids = incremental ? found.filter((u) => u > cursor!.lastUid) : found;

        let maxUid = cursor?.uidValidity === uidValidity ? cursor.lastUid : 0;
        if (uids.length) {
          const ctx = await this.categorize.loadContext();
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
            // Giao dịch xảy ra trước ngày bắt đầu lấy dữ liệu → không ghi nhận
            if (startAt && parsed.data.transactionDate < startAt) {
              summary.beforeStart++;
              continue;
            }
            // Cài đặt chỉ lấy tiền đi → bỏ qua email báo tiền đến
            if (!incoming && parsed.data.direction === 'IN') {
              summary.ignoredIncoming++;
              continue;
            }
            const r = await this.ingestEmail.ingest(parsed.data, { messageId: mail.messageId ?? null }, ctx);
            if (r.status === 'created') summary.created++;
            else if (r.status === 'merged') summary.merged++;
            else summary.duplicates++;
          }
        }
        await this.appState.set(CURSOR_KEY, { uidValidity, lastUid: maxUid } satisfies Cursor);
      } finally {
        lock.release();
      }
      await client.logout();
    } catch (e) {
      summary.error = e instanceof Error ? e.message : String(e);
      client.close();
    }

    await this.appState.set(LAST_RUN_KEY, summary);
    return summary;
  }
}
