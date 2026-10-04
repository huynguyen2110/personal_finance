import { Module } from '@nestjs/common';
import { StatsModule } from '../stats/stats.module';
import { GoalsController } from './controllers/goals.controller';
import { GoalsService } from './services/goals.service';

@Module({
  imports: [StatsModule],
  controllers: [GoalsController],
  providers: [GoalsService],
})
export class GoalsModule {}
