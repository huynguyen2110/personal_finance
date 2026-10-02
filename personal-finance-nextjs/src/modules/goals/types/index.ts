import type { Direction } from '@/types/common';

export type GoalJar = 'SAFETY' | 'PURCHASE' | 'EXPERIENCE' | 'INVESTMENT' | 'SELF' | 'OTHER';
export type GoalPriority = 'HIGH' | 'NORMAL' | 'FLEXIBLE';
export type GoalStatus = 'done' | 'overdue' | 'on_track' | 'behind' | 'no_deadline' | 'no_plan';
// SPEND: tiêu tiền của quỹ cho đúng mục đích — không làm giảm tiến độ, chỉ giảm số còn trong quỹ
export type ContributionKind = 'OPENING' | 'DEPOSIT' | 'WITHDRAW' | 'INTEREST' | 'SPEND';
export type SpendStatus = 'unspent' | 'partial' | 'spent';

export interface GoalDTO {
  id: number;
  name: string;
  icon: string;
  jar: GoalJar;
  priority: GoalPriority;
  // Quỹ duy trì (VD quỹ khẩn cấp): tiến độ tính theo số còn trong quỹ → tiêu bớt thì quay lại tích lũy
  ongoing: boolean;
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

  saved: number; // đã tích lũy (nạp + lãi − rút)
  current: number; // số tính tiến độ: quỹ duy trì = còn trong quỹ, quỹ một lần = đã tích lũy
  remaining: number;
  progress: number; // 0..1+
  spent: number; // đã tiêu từ quỹ
  balance: number; // còn trong quỹ = đã tích lũy − đã tiêu
  spendStatus: SpendStatus;
  lastSpentAt: string | null;
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

  // planDate: ngày nạp kế hoạch trong tháng (tài chính) này, null nếu không đặt ngày
  thisMonth: { deposited: number; due: number; dueNow: boolean; planDate: string | null };
  milestone: { amount: number; label: string; reached: boolean } | null;
  coverMonths: number | null; // quỹ khẩn cấp: đủ chi tiêu bao nhiêu tháng
}

export type HealthFactorKey = 'emergency' | 'savingsRate' | 'discipline' | 'onTrack';
export type HealthLevel = 'excellent' | 'stable' | 'improve' | 'alert';

// Thống kê đầu trang (chỉ tính mục tiêu chưa lưu trữ)
export interface GoalsOverviewData {
  totalBalance: number; // đang nằm trong các quỹ
  totalSaved: number;
  totalSpent: number;
  savedThisMonth: number; // nạp + lãi − rút trong tháng
  savedLastMonth: number;
  ongoing: { count: number; balance: number; target: number; share: number; refill: number };
  oneTime: { count: number; current: number; target: number; done: number };
  statusCounts: { on_track: number; behind: number; overdue: number };
  health: {
    score: number | null; // 0..100
    level: HealthLevel | null;
    factors: { key: HealthFactorKey; weight: number; score: number | null }[];
    emergencyMonths: number | null;
    emergencyTargetMonths: number;
    savingsRate: number | null;
    goodSavingsRate: number;
    disciplineRatio: number | null;
    onTrack: { ok: number; total: number };
  };
}

export interface GoalsPageData {
  month: string;
  // Khoảng ngày của tháng (tài chính) hiện tại theo cài đặt ngày bắt đầu tháng
  range: { from: string; to: string };
  monthStartDay: number;
  today: string;
  goals: GoalDTO[];
  avgMonthlyExpense: number | null;
  overview: GoalsOverviewData;
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
  ongoing?: boolean;
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
