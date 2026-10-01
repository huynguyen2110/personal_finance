export interface StatsScope {
  from: string; // YYYY-MM-DD (VN)
  to: string; // YYYY-MM-DD (VN), bao gồm
  accountId?: number | null;
}

export interface Summary {
  income: number;
  expense: number;
  net: number;
  incomeCount: number;
  expenseCount: number;
  savingsRate: number | null; // (thu - chi) / thu
}

export interface MonthlyPoint {
  month: string;
  income: number;
  expense: number;
}

export interface DailyPoint {
  date: string;
  income: number;
  expense: number;
}

export interface CategoryTotal {
  categoryId: number | null;
  name: string;
  color: string;
  icon: string;
  total: number;
  count: number;
  // Danh mục 2 cấp: dòng cấp cao nhất gộp cả con; `children` là phần chi tiết của từng con
  parentId?: number | null;
  children?: CategoryTotal[];
}

export interface WeekdayPoint {
  weekday: number; // 0 = Chủ nhật … 6 = Thứ 7
  expense: number;
  count: number;
}

export interface CategoryMonthCell {
  categoryId: number | null;
  month: string;
  total: number;
}
