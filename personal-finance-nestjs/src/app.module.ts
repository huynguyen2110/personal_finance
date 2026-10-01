import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './database/prisma.module';
import { SharedServicesModule } from './services/shared-services.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { AuthModule } from './modules/auth/auth.module';
import { AccountsModule } from './modules/accounts/accounts.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { RulesModule } from './modules/rules/rules.module';
import { TransfersModule } from './modules/transfers/transfers.module';
import { TransactionsModule } from './modules/transactions/transactions.module';
import { StatsModule } from './modules/stats/stats.module';
import { BudgetsModule } from './modules/budgets/budgets.module';
import { ReportsModule } from './modules/reports/reports.module';
import { EmailModule } from './modules/email/email.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    JwtModule.registerAsync({
      global: true,
      useFactory: () => {
        const secret = process.env.JWT_SECRET;
        if (!secret || secret.length < 32) throw new Error('JWT_SECRET chưa được cấu hình (cần >= 32 ký tự) trong .env');
        return { secret, signOptions: { expiresIn: (process.env.JWT_ACCESS_EXPIRES || '15m') as `${number}m` } };
      },
    }),
    PrismaModule,
    SharedServicesModule,
    AuthModule,
    AccountsModule,
    CategoriesModule,
    RulesModule,
    TransfersModule,
    TransactionsModule,
    StatsModule,
    BudgetsModule,
    ReportsModule,
    EmailModule,
  ],
  // Mọi route cần đăng nhập, trừ route đánh dấu @Public()
  providers: [{ provide: APP_GUARD, useClass: JwtAuthGuard }],
})
export class AppModule {}
