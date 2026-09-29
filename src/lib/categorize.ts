import type { CategoryKind, CategoryRule, MatchType } from '@prisma/client';
import prisma from './prisma';
import { normalizeText } from './text';

export { normalizeText };

export type RuleWithKind = Pick<CategoryRule, 'id' | 'pattern' | 'matchType' | 'categoryId' | 'priority'> & {
  category: { kind: CategoryKind };
};

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Cache regex đã biên dịch theo (matchType, pattern)
const regexCache = new Map<string, RegExp | null>();

export function compileRule(matchType: MatchType, pattern: string): RegExp | null {
  const key = `${matchType}:${pattern}`;
  if (regexCache.has(key)) return regexCache.get(key)!;
  let re: RegExp | null = null;
  try {
    if (matchType === 'REGEX') {
      re = new RegExp(pattern, 'i');
    } else {
      const words = pattern
        .split(',')
        .map((w) => normalizeText(w))
        .filter(Boolean)
        .map(escapeRegex);
      // Khớp nguyên từ: không dính chữ/số ở hai đầu
      if (words.length) re = new RegExp(`(?:^|[^A-Z0-9])(?:${words.join('|')})(?:[^A-Z0-9]|$)`);
    }
  } catch {
    re = null; // regex không hợp lệ → bỏ qua rule
  }
  regexCache.set(key, re);
  return re;
}

export function kindForDirection(direction: 'IN' | 'OUT'): CategoryKind {
  return direction === 'IN' ? 'INCOME' : 'EXPENSE';
}

export function matchRule(rule: RuleWithKind, normalized: string, direction: 'IN' | 'OUT'): boolean {
  if (rule.category.kind !== kindForDirection(direction)) return false;
  const re = compileRule(rule.matchType, rule.pattern);
  return !!re && re.test(normalized);
}

// Trả về rule đầu tiên khớp (theo priority tăng dần), hoặc null.
export function findMatchingRule(
  rules: RuleWithKind[],
  content: string,
  direction: 'IN' | 'OUT'
): RuleWithKind | null {
  const normalized = normalizeText(content);
  for (const r of rules) {
    if (matchRule(r, normalized, direction)) return r;
  }
  return null;
}

export async function loadActiveRules(): Promise<RuleWithKind[]> {
  return prisma.categoryRule.findMany({
    where: { isActive: true },
    select: {
      id: true,
      pattern: true,
      matchType: true,
      categoryId: true,
      priority: true,
      category: { select: { kind: true } },
    },
    orderBy: [{ priority: 'asc' }, { id: 'asc' }],
  });
}

// Áp dụng lại quy tắc. Mặc định chỉ đụng tới giao dịch chưa phân loại;
// `includeRuleCategorized` = true thì phân loại lại cả giao dịch đã gán bằng quy tắc.
// Không bao giờ ghi đè giao dịch người dùng đã tự chọn danh mục.
export async function reapplyRules(opts: { includeRuleCategorized?: boolean } = {}): Promise<number> {
  const rules = await loadActiveRules();
  const txns = await prisma.transaction.findMany({
    where: {
      categorizedBy: opts.includeRuleCategorized ? { in: ['NONE', 'RULE'] } : 'NONE',
    },
    select: { id: true, content: true, direction: true, categoryId: true },
  });

  const byCategory = new Map<number | null, number[]>();
  for (const t of txns) {
    const rule = findMatchingRule(rules, t.content, t.direction);
    const next = rule?.categoryId ?? null;
    if (next === t.categoryId) continue;
    if (!byCategory.has(next)) byCategory.set(next, []);
    byCategory.get(next)!.push(t.id);
  }

  let changed = 0;
  for (const [categoryId, ids] of byCategory) {
    for (let i = 0; i < ids.length; i += 1000) {
      const chunk = ids.slice(i, i + 1000);
      const r = await prisma.transaction.updateMany({
        where: { id: { in: chunk } },
        data: { categoryId, categorizedBy: categoryId ? 'RULE' : 'NONE' },
      });
      changed += r.count;
    }
  }
  return changed;
}
