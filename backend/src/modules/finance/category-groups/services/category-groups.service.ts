import { BadRequestException, Injectable } from '@nestjs/common';
import type { CategoryKind, Prisma } from '@prisma/client';
import { PrismaService } from '../../../../database/prisma.service';
import { CreateCategoryGroupDto, UpdateCategoryGroupDto } from '../dto/category-group.dto';

// Dạng trả về cho client: nhóm kèm id danh mục cha và id tài khoản đang dùng
const groupInclude = {
  categories: { where: { parentId: null }, select: { id: true }, orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] },
  accounts: { select: { accountId: true } },
} satisfies Prisma.CategoryGroupInclude;

type GroupRow = Prisma.CategoryGroupGetPayload<{ include: typeof groupInclude }>;

function toDto({ categories, accounts, ...g }: GroupRow) {
  return { ...g, categoryIds: categories.map((c) => c.id), accountIds: accounts.map((a) => a.accountId) };
}

@Injectable()
export class CategoryGroupsService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    const rows = await this.prisma.categoryGroup.findMany({
      orderBy: [{ kind: 'asc' }, { sortOrder: 'asc' }, { id: 'asc' }],
      include: groupInclude,
    });
    return rows.map(toDto);
  }

  async create(dto: CreateCategoryGroupDto) {
    const max = await this.prisma.categoryGroup.aggregate({ _max: { sortOrder: true } });
    const categoryIds = dto.categoryIds ?? [];
    await this.assertCategories(categoryIds, dto.kind);
    await this.assertAccounts(dto.accountIds ?? []);
    const defaultCategoryId = dto.defaultCategoryId ?? null;
    if (defaultCategoryId) await this.assertDefaultInGroup(defaultCategoryId, categoryIds);

    const created = await this.prisma.$transaction(async (tx) => {
      const g = await tx.categoryGroup.create({
        data: {
          name: dto.name,
          kind: dto.kind,
          icon: dto.icon ?? 'Layers',
          color: dto.color ?? '#64748B',
          sortOrder: dto.sortOrder ?? (max._max.sortOrder ?? 0) + 1,
          defaultCategoryId,
          accounts: dto.accountIds?.length ? { create: dto.accountIds.map((accountId) => ({ accountId })) } : undefined,
        },
      });
      if (categoryIds.length) await tx.category.updateMany({ where: { id: { in: categoryIds } }, data: { groupId: g.id } });
      return tx.categoryGroup.findUniqueOrThrow({ where: { id: g.id }, include: groupInclude });
    });
    return toDto(created);
  }

  async update(id: number, dto: UpdateCategoryGroupDto) {
    const current = await this.prisma.categoryGroup.findUniqueOrThrow({ where: { id }, include: groupInclude });
    if (dto.kind && dto.kind !== current.kind) {
      if (current.categories.length) throw new BadRequestException('Không đổi được loại thu/chi khi nhóm đang có danh mục');
    }
    const kind = dto.kind ?? current.kind;
    const nextCategoryIds = dto.categoryIds ?? current.categories.map((c) => c.id);
    if (dto.categoryIds) await this.assertCategories(dto.categoryIds, kind);
    if (dto.accountIds) await this.assertAccounts(dto.accountIds);
    const defaultCategoryId = dto.defaultCategoryId !== undefined ? dto.defaultCategoryId : current.defaultCategoryId;
    // Danh mục mặc định phải còn nằm trong nhóm; nếu không thì bỏ
    const keepDefault = defaultCategoryId ? await this.isInGroup(defaultCategoryId, nextCategoryIds) : false;

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.categoryGroup.update({
        where: { id },
        data: {
          ...(dto.name !== undefined ? { name: dto.name } : {}),
          ...(dto.kind !== undefined ? { kind: dto.kind } : {}),
          ...(dto.icon !== undefined ? { icon: dto.icon } : {}),
          ...(dto.color !== undefined ? { color: dto.color } : {}),
          ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
          defaultCategoryId: keepDefault ? defaultCategoryId : null,
          ...(dto.accountIds !== undefined
            ? { accounts: { deleteMany: {}, create: dto.accountIds.map((accountId) => ({ accountId })) } }
            : {}),
        },
      });
      if (dto.categoryIds !== undefined) {
        // Gỡ các danh mục không còn trong danh sách, gán các danh mục mới
        await tx.category.updateMany({ where: { groupId: id, id: { notIn: dto.categoryIds } }, data: { groupId: null } });
        if (dto.categoryIds.length) await tx.category.updateMany({ where: { id: { in: dto.categoryIds } }, data: { groupId: id } });
      }
      return tx.categoryGroup.findUniqueOrThrow({ where: { id }, include: groupInclude });
    });
    return toDto(updated);
  }

  // Xóa nhóm: danh mục trong nhóm trở thành "không thuộc nhóm", liên kết với tài khoản bị xóa theo.
  // Giao dịch đã gán theo nhóm (ACCOUNT) giữ nguyên danh mục.
  async remove(id: number) {
    await this.prisma.categoryGroup.delete({ where: { id } });
    return { ok: true };
  }

  // Danh mục đưa vào nhóm phải tồn tại, cùng loại và là danh mục cấp cao nhất
  private async assertCategories(ids: number[], kind: CategoryKind) {
    if (!ids.length) return;
    const cats = await this.prisma.category.findMany({ where: { id: { in: ids } }, select: { id: true, kind: true, parentId: true } });
    if (cats.length !== new Set(ids).size) throw new BadRequestException('Có danh mục không tồn tại');
    if (cats.some((c) => c.kind !== kind)) throw new BadRequestException('Danh mục trong nhóm phải cùng loại thu/chi với nhóm');
    if (cats.some((c) => c.parentId !== null)) throw new BadRequestException('Chỉ danh mục cha mới được đưa vào nhóm (danh mục con đi theo cha)');
  }

  private async assertAccounts(ids: number[]) {
    if (!ids.length) return;
    const found = await this.prisma.account.count({ where: { id: { in: ids } } });
    if (found !== new Set(ids).size) throw new BadRequestException('Có tài khoản không tồn tại');
  }

  private async assertDefaultInGroup(categoryId: number, groupCategoryIds: number[]) {
    if (!(await this.isInGroup(categoryId, groupCategoryIds))) {
      throw new BadRequestException('Danh mục mặc định phải là danh mục cha trong nhóm hoặc con của nó');
    }
  }

  // Danh mục mặc định có thể là danh mục cha trong nhóm hoặc danh mục con của một cha trong nhóm
  private async isInGroup(categoryId: number, groupCategoryIds: number[]): Promise<boolean> {
    if (groupCategoryIds.includes(categoryId)) return true;
    const c = await this.prisma.category.findUnique({ where: { id: categoryId }, select: { parentId: true } });
    return !!c && c.parentId !== null && groupCategoryIds.includes(c.parentId);
  }
}
