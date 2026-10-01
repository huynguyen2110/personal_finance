import { BadRequestException, Injectable } from '@nestjs/common';
import type { CategoryKind } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { CreateCategoryDto, UpdateCategoryDto } from '../dto/category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.category.findMany({
      orderBy: [{ kind: 'asc' }, { sortOrder: 'asc' }, { id: 'asc' }],
      include: { _count: { select: { transactions: true, rules: true, children: true } } },
    });
  }

  async create(dto: CreateCategoryDto) {
    const max = await this.prisma.category.aggregate({ _max: { sortOrder: true } });
    const parentId = dto.parentId ?? null;
    if (parentId) await this.assertValidParent(parentId, dto.kind, null);
    // Danh mục con đi theo nhóm của cha, không giữ nhóm riêng
    const groupId = parentId ? null : (dto.groupId ?? null);
    if (groupId) await this.assertValidGroup(groupId, dto.kind);
    return this.prisma.category.create({
      data: {
        name: dto.name,
        kind: dto.kind,
        icon: dto.icon ?? 'Tag',
        color: dto.color ?? '#64748B',
        sortOrder: dto.sortOrder ?? (max._max.sortOrder ?? 0) + 1,
        parentId,
        groupId,
      },
    });
  }

  async update(id: number, dto: UpdateCategoryDto) {
    const current = await this.prisma.category.findUniqueOrThrow({
      where: { id },
      include: { _count: { select: { transactions: true, children: true } } },
    });
    const kind = dto.kind ?? current.kind;
    if (dto.kind && dto.kind !== current.kind) {
      if (current._count.transactions > 0) throw new BadRequestException('Không đổi được loại thu/chi khi danh mục đã có giao dịch');
      if (current._count.children > 0) throw new BadRequestException('Không đổi được loại thu/chi khi danh mục đang có danh mục con');
    }
    if (dto.parentId !== undefined && dto.parentId !== null) {
      if (current._count.children > 0) throw new BadRequestException('Danh mục đang có danh mục con không thể trở thành danh mục con');
      await this.assertValidParent(dto.parentId, kind, id);
    }
    const data: UpdateCategoryDto = { ...dto };
    const nextParentId = dto.parentId !== undefined ? dto.parentId : current.parentId;
    // Trở thành danh mục con → bỏ nhóm riêng (đi theo cha)
    if (nextParentId !== null) data.groupId = null;
    else if (dto.groupId !== undefined && dto.groupId !== null) await this.assertValidGroup(dto.groupId, kind);
    return this.prisma.category.update({ where: { id }, data });
  }

  private async assertValidGroup(groupId: number, kind: CategoryKind) {
    const group = await this.prisma.categoryGroup.findUnique({ where: { id: groupId }, select: { kind: true } });
    if (!group) throw new BadRequestException('Nhóm không tồn tại');
    if (group.kind !== kind) throw new BadRequestException('Nhóm phải cùng loại thu/chi với danh mục');
  }

  // Cha phải tồn tại, cùng loại thu/chi, không phải chính nó và bản thân cha phải là cấp cao nhất (tối đa 2 cấp)
  private async assertValidParent(parentId: number, kind: CategoryKind, selfId: number | null) {
    if (selfId !== null && parentId === selfId) throw new BadRequestException('Danh mục không thể là cha của chính nó');
    const parent = await this.prisma.category.findUnique({ where: { id: parentId }, select: { kind: true, parentId: true } });
    if (!parent) throw new BadRequestException('Danh mục cha không tồn tại');
    if (parent.kind !== kind) throw new BadRequestException('Danh mục cha phải cùng loại thu/chi');
    if (parent.parentId !== null) throw new BadRequestException('Chỉ hỗ trợ 2 cấp: danh mục cha không thể là danh mục con');
  }

  // Xóa danh mục: giao dịch thuộc danh mục trở thành "chưa phân loại"; quy tắc và ngân sách bị xóa theo;
  // danh mục con (nếu có) trở thành danh mục cấp cao nhất.
  async remove(id: number) {
    await this.prisma.$transaction([
      this.prisma.transaction.updateMany({ where: { categoryId: id }, data: { categoryId: null, categorizedBy: 'NONE' } }),
      this.prisma.category.delete({ where: { id } }),
    ]);
    return { ok: true };
  }
}
