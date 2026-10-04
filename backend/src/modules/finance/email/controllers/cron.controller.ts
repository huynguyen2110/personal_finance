import { BadRequestException, Controller, Get, Query, UnauthorizedException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { timingSafeEqual } from 'node:crypto';
import { Public } from '../../../../common/decorators/public.decorator';
import { ImapService } from '../services/imap.service';

// Gọi từ bên ngoài (VD Windows Task Scheduler) để đọc email ngân hàng ngay, khi đã tắt tự đọc
// (EMAIL_POLL_MINUTES=0) hoặc muốn chắc chắn:
//   curl "http://localhost:4000/api/cron/sync?secret=<CRON_SECRET>"
@ApiTags('Cron')
@Controller('api/cron')
export class CronController {
  constructor(private readonly imap: ImapService) {}

  @Public()
  @Get('sync')
  async sync(@Query('secret') secretParam?: string) {
    const secret = process.env.CRON_SECRET;
    const given = Buffer.from(secretParam ?? '');
    const ok = !!secret && given.length === Buffer.byteLength(secret) && timingSafeEqual(given, Buffer.from(secret));
    if (!ok) throw new UnauthorizedException('Unauthorized');
    if (!this.imap.isConfigured()) throw new BadRequestException('Chưa cấu hình IMAP_USER / IMAP_PASSWORD');
    return { email: await this.imap.poll() };
  }
}
