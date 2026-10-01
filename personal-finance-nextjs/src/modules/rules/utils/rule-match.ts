import { normalizeText } from '@/lib/text';
import type { CategoryKind, Direction } from '@/types/common';
import type { MatchType, RuleDTO } from '../types';

// Bản sao phía client của bộ khớp quy tắc (personal-finance-nestjs/src/modules/rules/utils/rule-engine.ts).
// Chỉ dùng để hiển thị (tô sáng từ khóa, giải thích vì sao khớp); kết quả thật vẫn do server quyết định.

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const cache = new Map<string, RegExp | null>();

// Biên dịch quy tắc; cờ "d" để lấy vị trí nhóm khớp (tô sáng đúng từ khóa, không lấy ký tự biên)
export function compileRule(matchType: MatchType, pattern: string): RegExp | null {
  const key = `${matchType}:${pattern}`;
  if (cache.has(key)) return cache.get(key)!;
  let re: RegExp | null = null;
  try {
    if (matchType === 'REGEX') {
      re = new RegExp(pattern, 'id');
    } else {
      const words = pattern
        .split(',')
        .map((w) => normalizeText(w))
        .filter(Boolean)
        .map(escapeRegex);
      if (words.length) re = new RegExp(`(?:^|[^A-Z0-9])(${words.join('|')})(?:[^A-Z0-9]|$)`, 'd');
    }
  } catch {
    re = null;
  }
  cache.set(key, re);
  return re;
}

export const kindForDirection = (d: Direction): CategoryKind => (d === 'IN' ? 'INCOME' : 'EXPENSE');

// Danh sách từ khóa của quy tắc CONTAINS (REGEX trả về mảng 1 phần tử là chính mẫu)
export function ruleKeywords(rule: Pick<RuleDTO, 'pattern' | 'matchType'>): string[] {
  if (rule.matchType === 'REGEX') return [rule.pattern];
  return rule.pattern.split(',').map((w) => w.trim()).filter(Boolean);
}

// Quy tắc đầu tiên khớp theo thứ tự ưu tiên (số nhỏ trước), hoặc null.
// `accountId`: quy tắc giới hạn theo tài khoản chỉ khớp đúng tài khoản đó (null = chỉ xét quy tắc chung).
export function findMatchingRule(rules: RuleDTO[], content: string, direction: Direction, accountId: number | null = null): RuleDTO | null {
  const normalized = normalizeText(content);
  const kind = kindForDirection(direction);
  const sorted = [...rules].filter((r) => r.isActive).sort((a, b) => a.priority - b.priority || a.id - b.id);
  for (const r of sorted) {
    if (r.category.kind !== kind) continue;
    if (r.accountId !== null && r.accountId !== accountId) continue;
    const re = compileRule(r.matchType, r.pattern);
    if (re && re.test(normalized)) return r;
  }
  return null;
}

const MARKS = /[̀-ͯ]/g;

// Chuẩn hóa từng ký tự và giữ ánh xạ vị trí → tìm được đoạn khớp trên nội dung GỐC
function normalizeWithMap(s: string): { text: string; map: number[] } {
  let text = '';
  const map: number[] = [];
  for (let i = 0; i < s.length; i++) {
    const n = s[i].normalize('NFD').replace(MARKS, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toUpperCase();
    for (const ch of n) {
      text += ch;
      map.push(i);
    }
  }
  return { text, map };
}

type ExecWithIndices = RegExpExecArray & { indices?: Array<[number, number] | undefined> };

// Vị trí [start, end) của đoạn khớp trong nội dung gốc, hoặc null nếu không tìm được
export function matchSpan(rule: Pick<RuleDTO, 'pattern' | 'matchType'>, content: string): [number, number] | null {
  const re = compileRule(rule.matchType, rule.pattern);
  if (!re) return null;
  const { text, map } = normalizeWithMap(content);
  const m = re.exec(text) as ExecWithIndices | null;
  if (!m) return null;
  const group = rule.matchType === 'CONTAINS' ? m.indices?.[1] : undefined;
  const [a, b] = group ?? [m.index, m.index + m[0].length];
  if (b <= a || map[a] === undefined || map[b - 1] === undefined) return null;
  return [map[a], map[b - 1] + 1];
}
