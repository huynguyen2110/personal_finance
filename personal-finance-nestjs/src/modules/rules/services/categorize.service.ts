import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { findMatchingRule, type RuleWithKind } from '../utils/rule-engine';

// Phân loại giao dịch theo quy tắc — dùng bởi module rules và email
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
        category: { select: { kind: true } },
      },
      orderBy: [{ priority: 'asc' }, { id: 'asc' }],
    });
  }

  // Áp dụng lại quy tắc. Mặc định chỉ đụng tới giao dịch chưa phân loại;
  // `includeRuleCategorized` = true thì phân loại lại cả giao dịch đã gán bằng quy tắc.
  // Không bao giờ ghi đè giao dịch người dùng đã tự chọn danh mục.
  async reapplyRules(opts: { includeRuleCategorized?: boolean } = {}): Promise<number> {
    const rules = await this.loadActiveRules();
    const txns = await this.prisma.transaction.findMany({
      where: { categorizedBy: opts.includeRuleCategorized ? { in: ['NONE', 'RULE'] } : 'NONE' },
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
        const r = await this.prisma.transaction.updateMany({
          where: { id: { in: chunk } },
          data: { categoryId, categorizedBy: categoryId ? 'RULE' : 'NONE' },
        });
        changed += r.count;
      }
    }
    return changed;
  }
}
