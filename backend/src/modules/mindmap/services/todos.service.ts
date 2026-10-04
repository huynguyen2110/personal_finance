import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { addDaysStr } from '../../../common/utils/dates.util';
import type { CreateTodoDto, UpdateTodoDto } from '../dto/todo.dto';
import { aggregateByArea } from '../utils/plan';

const todoInclude = {
  nodes: { include: { node: { select: { id: true, title: true, mindmapId: true, mindmap: { select: { title: true } } } } } },
} satisfies Prisma.TodoInclude;

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

  // Tiến độ một tuần [start, start+6]: số todo theo ngày, theo nhánh (12 nhánh nhiều todo nhất) và theo lĩnh vực
  async weeklyStats(userId: number, start: string) {
    const end = addDaysStr(start, 6);
    const where = { userId, date: { gte: start, lte: end } };

    const rows = await this.prisma.todo.findMany({ where, select: { date: true, completed: true, durationMinutes: true } });
    const days = Array.from({ length: 7 }, (_, i) => {
      const date = addDaysStr(start, i);
      const ofDay = rows.filter((r) => r.date === date);
      return { date, total: ofDay.length, done: ofDay.filter((r) => r.completed).length };
    });

    const links = await this.prisma.todoNode.findMany({
      where: { todo: where },
      select: {
        todo: { select: { completed: true } },
        node: { select: { id: true, title: true, mindmapId: true, mindmap: { select: { title: true } } } },
      },
    });
    const byNodeMap = new Map<number, { nodeId: number; title: string; mindmapId: number; mindmapTitle: string; total: number; done: number }>();
    for (const l of links) {
      const row = byNodeMap.get(l.node.id) ?? {
        nodeId: l.node.id,
        title: l.node.title,
        mindmapId: l.node.mindmapId,
        mindmapTitle: l.node.mindmap.title,
        total: 0,
        done: 0,
      };
      row.total++;
      if (l.todo.completed) row.done++;
      byNodeMap.set(l.node.id, row);
    }
    const byNode = [...byNodeMap.values()].sort((a, b) => b.total - a.total || b.done - a.done).slice(0, 12);

    const total = days.reduce((s, d) => s + d.total, 0);
    const done = days.reduce((s, d) => s + d.done, 0);
    const minutes = rows.reduce((s, r) => s + (r.durationMinutes ?? 0), 0);
    const byArea = await this.weeklyByArea(userId, start, end);
    return { start, end, days, totals: { total, done, minutes }, byNode, byArea };
  }

  // Theo lĩnh vực (nhánh cấp 1) trên mọi mindmap, so phút với tuần trước
  private async weeklyByArea(userId: number, start: string, end: string) {
    const select = {
      date: true,
      completed: true,
      durationMinutes: true,
      effectiveness: true,
      nodes: { select: { nodeId: true, node: { select: { mindmapId: true } } } },
    } as const;
    const [current, prev] = await Promise.all([
      this.prisma.todo.findMany({ where: { userId, date: { gte: start, lte: end }, nodes: { some: {} } }, select }),
      this.prisma.todo.findMany({ where: { userId, date: { gte: addDaysStr(start, -7), lte: addDaysStr(start, -1) }, nodes: { some: {} } }, select }),
    ]);
    const mindmapIds = [...new Set([...current, ...prev].flatMap((t) => t.nodes.map((n) => n.node.mindmapId)))];
    if (!mindmapIds.length) return [];

    const nodes = await this.prisma.mindmapNode.findMany({
      where: { mindmapId: { in: mindmapIds } },
      select: { id: true, parentId: true, title: true, mindmapId: true, mindmap: { select: { title: true } } },
    });
    const toPlanTodo = ({ nodes: links, ...t }: (typeof current)[number]) => ({ ...t, nodeIds: links.map((l) => l.nodeId) });
    return aggregateByArea(
      nodes.map(({ mindmap, ...n }) => ({ ...n, mindmapTitle: mindmap.title })),
      current.map(toPlanTodo),
      prev.map(toPlanTodo),
    );
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
