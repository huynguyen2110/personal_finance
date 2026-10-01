import { Module } from '@nestjs/common';
import { StatsService } from './services/stats.service';

// Truy vấn thống kê dùng chung (không có controller): budgets và reports dùng lại
@Module({
  providers: [StatsService],
  exports: [StatsService],
})
export class StatsModule {}
