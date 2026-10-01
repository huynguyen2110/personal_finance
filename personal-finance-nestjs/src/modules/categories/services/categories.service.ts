import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { CreateCategoryDto, UpdateCategoryDto } from '../dto/category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.category.findMany({
      orderBy: [{ kind: 'asc' }, { sortOrder: 'asc' }, { id: 'asc' }],
      include: { _count: { select: { transactions: true, rules: true } } },
    });
  }

  async create(dto: CreateCategoryDto) {
    const max = await this.prisma.category.aggregate({ _max: { sortOrder: true } });
    return this.prisma.category.create({
      data: {
        name: dto.name,
        kind: dto.kind,
        icon: dto.icon ?? 'Tag',
        color: dto.color ?? '#64748B',
        sortOrder: dto.sortOrder ?? (max._max.sortOrder ?? 0) + 1,
      },
    });
  }

  async update(id: number, dto: UpdateCategoryDto) {
    const current = await this.prisma.category.findUniqueOrThrow({
      where: { id },
      include: { _count: { select: { transactions: true } } },
    });
    if (dto.kind && dto.kind !== current.kind && current._count.transactions > 0) {
      throw new BadRequestException('Không đổi được loại thu/chi khi danh mục đã có giao dịch');
    }
    return this.prisma.category.update({ where: { id }, data: dto });
  }

  // Xóa danh mục: giao dịch thuộc danh mục trở thành "chưa phân loại"; quy tắc và ngân sách bị xóa theo.
  async remove(id: number) {
    await this.prisma.$transaction([
      this.prisma.transaction.updateMany({ where: { categoryId: id }, data: { categoryId: null, categorizedBy: 'NONE' } }),
      this.prisma.category.delete({ where: { id } }),
    ]);
    return { ok: true };
  }
}
