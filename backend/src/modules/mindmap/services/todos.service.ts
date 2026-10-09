import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { addDaysStr, daysBetween, todayVN } from '../../../common/utils/dates.util';
import type { CreateTodoDto, UpdateTodoDto } from '../dto/todo.dto';
import { aggregateByArea, synergyHighlights } from '../utils/plan';
import { computeStreak } from '../utils/streak';

const todoInclude = {
  nodes: { include: { node: { select: { id: true, title: true, mindmapId: true, mindmap: { select: { title: true } } } } } },
} satisfies Prisma.TodoInclude;

const MAX_RANGE_DAYS = 120;

type TodoWithNodes = Prisma.TodoGetPayload<{ include: typeof todoInclude }>;

@Injectable()
export class TodosService {
  constructor(private readonly prisma: PrismaService) {}

  async listByDate(userId: number, date: string) {
    const todos = await this.prisma.todo.findMany({
      where: { userId, date },
      include: todoInclude,
      orderBy: [{ orderIndex: 'asc' }, { id: 'asc' }],
    });
    return todos.map((t) => this.serialize(t));
  }

  async listByNode(userId: number, nodeId: number) {
    await this.findOwnedNodeIds(userId, [nodeId]);
    const todos = await this.prisma.todo.findMany({
      where: { userId, nodes: { some: { nodeId } } },
      include: todoInclude,
      orderBy: [{ date: 'desc' }, { orderIndex: 'asc' }],
    });
    return todos.map((t) => this.serialize(t));
  }

  // Tiến độ một tuần [start, start+6] — giữ định dạng cũ (ngày không kèm phút)
  async weeklyStats(userId: number, start: string) {
    const r = await this.rangeStats(userId, start, addDaysStr(start, 6));
    return {
      start: r.from,
      end: r.to,
      days: r.days.map(({ date, total, done }) => ({ date, total, done })),
      totals: r.totals,
      byArea: r.byArea,
    };
  }

  // Thống kê một khoảng ngày bất kỳ (tuần / tháng / quý): theo ngày, tổng + kỳ trước cùng độ dài,
  // theo lĩnh vực (so phút với kỳ trước) và các việc "cộng hưởng" gắn ≥ 2 lĩnh vực
  async rangeStats(userId: number, from: string, to: string) {
    const length = daysBetween(from, to);
    if (length < 1 || length > MAX_RANGE_DAYS) {
      throw new BadRequestException(`Khoảng thời gian phải từ 1 đến ${MAX_RANGE_DAYS} ngày`);
    }
    const prevFrom = addDaysStr(from, -length);
    const prevTo = addDaysStr(from, -1);
    const select = {
      title: true,
      date: true,
      completed: true,
      durationMinutes: true,
      effectiveness: true,
      nodes: { select: { nodeId: true, node: { select: { mindmapId: true } } } },
    } as const;
    const [current, prev] = await Promise.all([
      this.prisma.todo.findMany({ where: { userId, date: { gte: from, lte: to } }, select }),
      this.prisma.todo.findMany({ where: { userId, date: { gte: prevFrom, lte: prevTo } }, select }),
    ]);

    const days = Array.from({ length }, (_, i) => {
      const date = addDaysStr(from, i);
      const ofDay = current.filter((r) => r.date === date);
      return {
        date,
        total: ofDay.length,
        done: ofDay.filter((r) => r.completed).length,
        minutes: ofDay.reduce((s, r) => s + (r.durationMinutes ?? 0), 0),
      };
    });
    const sum = (rows: typeof current) => ({
      total: rows.length,
      done: rows.filter((r) => r.completed).length,
      minutes: rows.reduce((s, r) => s + (r.durationMinutes ?? 0), 0),
    });

    const toPlanTodo = ({ nodes: links, ...t }: (typeof current)[number]) => ({ ...t, nodeIds: links.map((l) => l.nodeId) });
    const linkedCurrent = current.filter((t) => t.nodes.length).map(toPlanTodo);
    const linkedPrev = prev.filter((t) => t.nodes.length).map(toPlanTodo);
    const mindmapIds = [...new Set([...current, ...prev].flatMap((t) => t.nodes.map((n) => n.node.mindmapId)))];
    const nodes = mindmapIds.length
      ? (
          await this.prisma.mindmapNode.findMany({
            where: { mindmapId: { in: mindmapIds } },
            select: { id: true, parentId: true, title: true, mindmapId: true, mindmap: { select: { title: true } } },
          })
        ).map(({ mindmap, ...n }) => ({ ...n, mindmapTitle: mindmap.title }))
      : [];

    return {
      from,
      to,
      days,
      totals: sum(current),
      prevTotals: sum(prev),
      byArea: nodes.length ? aggregateByArea(nodes, linkedCurrent, linkedPrev) : [],
      synergy: nodes.length ? synergyHighlights(nodes, linkedCurrent) : [],
    };
  }

  // Chuỗi ngày liên tục có todo hoàn thành ("Kỷ luật liên tục")
  async streak(userId: number) {
    const rows = await this.prisma.todo.findMany({
      where: { userId, completed: true },
      select: { date: true },
      distinct: ['date'],
    });
    return computeStreak(rows.map((r) => r.date), todayVN());
  }

  // Mọi node trong các mindmap của người dùng (để chọn nhánh khi tạo todo)
  async nodeOptions(userId: number) {
    const rows = await this.prisma.mindmapNode.findMany({
      where: { mindmap: { userId } },
      select: { id: true, title: true, parentId: true, mindmapId: true, mindmap: { select: { title: true } } },
      orderBy: [{ mindmapId: 'asc' }, { id: 'asc' }],
    });
    return rows.map((r) => ({ id: r.id, title: r.title, isRoot: r.parentId === null, mindmapId: r.mindmapId, mindmapTitle: r.mindmap.title }));
  }

  async create(userId: number, dto: CreateTodoDto) {
    const nodeIds = await this.findOwnedNodeIds(userId, dto.nodeIds ?? []);
    const { _max } = await this.prisma.todo.aggregate({ where: { userId, date: dto.date }, _max: { orderIndex: true } });
    const todo = await this.prisma.todo.create({
      data: {
        userId,
        title: dto.title,
        date: dto.date,
        durationMinutes: dto.durationMinutes ?? null,
        effectiveness: dto.effectiveness ?? null,
        orderIndex: _max.orderIndex === null ? 0 : _max.orderIndex + 1,
        nodes: { create: nodeIds.map((nodeId) => ({ nodeId })) },
      },
      include: todoInclude,
    });
    return this.serialize(todo);
  }

  async update(userId: number, id: number, dto: UpdateTodoDto) {
    await this.getOne(userId, id);
    const data: Prisma.TodoUpdateInput = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.date !== undefined) data.date = dto.date;
    if (dto.orderIndex !== undefined) data.orderIndex = dto.orderIndex;
    if (dto.durationMinutes !== undefined) data.durationMinutes = dto.durationMinutes;
    if (dto.effectiveness !== undefined) data.effectiveness = dto.effectiveness;
    if (dto.completed !== undefined) {
      data.completed = dto.completed;
      data.completedAt = dto.completed ? new Date() : null;
    }
    if (dto.nodeIds !== undefined) {
      const nodeIds = await this.findOwnedNodeIds(userId, dto.nodeIds);
      // Thay toàn bộ liên kết nhánh
      data.nodes = { deleteMany: {}, create: nodeIds.map((nodeId) => ({ nodeId })) };
    }
    const todo = await this.prisma.todo.update({ where: { id }, data, include: todoInclude });
    return this.serialize(todo);
  }

  async remove(userId: number, id: number) {
    await this.getOne(userId, id);
    await this.prisma.todo.delete({ where: { id } });
    return { success: true };
  }

  private async getOne(userId: number, id: number) {
    const todo = await this.prisma.todo.findFirst({ where: { id, userId }, include: todoInclude });
    if (!todo) throw new NotFoundException('Không tìm thấy todo');
    return todo;
  }

  // Các node phải thuộc mindmap của người dùng; trả về danh sách id không trùng
  private async findOwnedNodeIds(userId: number, nodeIds: number[]) {
    const unique = [...new Set(nodeIds)];
    if (!unique.length) return [];
    const found = await this.prisma.mindmapNode.count({ where: { id: { in: unique }, mindmap: { userId } } });
    if (found !== unique.length) throw new BadRequestException('Có node không hợp lệ hoặc không thuộc về bạn');
    return unique;
  }

  private serialize(todo: TodoWithNodes) {
    return {
      id: todo.id,
      title: todo.title,
      date: todo.date,
      completed: todo.completed,
      completedAt: todo.completedAt,
      durationMinutes: todo.durationMinutes,
      effectiveness: todo.effectiveness,
      orderIndex: todo.orderIndex,
      nodes: todo.nodes.map(({ node }) => ({ id: node.id, title: node.title, mindmapId: node.mindmapId, mindmapTitle: node.mindmap.title })),
    };
  }
}
