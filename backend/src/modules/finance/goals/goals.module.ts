import { Module } from '@nestjs/common';
import { StatsModule } from '../stats/stats.module';
import { BudgetsModule } from '../budgets/budgets.module';
import { GoalsController } from './controllers/goals.controller';
import { GoalsService } from './services/goals.service';

@Module({
  imports: [StatsModule, BudgetsModule],
  controllers: [GoalsController],
  providers: [GoalsService],
})
export class GoalsModule {}
