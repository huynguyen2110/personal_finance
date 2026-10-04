import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { addDaysStr, todayVN } from '../../../common/utils/dates.util';
import { buildPlan, PLAN_WINDOW_DAYS, type PlanOption } from '../utils/plan';
import { MindmapsService } from './mindmaps.service';

// View Kế hoạch: chấm điểm hành động theo thuộc tính có vai trò + liên kết + todo gần đây
@Injectable()
export class PlanService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mindmaps: MindmapsService,
  ) {}

  async get(mindmapId: number, userId: number) {
    await this.mindmaps.findOwned(mindmapId, userId);
    const today = todayVN();
    const from = addDaysStr(today, -(PLAN_WINDOW_DAYS - 1));

    const [nodes, definitions, values, links, todos] = await Promise.all([
      this.prisma.mindmapNode.findMany({
        where: { mindmapId },
        select: { id: true, parentId: true, title: true, status: true, orderIndex: true },
      }),
      this.prisma.propertyDefinition.findMany({ where: { mindmapId }, select: { id: true, role: true, options: true } }),
      this.prisma.nodePropertyValue.findMany({
        where: { node: { mindmapId } },
        select: { nodeId: true, propertyDefinitionId: true, value: true },
      }),
      this.prisma.nodeLink.findMany({ where: { mindmapId }, select: { sourceNodeId: true, targetNodeId: true, kind: true } }),
      this.prisma.todo.findMany({
        where: { userId, date: { gte: from, lte: today }, nodes: { some: { node: { mindmapId } } } },
        select: { date: true, completed: true, durationMinutes: true, effectiveness: true, nodes: { select: { nodeId: true } } },
      }),
    ]);

    return buildPlan({
      nodes,
      definitions: definitions.map((d) => ({ ...d, options: d.options as unknown as PlanOption[] | null })),
      values,
      links,
      todos: todos.map(({ nodes: links, ...t }) => ({ ...t, nodeIds: links.map((l) => l.nodeId) })),
      today,
    });
  }
}
