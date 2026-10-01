import { Injectable } from '@nestjs/common';
import type { CategorizedBy, CategoryKind } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { findMatchingRule, kindForDirection, type RuleWithKind } from '../utils/rule-engine';

// Danh mục "mặc định theo tài khoản": tài khoản gán đúng MỘT nhóm của loại (chi/thu) đó
// → giao dịch không khớp quy tắc nào được gán vào danh mục mặc định của nhóm.
export type AccountDefaults = Map<number, Partial<Record<CategoryKind, number>>>;

export interface CategorizeContext {
  rules: RuleWithKind[];
  defaults: AccountDefaults;
}

export interface CategorizeResult {
  categoryId: number | null;
  categorizedBy: CategorizedBy;
  rule: RuleWithKind | null;
}

// Phân loại giao dịch theo quy tắc + nhóm của tài khoản — dùng bởi module rules và email
@Injectable()
export class CategorizeService {
  constructor(private readonly prisma: PrismaService) {}

  loadActiveRules(): Promise<RuleWithKind[]> {
    return this.prisma.categoryRule.findMany({
      where: { isActive: true },
      select: {
        id: true,
        pattern: true,
        matchType: true,
        categoryId: true,
        priority: true,
        accountId: true,
        category: { select: { kind: true } },
      },
      orderBy: [{ priority: 'asc' }, { id: 'asc' }],
    });
  }

  // Danh mục mặc định của nhóm: khai báo rõ, hoặc danh mục cha duy nhất trong nhóm
  async loadAccountDefaults(): Promise<AccountDefaults> {
    const links = await this.prisma.accountCategoryGroup.findMany({
      select: {
        accountId: true,
        group: {
          select: { kind: true, defaultCategoryId: true, categories: { where: { parentId: null }, select: { id: true } } },
        },
      },
    });
    const groupsOf = new Map<string, { defaultCategoryId: number | null; categoryIds: number[] }[]>();
    for (const l of links) {
      const key = `${l.accountId}:${l.group.kind}`;
      if (!groupsOf.has(key)) groupsOf.set(key, []);
      groupsOf.get(key)!.push({ defaultCategoryId: l.group.defaultCategoryId, categoryIds: l.group.categories.map((c) => c.id) });
    }
    const out: AccountDefaults = new Map();
    for (const [key, groups] of groupsOf) {
      if (groups.length !== 1) continue; // nhiều nhóm → không đoán được
      const g = groups[0];
      const categoryId = g.defaultCategoryId ?? (g.categoryIds.length === 1 ? g.categoryIds[0] : null);
      if (!categoryId) continue;
      const [accountId, kind] = key.split(':') as [string, CategoryKind];
      const cur = out.get(Number(accountId)) ?? {};
      cur[kind] = categoryId;
      out.set(Number(accountId), cur);
    }
    return out;
  }

  async loadContext(): Promise<CategorizeContext> {
    const [rules, defaults] = await Promise.all([this.loadActiveRules(), this.loadAccountDefaults()]);
    return { rules, defaults };
  }

  // Quy tắc khớp → RULE; không thì danh mục mặc định theo tài khoản → ACCOUNT; còn lại NONE.
  // Giao dịch bị loại khỏi thống kê (VD chuyển nội bộ) không đoán theo tài khoản — chỉ quy tắc rõ ràng mới gán.
  resolve(
    ctx: CategorizeContext,
    t: { content: string; direction: 'IN' | 'OUT'; accountId: number; excludeFromStats?: boolean },
  ): CategorizeResult {
    const rule = findMatchingRule(ctx.rules, t.content, t.direction, t.accountId);
    if (rule) return { categoryId: rule.categoryId, categorizedBy: 'RULE', rule };
    const fallback = t.excludeFromStats ? undefined : ctx.defaults.get(t.accountId)?.[kindForDirection(t.direction)];
    if (fallback) return { categoryId: fallback, categorizedBy: 'ACCOUNT', rule: null };
    return { categoryId: null, categorizedBy: 'NONE', rule: null };
  }

  // Áp dụng lại phân loại tự động. Mặc định chỉ đụng tới giao dịch chưa phân loại hoặc gán theo tài khoản;
  // `includeRuleCategorized` = true thì phân loại lại cả giao dịch đã gán bằng quy tắc.
  // Không bao giờ ghi đè giao dịch người dùng đã tự chọn danh mục.
  async reapplyRules(opts: { includeRuleCategorized?: boolean } = {}): Promise<number> {
    const ctx = await this.loadContext();
    const txns = await this.prisma.transaction.findMany({
      where: { categorizedBy: { in: opts.includeRuleCategorized ? ['NONE', 'ACCOUNT', 'RULE'] : ['NONE', 'ACCOUNT'] } },
      select: { id: true, content: true, direction: true, accountId: true, categoryId: true, categorizedBy: true, excludeFromStats: true },
    });

    // Gom theo (danh mục, cách gán) để updateMany theo lô
    const buckets = new Map<string, { categoryId: number | null; categorizedBy: CategorizedBy; ids: number[] }>();
    for (const t of txns) {
      const next = this.resolve(ctx, t);
      if (next.categoryId === t.categoryId && next.categorizedBy === t.categorizedBy) continue;
      const key = `${next.categoryId ?? 'null'}:${next.categorizedBy}`;
      if (!buckets.has(key)) buckets.set(key, { categoryId: next.categoryId, categorizedBy: next.categorizedBy, ids: [] });
      buckets.get(key)!.ids.push(t.id);
    }

    let changed = 0;
    for (const b of buckets.values()) {
      for (let i = 0; i < b.ids.length; i += 1000) {
        const r = await this.prisma.transaction.updateMany({
          where: { id: { in: b.ids.slice(i, i + 1000) } },
          data: { categoryId: b.categoryId, categorizedBy: b.categorizedBy },
        });
        changed += r.count;
      }
    }
    return changed;
  }
}
