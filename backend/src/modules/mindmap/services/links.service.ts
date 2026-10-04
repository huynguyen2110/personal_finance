import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { isUniqueViolation } from '../../../common/utils/prisma-errors.util';
import type { CreateLinkDto, LinkKind, UpdateLinkDto } from '../dto/link.dto';
import { createsLinkCycle } from '../utils/tree';
import { MindmapsService } from './mindmaps.service';

const linkSelect = { id: true, sourceNodeId: true, targetNodeId: true, kind: true, note: true, createdAt: true } as const;

// Liên kết ngang giữa hai nhánh cùng mindmap: bổ trợ, điều kiện trước, tự do
@Injectable()
export class LinksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mindmaps: MindmapsService,
  ) {}

  async list(mindmapId: number, userId: number) {
    await this.mindmaps.findOwned(mindmapId, userId);
    return this.prisma.nodeLink.findMany({ where: { mindmapId }, select: linkSelect, orderBy: { id: 'asc' } });
  }

  async create(mindmapId: number, userId: number, dto: CreateLinkDto) {
    await this.mindmaps.findOwned(mindmapId, userId);
    if (dto.sourceNodeId === dto.targetNodeId) throw new BadRequestException('Không thể nối một nhánh với chính nó');
    const found = await this.prisma.mindmapNode.count({ where: { mindmapId, id: { in: [dto.sourceNodeId, dto.targetNodeId] } } });
    if (found !== 2) throw new BadRequestException('Hai nhánh phải thuộc mindmap này');
    if (dto.kind === 'prerequisite') await this.assertNoCycle(mindmapId, dto.sourceNodeId, dto.targetNodeId);

    try {
      return await this.prisma.nodeLink.create({
        data: { mindmapId, sourceNodeId: dto.sourceNodeId, targetNodeId: dto.targetNodeId, kind: dto.kind, note: dto.note?.trim() || null },
        select: linkSelect,
      });
    } catch (e) {
      if (isUniqueViolation(e)) throw new BadRequestException('Liên kết này đã có');
      throw e;
    }
  }

  async update(mindmapId: number, linkId: number, userId: number, dto: UpdateLinkDto) {
    const link = await this.findOwned(mindmapId, linkId, userId);
    if (dto.kind === 'prerequisite' && link.kind !== 'prerequisite') {
      await this.assertNoCycle(mindmapId, link.sourceNodeId, link.targetNodeId);
    }
    try {
      return await this.prisma.nodeLink.update({
        where: { id: linkId },
        data: {
          kind: dto.kind,
          note: dto.note === undefined ? undefined : dto.note?.trim() || null,
        },
        select: linkSelect,
      });
    } catch (e) {
      if (isUniqueViolation(e)) throw new BadRequestException('Liên kết này đã có');
      throw e;
    }
  }

  async remove(mindmapId: number, linkId: number, userId: number) {
    await this.findOwned(mindmapId, linkId, userId);
    await this.prisma.nodeLink.delete({ where: { id: linkId } });
    return { success: true };
  }

  // Điều kiện trước không được vòng (A trước B trước … trước A)
  private async assertNoCycle(mindmapId: number, sourceId: number, targetId: number) {
    const kind: LinkKind = 'prerequisite';
    const edges = await this.prisma.nodeLink.findMany({ where: { mindmapId, kind }, select: { sourceNodeId: true, targetNodeId: true } });
    if (createsLinkCycle(edges, sourceId, targetId)) {
      throw new BadRequestException('Điều kiện trước bị vòng lặp: nhánh đích đang là điều kiện (trực tiếp hoặc gián tiếp) của nhánh nguồn');
    }
  }

  private async findOwned(mindmapId: number, linkId: number, userId: number) {
    await this.mindmaps.findOwned(mindmapId, userId);
    const link = await this.prisma.nodeLink.findFirst({ where: { id: linkId, mindmapId } });
    if (!link) throw new NotFoundException('Không tìm thấy liên kết');
    return link;
  }
}
