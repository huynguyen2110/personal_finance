import { BadGatewayException, BadRequestException, Body, Controller, Get, HttpCode, Post, UnprocessableEntityException } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { EMAIL_PROVIDERS, parseBankEmail } from '../providers';
import { emailContent, isSelfTransfer } from '../utils/email-content';
import { ImapService } from '../services/imap.service';
import { IngestEmailService } from '../services/ingest-email.service';
import { ImportEmailDto, PollEmailDto } from '../dto/email.dto';

@ApiTags('Email')
@ApiBearerAuth('JWT-auth')
@Controller('api/email')
export class EmailController {
  constructor(
    private readonly imap: ImapService,
    private readonly ingestEmail: IngestEmailService,
  ) {}

  // Không trả về tài khoản / mật khẩu email, chỉ trạng thái
  @Get('status')
  async status() {
    return {
      configured: this.imap.isConfigured(),
      pollMinutes: this.imap.pollMinutes(),
      lastRun: await this.imap.getLastRun(),
      providers: EMAIL_PROVIDERS.map((p) => ({
        id: p.id,
        bankName: p.bankName,
        description: p.description,
        covers: p.covers,
        reportsBalance: p.reportsBalance,
        from: p.fromFilter(),
      })),
    };
  }

  @Post('poll')
  @HttpCode(200)
  async poll(@Body() dto: PollEmailDto) {
    if (!this.imap.isConfigured()) throw new BadRequestException('Chưa cấu hình IMAP_USER / IMAP_PASSWORD trong .env');
    const summary = await this.imap.poll(dto);
    if (summary.error) throw new BadGatewayException(`Không đọc được hộp thư: ${summary.error}`);
    return summary;
  }

  @Post('import')
  @HttpCode(200)
  async import(@Body() dto: ImportEmailDto) {
    const isHtml = /<\s*(table|td|tr|div|html|body)\b/i.test(dto.content);
    const parsed = parseBankEmail(isHtml ? { html: dto.content } : { text: dto.content });
    if (!parsed.ok) throw new UnprocessableEntityException(`Không đọc được email: ${parsed.reason}`);

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
    if (dto.dryRun) return { preview };

    const result = await this.ingestEmail.ingest(p);
    return { preview, result };
  }
}
