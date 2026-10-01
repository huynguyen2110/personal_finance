import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { normalizeText } from '../../../common/utils/text.util';
import { compileRule, findMatchingRule } from '../utils/rule-engine';
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
      include: { category: { select: { id: true, name: true, icon: true, color: true, kind: true } } },
    });
  }

  create(dto: CreateRuleDto) {
    const matchType = dto.matchType ?? 'CONTAINS';
    if (!compileRule(matchType, dto.pattern)) throw new BadRequestException('Mẫu không hợp lệ');
    return this.prisma.categoryRule.create({
      data: {
        pattern: dto.pattern,
        matchType,
        categoryId: dto.categoryId,
        priority: dto.priority ?? 100,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async update(id: number, dto: UpdateRuleDto) {
    const current = await this.prisma.categoryRule.findUniqueOrThrow({ where: { id } });
    if (!compileRule(dto.matchType ?? current.matchType, dto.pattern ?? current.pattern)) {
      throw new BadRequestException('Mẫu không hợp lệ');
    }
    return this.prisma.categoryRule.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    await this.prisma.categoryRule.delete({ where: { id } });
    return { ok: true };
  }

  // Thử xem một nội dung chuyển khoản sẽ khớp quy tắc nào
  async test(dto: TestRuleDto) {
    const rule = findMatchingRule(await this.categorize.loadActiveRules(), dto.content, dto.direction);
    const category = rule
      ? await this.prisma.category.findUnique({
          where: { id: rule.categoryId },
          select: { id: true, name: true, icon: true, color: true, kind: true },
        })
      : null;
    return {
      normalized: normalizeText(dto.content),
      rule: rule ? { id: rule.id, pattern: rule.pattern, matchType: rule.matchType } : null,
      category,
    };
  }
}
