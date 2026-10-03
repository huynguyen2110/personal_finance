import { budgetTotalsOf, categoriesBudgetOf, familyAmount } from './budget-math';

const line = (categoryId: number, amount: number | null, spent: number, parentId: number | null = null) => ({ categoryId, parentId, amount, spent });

describe('budgetTotalsOf', () => {
  const lines = [
    line(1, 1_000_000, 400_000), // Di chuyển (trong nhóm A)
    line(2, null, 900_000), // Điện nước (trong nhóm A, chưa đặt riêng)
    line(3, 2_000_000, 1_500_000), // Ăn uống (không thuộc nhóm có hạn mức)
    line(4, 500_000, 100_000, 3), // con của Ăn uống: không cộng thêm vì cha đã gộp
    line(5, null, 300_000), // chưa đặt hạn mức, không thuộc nhóm
  ];

  it('chỉ có hạn mức danh mục: cộng các danh mục cha có hạn mức', () => {
    expect(budgetTotalsOf(lines, [])).toEqual({ budget: 3_000_000, spentBudgeted: 1_900_000 });
  });

  it('nhóm có hạn mức riêng: tính theo nhóm, bỏ các danh mục bên trong để không trùng', () => {
    const groups = [{ categoryIds: [1, 2], amount: 2_500_000, spent: 1_300_000 }];
    expect(budgetTotalsOf(lines, groups)).toEqual({ budget: 4_500_000, spentBudgeted: 2_800_000 });
  });

  it('nhóm chưa đặt hạn mức: không ảnh hưởng tổng', () => {
    const groups = [{ categoryIds: [1, 2], amount: null, spent: 1_300_000 }];
    expect(budgetTotalsOf(lines, groups)).toEqual(budgetTotalsOf(lines, []));
  });
});

describe('familyAmount / categoriesBudgetOf', () => {
  it('cha có hạn mức riêng thì dùng của cha, không thì tổng các con', () => {
    expect(familyAmount(1_000, [300, 200])).toBe(1_000);
    expect(familyAmount(null, [300, null, 200])).toBe(500);
    expect(familyAmount(null, [null])).toBeNull();
  });

  it('tổng phần chiếm của các danh mục trong nhóm; null khi chưa danh mục nào đặt', () => {
    expect(categoriesBudgetOf([{ own: 1_000, children: [] }, { own: null, children: [200, 300] }])).toBe(1_500);
    expect(categoriesBudgetOf([{ own: null, children: [] }, { own: null, children: [null] }])).toBeNull();
  });
});
