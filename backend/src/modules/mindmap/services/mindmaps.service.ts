import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import type { CreateMindmapDto, UpdateMindmapDto } from '../dto/mindmap.dto';

@Injectable()
export class MindmapsService {
  constructor(private readonly prisma: PrismaService) {}

  // Kiểm tra quyền sở hữu, dùng chung cho node/thuộc tính: không phải của mình thì 404
  async findOwned(id: number, userId: number) {
    const mindmap = await this.prisma.mindmap.findFirst({ where: { id, userId } });
    if (!mindmap) throw new NotFoundException('Không tìm thấy mindmap');
    return mindmap;
  }

  async list(userId: number) {
    const rows = await this.prisma.mindmap.findMany({
      where: { userId },
      include: { _count: { select: { nodes: true } } },
      orderBy: { updatedAt: 'desc' },
    });
    return rows.map(({ _count, ...m }) => ({ ...m, nodeCount: _count.nodes }));
  }

  // Tạo mindmap kèm nút gốc cùng tên
  create(userId: number, dto: CreateMindmapDto) {
    return this.prisma.mindmap.create({
      data: {
        userId,
        title: dto.title,
        description: dto.description ?? null,
        nodes: { create: { title: dto.title, parentId: null, orderIndex: 0 } },
      },
    });
  }

  get(id: number, userId: number) {
    return this.findOwned(id, userId);
  }

  async update(id: number, userId: number, dto: UpdateMindmapDto) {
    await this.findOwned(id, userId);
    return this.prisma.mindmap.update({
      where: { id },
      data: { title: dto.title, description: dto.description },
    });
  }

  async remove(id: number, userId: number) {
    await this.findOwned(id, userId);
    await this.prisma.mindmap.delete({ where: { id } });
    return { success: true };
  }
}
