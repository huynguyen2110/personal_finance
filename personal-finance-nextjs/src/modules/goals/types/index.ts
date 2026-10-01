import type { Direction } from '@/types/common';

export type GoalJar = 'SAFETY' | 'PURCHASE' | 'EXPERIENCE' | 'INVESTMENT' | 'SELF' | 'OTHER';
export type GoalPriority = 'HIGH' | 'NORMAL' | 'FLEXIBLE';
export type GoalStatus = 'done' | 'overdue' | 'on_track' | 'behind' | 'no_deadline' | 'no_plan';
export type ContributionKind = 'OPENING' | 'DEPOSIT' | 'WITHDRAW' | 'INTEREST';

export interface GoalDTO {
  id: number;
  name: string;
  icon: string;
  jar: GoalJar;
  priority: GoalPriority;
  targetAmount: number;
  deadline: string | null; // "YYYY-MM"
  monthlyPlan: number | null;
  planDay: number | null;
  sourceAccount: { id: number; name: string } | null;
  holdingAccount: { id: number; name: string } | null;
  holdingName: string | null;
  interestRate: number | null; // %/năm
  note: string | null;
  completedAt: string | null;
  archivedAt: string | null;
  createdAt: string;

  saved: number;
  remaining: number;
  progress: number; // 0..1+
  contributionCount: number;
  lastContributionAt: string | null;

  pace: number; // tốc độ nạp thực tế/tháng (3 tháng gần nhất)
  monthlyRate: number; // tốc độ dùng để dự báo (kế hoạch, không có thì thực tế)
  projectedMonth: string | null;
  projectedMonths: number | null;
  monthsLeft: number | null;
  requiredMonthly: number | null;
  status: GoalStatus;
  horizon: 'short' | 'long' | null;

  monthlyInterest: number;
  interestToFinish: number;

  thisMonth: { deposited: number; due: number; dueNow: boolean };
  milestone: { amount: number; label: string; reached: boolean } | null;
  coverMonths: number | null; // quỹ khẩn cấp: đủ chi tiêu bao nhiêu tháng
}

export interface GoalsPageData {
  month: string;
  today: string;
  goals: GoalDTO[];
  avgMonthlyExpense: number | null;
  surplus: {
    income: number;
    expense: number;
    deposited: number;
    available: number;
    suggestion: { goalId: number; amount: number } | null;
  };
  discipline: { grade: 'A+' | 'A' | 'B' | 'C' | 'D'; ratio: number; planned: number; actual: number; goals: number } | null;
}

export interface GoalInput {
  name?: string;
  icon?: string;
  jar?: GoalJar;
  priority?: GoalPriority;
  targetAmount?: number;
  deadline?: string | null;
  monthlyPlan?: number | null;
  planDay?: number | null;
  sourceAccountId?: number | null;
  holdingAccountId?: number | null;
  holdingName?: string | null;
  interestRate?: number | null;
  note?: string | null;
  initialAmount?: number;
}

export interface ContributionDTO {
  id: number;
  goalId: number;
  kind: ContributionKind;
  amount: number;
  date: string;
  note: string | null;
  transactionId: number | null;
  excludedTxn: boolean;
  transaction: {
    id: number;
    content: string;
    transactionDate: string;
    direction: Direction;
    account: { id: number; name: string };
  } | null;
}

export interface ContributionInput {
  kind: Exclude<ContributionKind, 'OPENING'>;
  amount?: number;
  date?: string;
  note?: string | null;
  transactionId?: number | null;
  excludeFromStats?: boolean;
}

export interface LinkableTxn {
  id: number;
  direction: Direction;
  amount: number;
  content: string;
  transactionDate: string;
  excludeFromStats: boolean;
  account: { id: number; name: string };
}
