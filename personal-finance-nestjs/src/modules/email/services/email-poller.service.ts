import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { ImapService } from './imap.service';

const INTERVAL_NAME = 'email-poll';

// Tự đọc email ngân hàng định kỳ khi API chạy. Chu kỳ lấy từ EMAIL_POLL_MINUTES (0 = tắt,
// khi đó dùng nút "Đọc email ngay" hoặc GET /api/cron/sync). Không dùng @Interval vì chu kỳ đọc từ env.
@Injectable()
export class EmailPollerService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger('EmailPoller');
  private firstRun?: NodeJS.Timeout;

  constructor(
    private readonly imap: ImapService,
    private readonly scheduler: SchedulerRegistry,
  ) {}

  onApplicationBootstrap() {
    const minutes = this.imap.pollMinutes();
    if (!this.imap.isConfigured() || minutes <= 0) return;

    const tick = () =>
      this.imap
        .poll()
        .then((s) => {
          if (s.error) this.logger.error(`Đọc email lỗi: ${s.error}`);
          else if (s.created || s.merged) this.logger.log(`+${s.created} giao dịch mới, ${s.merged} gộp với giao dịch có sẵn`);
        })
        .catch((e) => this.logger.error(`Đọc email lỗi: ${e}`));

    this.scheduler.addInterval(INTERVAL_NAME, setInterval(tick, minutes * 60 * 1000));
    this.firstRun = setTimeout(tick, 15_000); // lần đầu sau khi server đã sẵn sàng
    this.logger.log(`Tự đọc email ngân hàng mỗi ${minutes} phút`);
  }

  onModuleDestroy() {
    if (this.firstRun) clearTimeout(this.firstRun);
    if (this.scheduler.doesExist('interval', INTERVAL_NAME)) this.scheduler.deleteInterval(INTERVAL_NAME);
  }
}
