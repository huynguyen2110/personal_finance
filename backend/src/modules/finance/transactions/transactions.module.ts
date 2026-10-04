import { Module } from '@nestjs/common';
import { TransfersModule } from '../transfers/transfers.module';
import { TransactionsController } from './controllers/transactions.controller';
import { TransactionsService } from './services/transactions.service';
import { TransactionsExportService } from './services/transactions-export.service';

@Module({
  imports: [TransfersModule],
  controllers: [TransactionsController],
  providers: [TransactionsService, TransactionsExportService],
  exports: [TransactionsService],
})
export class TransactionsModule {}
