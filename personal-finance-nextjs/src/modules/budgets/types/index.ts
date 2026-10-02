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

// Một nhóm chi tiêu trong khung của một tài khoản
export interface GroupBudgetLine {
  groupId: number;
  name: string;
  icon: string;
  color: string;
  categoryIds: number[]; // danh mục cha trong nhóm
  budget: number | null; // tổng hạn mức hiệu lực của các danh mục cha (null = chưa đặt)
  spent: number; // đã chi từ tài khoản này vào các danh mục của nhóm
  count: number;
  sharedAccounts: number; // số tài khoản khác cũng gán nhóm này
}

// Ngân sách theo tài khoản: hạn mức các nhóm đã gán đang phân bổ cho tài khoản đó bao nhiêu, đã chi bao nhiêu
export interface AccountBudgetLine {
  accountId: number;
  name: string;
  type: 'BANK' | 'CASH';
  bankName: string | null;
  planned: number; // tổng hạn mức các nhóm đã gán
  spent: number; // tổng chi thực tế từ tài khoản trong tháng
  spentInGroups: number;
  spentOutside: number;
  groups: GroupBudgetLine[];
}

export interface BudgetPageData {
  month: string;
  // Khoảng ngày thực của tháng theo cài đặt ngày bắt đầu tháng (VD ngày lương 5: 05/10 → 04/11)
  range: { from: string; to: string };
  monthStartDay: number;
  lines: BudgetLine[];
  income: number;
  expense: number;
  history: BudgetMonthTotals[];
  accounts: AccountBudgetLine[];
  unassignedGroups: GroupBudgetLine[];
}


// month: "YYYY-MM" (riêng tháng) hoặc "*" (mặc định); amount null = xóa hạn mức
export interface BudgetItemInput {
  categoryId: number;
  month: string;
  amount: number | null;
}
