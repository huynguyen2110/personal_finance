import { Module } from '@nestjs/common';
import { StatsModule } from '../stats/stats.module';
import { BudgetsController } from './controllers/budgets.controller';
import { BudgetsService } from './services/budgets.service';

@Module({
  imports: [StatsModule],
  controllers: [BudgetsController],
  providers: [BudgetsService],
  exports: [BudgetsService],
})
export class BudgetsModule {}
