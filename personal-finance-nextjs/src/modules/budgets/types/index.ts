export interface BudgetLine {
  categoryId: number;
  parentId: number | null; // danh mục 2 cấp: con trỏ về cha
  name: string;
  icon: string;
  color: string;
  // Hạn mức hiệu lực của tháng (null = chưa đặt). Danh mục cha chưa đặt riêng: tổng hạn mức các con.
  amount: number | null;
  // MONTH: đặt riêng cho tháng; DEFAULT: dùng mặc định; CHILDREN: gộp từ hạn mức các con
  source: 'MONTH' | 'DEFAULT' | 'CHILDREN' | null;
  defaultAmount: number | null;
  spent: number; // danh mục cha: cộng cả các con
  count: number; // số giao dịch chi trong tháng (cha: cộng cả con)
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
