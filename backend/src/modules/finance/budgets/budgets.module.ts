import { Module } from '@nestjs/common';
import { StatsModule } from '../stats/stats.module';
import { BudgetsController } from './controllers/budgets.controller';
import { BudgetsService } from './services/budgets.service';
import { PlannedIncomeService } from './services/planned-income.service';

@Module({
  imports: [StatsModule],
  controllers: [BudgetsController],
  providers: [BudgetsService, PlannedIncomeService],
  exports: [BudgetsService, PlannedIncomeService],
})
export class BudgetsModule {}
