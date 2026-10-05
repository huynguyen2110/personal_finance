import type { TransactionDTO } from '@/modules/finance/transactions/types';
import type { AccountDTO } from '@/modules/finance/accounts/types';
import type { BudgetLine, GroupBudgetStatus } from '@/modules/finance/budgets/types';

export interface Summary {
  income: number;
  expense: number;
  net: number;
  incomeCount: number;
  expenseCount: number;
  savingsRate: number | null; // (thu - chi) / thu
}

export interface CategoryTotal {
  categoryId: number | null;
  name: string;
  color: string;
  icon: string;
  total: number;
  count: number;
  // Danh mục 2 cấp: dòng cấp cao nhất gộp cả con; `children` là chi tiết từng con
  parentId?: number | null;
  children?: CategoryTotal[];
}

export interface WeekdayPoint {
  weekday: number; // 0 = Chủ nhật … 6 = Thứ 7
  expense: number;
  count: number;
}

export type IncomeMode = 'ACTUAL' | 'PLANNED';

export interface DashboardData {
  period: { from: string; to: string };
  prevPeriod: { from: string; to: string };
  monthStartDay: number; // ngày bắt đầu tháng tài chính đang áp dụng
  summary: Summary;
  prevSummary: Summary;
  monthly: { month: string; income: number; expense: number }[];
  daily: {
    date: string;
    income: number;
    expense: number;
    cumulativeExpense: number;
    prevCumulativeExpense: number | null;
  }[];
  expenseByCategory: CategoryTotal[];
  incomeByCategory: CategoryTotal[];
  // PLANNED: chế độ chỉ lấy email tiền đi — thu nhập = hạn mức ngân sách + tiền tiết kiệm đã nạp trong tháng, không theo dõi số dư
  incomeMode: IncomeMode;
  weekday: WeekdayPoint[];
  topExpenses: TransactionDTO[];
  recent: TransactionDTO[];
  balances: AccountDTO[];
  totalBalance: number;
  budget: {
    month: string;
    totalBudget: number;
    totalSpent: number;
    showOnDailyChart: boolean;
    alerts: BudgetLine[];
    groupAlerts: GroupBudgetStatus[];
  };
  uncategorizedCount: number;
}

export interface ReportRow {
  categoryId: number | null;
  parentId: number | null; // dòng con thụt dưới dòng cha; dòng cha đã gộp số của con
  name: string;
  icon: string;
  color: string;
  values: number[]; // theo từng tháng trong months
  total: number;
  average: number;
}

export interface ReportData {
  months: string[];
  monthStartDay: number; // ngày bắt đầu tháng tài chính đang áp dụng
  monthly: {
    month: string;
    income: number;
    expense: number;
    net: number;
    savingsRate: number | null;
    prevYearIncome: number;
    prevYearExpense: number;
  }[];
  summary: Summary;
  monthCount: number;
  expenseRows: ReportRow[];
  incomeRows: ReportRow[];
  incomeMode: IncomeMode;
}
