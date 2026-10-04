import { Module } from '@nestjs/common';
import { AccountsModule } from './accounts/accounts.module';
import { BudgetsModule } from './budgets/budgets.module';
import { CategoriesModule } from './categories/categories.module';
import { CategoryGroupsModule } from './category-groups/category-groups.module';
import { EmailModule } from './email/email.module';
import { GoalsModule } from './goals/goals.module';
import { ReportsModule } from './reports/reports.module';
import { RulesModule } from './rules/rules.module';
import { SettingsModule } from './settings/settings.module';
import { StatsModule } from './stats/stats.module';
import { TransactionsModule } from './transactions/transactions.module';
import { TransfersModule } from './transfers/transfers.module';

// Module 1: Tài chính cá nhân. Route giữ nguyên dạng api/<tính năng> (api/accounts, api/cron/sync…).
@Module({
  imports: [
    AccountsModule,
    CategoriesModule,
    CategoryGroupsModule,
    RulesModule,
    TransfersModule,
    TransactionsModule,
    StatsModule,
    BudgetsModule,
    GoalsModule,
    ReportsModule,
    EmailModule,
    SettingsModule,
  ],
})
export class FinanceModule {}
