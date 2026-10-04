import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './database/prisma.module';
import { SharedServicesModule } from './services/shared-services.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { AuthModule } from './modules/auth/auth.module';
import { FinanceModule } from './modules/finance/finance.module';
import { MindmapModule } from './modules/mindmap/mindmap.module';

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
    // Các module lớn của ứng dụng (launcher ở frontend liệt kê tương ứng)
    FinanceModule, // api/accounts, api/transactions, api/goals…
    MindmapModule, // api/mindmap/*
  ],
  // Mọi route cần đăng nhập, trừ route đánh dấu @Public()
  providers: [{ provide: APP_GUARD, useClass: JwtAuthGuard }],
})
export class AppModule {}
