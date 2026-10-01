import { Module } from '@nestjs/common';
import { StatsModule } from '../stats/stats.module';
import { BudgetsModule } from '../budgets/budgets.module';
import { AccountsModule } from '../accounts/accounts.module';
import { ReportsController } from './controllers/reports.controller';
import { ReportsService } from './services/reports.service';
import { ReportExportService } from './services/report-export.service';

// Tổng quan + thống kê (đường dẫn api/stats/*)
@Module({
  imports: [StatsModule, BudgetsModule, AccountsModule],
  controllers: [ReportsController],
  providers: [ReportsService, ReportExportService],
})
export class ReportsModule {}
