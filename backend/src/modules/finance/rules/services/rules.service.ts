import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service';
import { normalizeText } from '../../../../common/utils/text.util';
import { compileRule } from '../utils/rule-engine';
import { CategorizeService } from './categorize.service';
import { CreateRuleDto, TestRuleDto, UpdateRuleDto } from '../dto/rule.dto';

@Injectable()
export class RulesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly categorize: CategorizeService,
  ) {}

  list() {
    return this.prisma.categoryRule.findMany({
      orderBy: [{ priority: 'asc' }, { id: 'asc' }],
      include: {
        category: { select: { id: true, name: true, icon: true, color: true, kind: true } },
        account: { select: { id: true, name: true } },
      },
    });
  }

  async create(dto: CreateRuleDto) {
    const matchType = dto.matchType ?? 'CONTAINS';
    if (!compileRule(matchType, dto.pattern)) throw new BadRequestException('Mẫu không hợp lệ');
    await this.assertNoDuplicate(dto.pattern, matchType, dto.accountId ?? null);
    return this.prisma.categoryRule.create({
      data: {
        pattern: dto.pattern,
        matchType,
        categoryId: dto.categoryId,
        priority: dto.priority ?? 100,
        isActive: dto.isActive ?? true,
        accountId: dto.accountId ?? null,
      },
    });
  }

  async update(id: number, dto: UpdateRuleDto) {
    const current = await this.prisma.categoryRule.findUniqueOrThrow({ where: { id } });
    if (!compileRule(dto.matchType ?? current.matchType, dto.pattern ?? current.pattern)) {
      throw new BadRequestException('Mẫu không hợp lệ');
    }
    if (dto.pattern !== undefined || dto.matchType !== undefined || dto.accountId !== undefined) {
      await this.assertNoDuplicate(
        dto.pattern ?? current.pattern,
        dto.matchType ?? current.matchType,
        dto.accountId !== undefined ? dto.accountId : current.accountId,
        id,
      );
    }
    return this.prisma.categoryRule.update({ where: { id }, data: dto });
  }

  // Không cho hai quy tắc cùng mẫu + kiểu khớp + phạm vi tài khoản (so sánh không phân biệt hoa thường/khoảng trắng thừa)
  private async assertNoDuplicate(pattern: string, matchType: 'CONTAINS' | 'REGEX', accountId: number | null, excludeId?: number) {
    const normalized = pattern.trim().replace(/\s+/g, ' ');
    const dup = await this.prisma.categoryRule.findFirst({
      where: { pattern: normalized, matchType, accountId, ...(excludeId ? { id: { not: excludeId } } : {}) },
      include: { category: { select: { name: true } } },
    });
    if (dup) {
      throw new BadRequestException(`Đã có quy tắc với mẫu này (→ ${dup.category.name}). Hãy sửa quy tắc đó thay vì tạo mới.`);
    }
  }

  async remove(id: number) {
    await this.prisma.categoryRule.delete({ where: { id } });
    return { ok: true };
  }

  // Thử xem một nội dung chuyển khoản sẽ được phân loại thế nào (quy tắc nào khớp, hay rơi về nhóm của tài khoản)
  async test(dto: TestRuleDto) {
    const ctx = await this.categorize.loadContext();
    const r = this.categorize.resolve(ctx, { content: dto.content, direction: dto.direction, accountId: dto.accountId ?? 0 });
    const category = r.categoryId
      ? await this.prisma.category.findUnique({
          where: { id: r.categoryId },
          select: { id: true, name: true, icon: true, color: true, kind: true },
        })
      : null;
    return {
      normalized: normalizeText(dto.content),
      rule: r.rule ? { id: r.rule.id, pattern: r.rule.pattern, matchType: r.rule.matchType, accountId: r.rule.accountId } : null,
      category,
      categorizedBy: r.categorizedBy,
    };
  }
}
