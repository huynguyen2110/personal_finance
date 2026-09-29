import { z } from 'zod';

// Mỗi thực thể có 2 schema: *Create (có giá trị mặc định) và *Patch (không mặc định).
// Lưu ý: với zod v4, `.partial()` trên schema có `.default()` vẫn điền giá trị mặc định cho trường
// không gửi lên → PATCH một trường sẽ vô tình ghi đè các trường khác. Vì vậy Patch dùng bản không mặc định.

const categoryFields = {
  name: z.string().trim().min(1, { error: 'Nhập tên danh mục' }).max(60),
  kind: z.enum(['EXPENSE', 'INCOME']),
  icon: z.string().max(40),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, { error: 'Màu không hợp lệ' }),
  sortOrder: z.number().int(),
};

export const CategoryCreate = z.object({
  ...categoryFields,
  icon: categoryFields.icon.default('Tag'),
  color: categoryFields.color.default('#64748B'),
  sortOrder: categoryFields.sortOrder.optional(),
});
export const CategoryPatch = z.object(categoryFields).partial();

const ruleFields = {
  pattern: z.string().trim().min(1, { error: 'Nhập từ khóa' }).max(500),
  matchType: z.enum(['CONTAINS', 'REGEX']),
  categoryId: z.number().int().positive(),
  priority: z.number().int().min(0).max(10000),
  isActive: z.boolean(),
};

export const RuleCreate = z.object({
  ...ruleFields,
  matchType: ruleFields.matchType.default('CONTAINS'),
  priority: ruleFields.priority.default(100),
  isActive: ruleFields.isActive.default(true),
});
export const RulePatch = z.object(ruleFields).partial();

const accountFields = {
  type: z.enum(['BANK', 'CASH']),
  name: z.string().trim().min(1, { error: 'Nhập tên tài khoản' }).max(80),
  bankName: z.string().trim().max(60).nullable(),
  accountNumber: z.string().trim().max(40).nullable(),
  openingBalance: z.number().int().min(-1e13).max(1e13),
  isActive: z.boolean(),
};

export const AccountCreate = z.object({
  ...accountFields,
  type: accountFields.type.default('CASH'),
  bankName: accountFields.bankName.optional(),
  accountNumber: accountFields.accountNumber.optional(),
  openingBalance: accountFields.openingBalance.default(0),
  isActive: accountFields.isActive.default(true),
});
// Số tài khoản dùng để khớp email ngân hàng nên không cho sửa sau khi tạo
export const AccountPatch = z.object(accountFields).omit({ type: true, accountNumber: true }).partial();
