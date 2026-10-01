export interface BudgetLine {
  categoryId: number;
  name: string;
  icon: string;
  color: string;
  amount: number | null; // hạn mức hiệu lực của tháng (null = chưa đặt)
  source: 'MONTH' | 'DEFAULT' | null; // đặt riêng cho tháng / dùng mặc định
  defaultAmount: number | null;
  spent: number;
  count: number; // số giao dịch chi trong tháng
  prevSpent: number; // đã chi tháng trước (để so sánh)
  percent: number | null;
}

export interface BudgetMonthTotals {
  month: string;
  budget: number; // tổng hạn mức hiệu lực
  spentBudgeted: number; // đã chi ở các danh mục có hạn mức
  expense: number; // tổng chi cả tháng (mọi danh mục, kể cả chưa phân loại)
}

export interface BudgetPageData {
  month: string;
  lines: BudgetLine[];
  income: number;
  expense: number;
  history: BudgetMonthTotals[];
}

// month: "YYYY-MM" (riêng tháng) hoặc "*" (mặc định); amount null = xóa hạn mức
export interface BudgetItemInput {
  categoryId: number;
  month: string;
  amount: number | null;
}
