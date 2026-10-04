import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import type { CreateNodeDto, UpdateNodeDto } from '../dto/mindmap.dto';
import { createsCycle, subtreeIds } from '../utils/tree';
import { MindmapsService } from './mindmaps.service';

type ValueRow = { propertyDefinitionId: number; value: Prisma.JsonValue };

@Injectable()
export class NodesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mindmaps: MindmapsService,
  ) {}

  // Dữ liệu cho canvas: danh sách node phẳng + số todo (đã xong / tổng) + giá trị thuộc tính của từng node
  async listTree(mindmapId: number, userId: number) {
    await this.mindmaps.findOwned(mindmapId, userId);
    const nodes = await this.prisma.mindmapNode.findMany({
      where: { mindmapId },
      orderBy: [{ orderIndex: 'asc' }, { id: 'asc' }],
    });
    if (!nodes.length) return [];
    const nodeIds = nodes.map((n) => n.id);

    const links = await this.prisma.todoNode.findMany({
      where: { nodeId: { in: nodeIds } },
      select: { nodeId: true, todo: { select: { completed: true } } },
    });
    const counts = new Map<number, { total: number; done: number }>();
    for (const l of links) {
      const c = counts.get(l.nodeId) ?? { total: 0, done: 0 };
      c.total++;
      if (l.todo.completed) c.done++;
      counts.set(l.nodeId, c);
    }

    const values = await this.prisma.nodePropertyValue.findMany({ where: { nodeId: { in: nodeIds } } });
    const valuesByNode = new Map<number, ValueRow[]>();
    for (const v of values) {
      const list = valuesByNode.get(v.nodeId) ?? [];
      list.push({ propertyDefinitionId: v.propertyDefinitionId, value: v.value });
      valuesByNode.set(v.nodeId, list);
    }

    return nodes.map((n) => ({
      id: n.id,
      parentId: n.parentId,
      title: n.title,
      orderIndex: n.orderIndex,
      collapsed: n.collapsed,
      color: n.color,
      status: n.status,
      hasPage: n.pageContent !== null,
      todoTotal: counts.get(n.id)?.total ?? 0,
      todoDone: counts.get(n.id)?.done ?? 0,
      propertyValues: valuesByNode.get(n.id) ?? [],
    }));
  }

  async create(mindmapId: number, userId: number, dto: CreateNodeDto) {
    await this.mindmaps.findOwned(mindmapId, userId);
    const parent = await this.prisma.mindmapNode.findFirst({ where: { id: dto.parentId, mindmapId } });
    if (!parent) throw new BadRequestException('Node cha không hợp lệ');

    let orderIndex = dto.orderIndex;
    if (orderIndex === undefined) {
      const { _max } = await this.prisma.mindmapNode.aggregate({
        where: { mindmapId, parentId: dto.parentId },
        _max: { orderIndex: true },
      });
      orderIndex = _max.orderIndex === null ? 0 : _max.orderIndex + 1;
    }
    return this.prisma.mindmapNode.create({
      data: { mindmapId, parentId: dto.parentId, title: dto.title ?? 'Nhánh mới', orderIndex },
    });
  }

  async getDetail(mindmapId: number, nodeId: number, userId: number) {
    const node = await this.findOwnedNode(mindmapId, nodeId, userId);
    const values = await this.prisma.nodePropertyValue.findMany({ where: { nodeId } });
    return {
      ...node,
      hasPage: node.pageContent !== null,
      propertyValues: values.map((v) => ({ propertyDefinitionId: v.propertyDefinitionId, value: v.value })),
    };
  }

  async update(mindmapId: number, nodeId: number, userId: number, dto: UpdateNodeDto) {
    const node = await this.findOwnedNode(mindmapId, nodeId, userId);
    const data: Prisma.MindmapNodeUncheckedUpdateInput = {};

    if (dto.parentId !== undefined && dto.parentId !== node.parentId) {
      if (node.parentId === null) throw new BadRequestException('Không thể di chuyển node gốc');
      if (dto.parentId === nodeId) throw new BadRequestException('Node không thể là cha của chính nó');
      const tree = await this.prisma.mindmapNode.findMany({ where: { mindmapId }, select: { id: true, parentId: true } });
      if (!tree.some((n) => n.id === dto.parentId)) throw new BadRequestException('Node cha không hợp lệ');
      if (createsCycle(tree, nodeId, dto.parentId)) {
        throw new BadRequestException('Không thể di chuyển nhánh vào nhánh con của chính nó');
      }
      data.parentId = dto.parentId;
    }
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.orderIndex !== undefined) data.orderIndex = dto.orderIndex;
    if (dto.collapsed !== undefined) data.collapsed = dto.collapsed;
    if (dto.color !== undefined) data.color = dto.color;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.pageContent !== undefined) data.pageContent = dto.pageContent as Prisma.InputJsonValue;

    return this.prisma.mindmapNode.update({ where: { id: nodeId }, data });
  }

  // Xóa nhánh cùng toàn bộ cây con (khóa ngoại parentId ON DELETE CASCADE)
  async remove(mindmapId: number, nodeId: number, userId: number) {
    const node = await this.findOwnedNode(mindmapId, nodeId, userId);
    if (node.parentId === null) throw new BadRequestException('Không thể xóa node gốc');
    const tree = await this.prisma.mindmapNode.findMany({ where: { mindmapId }, select: { id: true, parentId: true } });
    const deletedCount = subtreeIds(tree, nodeId).length;
    await this.prisma.mindmapNode.delete({ where: { id: nodeId } });
    return { success: true, deletedCount };
  }

  private async findOwnedNode(mindmapId: number, nodeId: number, userId: number) {
    await this.mindmaps.findOwned(mindmapId, userId);
    const node = await this.prisma.mindmapNode.findFirst({ where: { id: nodeId, mindmapId } });
    if (!node) throw new NotFoundException('Không tìm thấy node');
    return node;
  }
}
