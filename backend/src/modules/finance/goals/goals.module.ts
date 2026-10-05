import { Module } from '@nestjs/common';
import { StatsModule } from '../stats/stats.module';
import { BudgetsModule } from '../budgets/budgets.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { GoalsController } from './controllers/goals.controller';
import { GoalsService } from './services/goals.service';

@Module({
  imports: [StatsModule, BudgetsModule, TransactionsModule],
  controllers: [GoalsController],
  providers: [GoalsService],
})
export class GoalsModule {}
