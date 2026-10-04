import { compileRule, findMatchingRule, type RuleWithKind } from './rule-engine';

const rule = (
  id: number,
  pattern: string,
  kind: 'EXPENSE' | 'INCOME',
  matchType: 'CONTAINS' | 'REGEX' = 'CONTAINS',
  priority = 100,
  accountId: number | null = null,
): RuleWithKind => ({
  id,
  pattern,
  matchType,
  categoryId: id * 10,
  priority,
  accountId,
  category: { kind },
});

describe('rule-engine', () => {
  const rules = [
    rule(2, 'LUONG', 'INCOME', 'CONTAINS', 10),
    rule(1, 'GRAB, XANH SM', 'EXPENSE'),
    rule(3, 'CK DEN .* ME', 'EXPENSE', 'REGEX'),
  ];

  it('khớp nguyên từ, không phân biệt dấu/hoa thường', () => {
    expect(findMatchingRule(rules, 'GRAB*123 HCM', 'OUT')?.id).toBe(1);
    expect(findMatchingRule(rules, 'Xanh SM chuyến đi', 'OUT')?.id).toBe(1);
    expect(findMatchingRule(rules, 'GRABFOOD dh', 'OUT')).toBeNull(); // không dính chữ
  });

  it('chỉ áp dụng cho giao dịch cùng chiều với loại danh mục', () => {
    expect(findMatchingRule(rules, 'Công ty trả lương T9', 'IN')?.id).toBe(2);
    expect(findMatchingRule(rules, 'lương', 'OUT')).toBeNull();
  });

  it('hỗ trợ regex trên nội dung đã bỏ dấu', () => {
    expect(findMatchingRule(rules, 'ck đến chuyen cho me', 'OUT')?.id).toBe(3);
  });

  it('quy tắc giới hạn theo tài khoản chỉ khớp đúng tài khoản đó', () => {
    // Cùng từ khóa: VCB → danh mục 40, các tài khoản khác → quy tắc chung 50
    const scoped = [rule(4, 'WINMART', 'EXPENSE', 'CONTAINS', 10, 1), rule(5, 'WINMART', 'EXPENSE', 'CONTAINS', 20)];
    expect(findMatchingRule(scoped, 'WINMART+ TRAN NAO', 'OUT', 1)?.id).toBe(4);
    expect(findMatchingRule(scoped, 'WINMART+ TRAN NAO', 'OUT', 2)?.id).toBe(5);
    expect(findMatchingRule(scoped, 'WINMART+ TRAN NAO', 'OUT')?.id).toBe(5); // chưa biết tài khoản → chỉ quy tắc chung
    expect(findMatchingRule([scoped[0]], 'WINMART+ TRAN NAO', 'OUT', 2)).toBeNull();
  });

  it('regex lỗi bị bỏ qua thay vì ném lỗi', () => {
    expect(compileRule('REGEX', '(unclosed')).toBeNull();
  });
});
