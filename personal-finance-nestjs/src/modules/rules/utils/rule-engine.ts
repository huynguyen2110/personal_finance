import type { CategoryKind, CategoryRule, MatchType } from '@prisma/client';
import { normalizeText } from '../../../common/utils/text.util';

// Bộ khớp quy tắc phân loại (thuần, không truy cập DB)

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
export function findMatchingRule(rules: RuleWithKind[], content: string, direction: 'IN' | 'OUT'): RuleWithKind | null {
  const normalized = normalizeText(content);
  for (const r of rules) {
    if (matchRule(r, normalized, direction)) return r;
  }
  return null;
}
