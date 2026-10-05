import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service';
import { monthOfDate, monthRange } from '../../../../common/utils/dates.util';
import { SettingsService } from '../../../../services/settings.service';
import type { Summary } from '../../stats/types/stats.types';
import { incomeMonthsIn, plannedSavingsFor } from '../utils/planned-income';
import { BudgetsService } from './budgets.service';

export interface PlannedMonthIncome {
  budget: number; // tổng hạn mức ngân sách của tháng
  savings: number; // tổng kế hoạch nạp tiết kiệm của tháng
  total: number;
}

// Chế độ "chỉ lấy email tiền đi" (Cài đặt → Loại email giao dịch): không theo dõi tiền vào nữa,
// thu nhập được tính = hạn mức ngân sách + kế hoạch tiết kiệm (xem utils/planned-income.ts).
// Giao dịch tiền vào vẫn nằm trong danh sách giao dịch nhưng không được cộng vào thu nhập.
@Injectable()
export class PlannedIncomeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly budgets: BudgetsService,
    private readonly settings: SettingsService,
  ) {}

  async isPlanned(): Promise<boolean> {
    return !(await this.settings.emailIncoming());
  }

  // Chỉ tính từ tháng (tài chính) chứa "ngày bắt đầu lấy dữ liệu từ email": các tháng trước đó chưa theo dõi
  // nên thu nhập kế hoạch = 0 (hạn mức mặc định áp cho mọi tháng, không được dùng cho tháng cũ). Chưa đặt ngày → không giới hạn.
  async byMonth(months: string[], startDay: number): Promise<Map<string, PlannedMonthIncome>> {
    const emailStart = await this.settings.emailStartDate();
    const firstMonth = emailStart ? monthOfDate(emailStart, startDay) : null;
    const unique = [...new Set(months)];
    const tracked = unique.filter((m) => !firstMonth || m >= firstMonth);
    const empty: PlannedMonthIncome = { budget: 0, savings: 0, total: 0 };
    if (!tracked.length) return new Map(unique.map((m) => [m, empty]));
    const [budgetByMonth, goals] = await Promise.all([
      this.budgets.budgetAmountsByMonth(tracked),
      this.prisma.savingsGoal.findMany({
        where: { monthlyPlan: { gt: 0 } },
        select: { monthlyPlan: true, createdAt: true, archivedAt: true, completedAt: true },
      }),
    ]);
    return new Map(
      unique.map((m) => {
        if (firstMonth && m < firstMonth) return [m, empty];
        const budget = budgetByMonth.get(m) ?? 0;
        const savings = plannedSavingsFor(goals, m, startDay);
        return [m, { budget, savings, total: budget + savings }];
      }),
    );
  }

  // Thu nhập kế hoạch của một kỳ: cộng tháng nào có ngày đầu tháng nằm trong kỳ
  async forRange(from: string, to: string, startDay: number): Promise<number> {
    const months = incomeMonthsIn(from, to, startDay);
    const plan = await this.byMonth(months, startDay);
    return months.reduce((s, m) => s + (plan.get(m)?.total ?? 0), 0);
  }

  // Thu nhập kế hoạch theo ngày: dồn cả tháng vào ngày đầu tháng (để vẽ biểu đồ theo ngày)
  async dailyFor(from: string, to: string, startDay: number): Promise<Map<string, number>> {
    const months = incomeMonthsIn(from, to, startDay);
    const plan = await this.byMonth(months, startDay);
    return new Map(months.map((m) => [monthRange(m, startDay).from, plan.get(m)?.total ?? 0]));
  }

  // Thay thu nhập thực trong một Summary bằng thu nhập kế hoạch. Kỳ lọc theo một tài khoản: thu nhập kế hoạch
  // không gắn với tài khoản nào nên để 0 (tỷ lệ tiết kiệm không xác định).
  async applyToSummary(summary: Summary, scope: { from: string; to: string; accountId?: number | null }, startDay: number): Promise<Summary> {
    const income = scope.accountId ? 0 : await this.forRange(scope.from, scope.to, startDay);
    return {
      ...summary,
      income,
      incomeCount: 0,
      net: income - summary.expense,
      savingsRate: income > 0 ? (income - summary.expense) / income : null,
    };
  }
}
