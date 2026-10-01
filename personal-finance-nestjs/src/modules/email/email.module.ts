import { Module } from '@nestjs/common';
import { RulesModule } from '../rules/rules.module';
import { TransfersModule } from '../transfers/transfers.module';
import { AccountsModule } from '../accounts/accounts.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { EmailController } from './controllers/email.controller';
import { CronController } from './controllers/cron.controller';
import { IngestEmailService } from './services/ingest-email.service';
import { ImapService } from './services/imap.service';
import { EmailPollerService } from './services/email-poller.service';

// Đọc email thông báo của ngân hàng (mỗi ngân hàng một bộ đọc trong providers/)
@Module({
  imports: [RulesModule, TransfersModule, AccountsModule, TransactionsModule],
  controllers: [EmailController, CronController],
  providers: [IngestEmailService, ImapService, EmailPollerService],
})
export class EmailModule {}
