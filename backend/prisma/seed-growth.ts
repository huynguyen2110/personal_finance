// Dữ liệu mẫu cho module Phát triển bản thân (bản đồ chính của tài khoản ADMIN_USERNAME):
// 6 lĩnh vực (1 lĩnh vực trống, 1 lĩnh vực ưu tiên cao bị bỏ quên), ~25 hành động đủ trạng thái và thuộc tính,
// liên kết bổ trợ / điều kiện trước / liên quan, ~5 tuần todo có số phút + mức hiệu quả (cả hôm nay và ngày mai).
// Chỉ đụng tới phần dữ liệu mẫu: lĩnh vực mẫu có trang ghi chú chứa MARK; todo mẫu = todo gắn với nhánh mẫu.
// Chạy lại an toàn: xóa dữ liệu mẫu cũ rồi tạo lại (ngày tính theo hôm nay).
//   npm run seed:growth            → tạo (lại) dữ liệu mẫu
//   npm run seed:growth -- --clear → chỉ xóa dữ liệu mẫu
import { Prisma, PrismaClient, type NodeLinkKind, type PropertyDefinition } from '@prisma/client';
import { addDaysStr, todayVN, weekdayOf } from '../src/common/utils/dates.util';
import { MINDMAP_TEMPLATES } from '../src/modules/mindmap/utils/templates';
import { subtreeIds } from '../src/modules/mindmap/utils/tree';

const prisma = new PrismaClient();
const MARK = '[Dữ liệu mẫu]';
const CLEAR = process.argv.includes('--clear');

type Priority = 'high' | 'medium' | 'low';
type Difficulty = 'easy' | 'medium' | 'hard';
type Status = 'todo' | 'doing' | 'done';

interface SeedNode {
  title: string;
  key?: string;
  p?: Priority;
  d?: Difficulty;
  h?: number; // giờ
  c?: number; // đồng
  status?: Status;
  children?: SeedNode[];
}

const AREAS: SeedNode[] = [
  {
    title: 'Tiếng Anh',
    p: 'high',
    children: [
      {
        title: 'Học 3000 từ vựng',
        key: 'vocab',
        d: 'easy',
        h: 30,
        c: 0,
        status: 'doing',
        children: [
          { title: 'Anki 20 từ mỗi ngày', key: 'anki', d: 'easy', h: 10, c: 0, status: 'doing' },
          { title: 'Từ vựng chuyên ngành IT', key: 'itvocab', d: 'medium', h: 15, c: 0, status: 'todo' },
        ],
      },
      { title: 'Nghe podcast mỗi ngày', key: 'podcast', d: 'easy', h: 20, c: 0, status: 'doing' },
      { title: 'Luyện nói với gia sư online', key: 'tutor', d: 'medium', h: 24, c: 3_600_000, status: 'doing' },
      { title: 'Thi IELTS 7.0', key: 'ielts', p: 'high', d: 'hard', h: 150, c: 4_664_000 },
    ],
  },
  {
    title: 'Sự nghiệp',
    p: 'high',
    children: [
      { title: 'Học SQL nâng cao', key: 'sql', d: 'medium', h: 40, c: 0, status: 'doing' },
      {
        title: 'Học Power BI',
        key: 'powerbi',
        d: 'hard',
        h: 60,
        c: 0,
        children: [
          { title: 'Mua khóa học Power BI', key: 'course', d: 'easy', h: 1, c: 1_200_000, status: 'done' },
          { title: 'Làm dashboard chi tiêu cá nhân', key: 'dashboard', d: 'medium', h: 15, c: 0, status: 'todo' },
        ],
      },
      { title: 'Chứng chỉ AWS Cloud Practitioner', key: 'aws', p: 'medium', d: 'hard', h: 80, c: 2_500_000 },
      { title: 'Viết blog kỹ thuật', key: 'blog', d: 'medium', h: 20, c: 0, status: 'doing' },
    ],
  },
  {
    title: 'Sức khỏe',
    p: 'medium',
    children: [
      { title: 'Chạy bộ 5km, 3 buổi/tuần', key: 'run', d: 'medium', h: 30, c: 1_500_000, status: 'doing' },
      { title: 'Ngủ trước 23h', key: 'sleep', d: 'medium', h: 0, c: 0, status: 'doing' },
      { title: 'Khám sức khỏe tổng quát', key: 'checkup', d: 'easy', h: 3, c: 2_500_000, status: 'done' },
      { title: 'Tập gym với PT', key: 'gym', p: 'low', d: 'hard', h: 50, c: 6_000_000 },
    ],
  },
  {
    // Ưu tiên cao nhưng >14 ngày không làm gì → cảnh báo "bị bỏ quên"
    title: 'Tài chính cá nhân',
    p: 'high',
    children: [
      { title: 'Đọc "Người giàu có nhất thành Babylon"', key: 'babylon', d: 'easy', h: 6, c: 150_000, status: 'doing' },
      { title: 'Lập quỹ khẩn cấp 6 tháng', key: 'fund', d: 'medium', h: 2, c: 0 },
      { title: 'Học đầu tư quỹ chỉ số', key: 'invest', d: 'hard', h: 30, c: 0 },
    ],
  },
  {
    title: 'Kỹ năng mềm',
    p: 'low',
    children: [
      { title: 'Đọc "Đắc nhân tâm"', key: 'dnt', d: 'easy', h: 8, c: 120_000, status: 'done' },
      { title: 'Thuyết trình ở team meeting', key: 'talk', d: 'hard', h: 5, c: 0 },
    ],
  },
  // Lĩnh vực chưa có hành động → thẻ hiện gợi ý thêm hành động
  { title: 'Âm nhạc', p: 'low' },
];

// [nguồn, đích, loại, ghi chú?]
const LINKS: [string, string, NodeLinkKind, string?][] = [
  ['vocab', 'ielts', 'prerequisite'],
  ['tutor', 'ielts', 'prerequisite', 'Speaking'],
  ['podcast', 'ielts', 'supports', 'Listening'],
  ['vocab', 'aws', 'supports', 'đọc tài liệu tiếng Anh'],
  ['itvocab', 'blog', 'supports'],
  ['sql', 'powerbi', 'prerequisite'],
  ['course', 'dashboard', 'prerequisite'],
  ['sql', 'dashboard', 'supports'],
  ['fund', 'invest', 'prerequisite'],
  ['run', 'sleep', 'supports', 'mệt → ngủ sớm'],
  ['blog', 'talk', 'supports', 'rèn diễn đạt'],
  ['run', 'podcast', 'related', 'nghe khi chạy'],
  ['dashboard', 'fund', 'related', 'theo dõi chi tiêu'],
];

// Sinh số giả ngẫu nhiên cố định (mỗi lần chạy ra cùng dữ liệu)
function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

interface SeedTodo {
  title: string;
  date: string;
  keys: string[];
  done: boolean;
  minutes?: number;
  eff?: number;
}

const SQL_TOPICS = ['window function', 'CTE đệ quy', 'index & EXPLAIN', 'tối ưu JOIN', 'partition bảng', 'transaction & lock'];

function buildTodos(today: string): SeedTodo[] {
  const r = rng(2026);
  const between = (a: number, b: number) => Math.round(a + r() * (b - a));
  const out: SeedTodo[] = [];
  let sql = 0;
  for (let ago = 34; ago >= -1; ago--) {
    const date = addDaysStr(today, -ago);
    const wd = weekdayOf(date); // 0 = CN
    const past = ago > 0; // hôm nay / ngày mai: chưa xong
    const add = (t: Omit<SeedTodo, 'date' | 'done'> & { done?: boolean }) =>
      out.push({ date, ...t, done: t.done ?? (past && r() < 0.88) });

    if (ago <= 30 && r() < 0.85) add({ title: 'Anki 20 từ mới', keys: ['anki'], minutes: between(15, 25), eff: between(3, 4) });
    if (ago <= 21 && ago % 2 === 0) {
      if (wd === 1 || wd === 3 || wd === 6) add({ title: 'Nghe podcast khi chạy', keys: ['run', 'podcast'], minutes: between(30, 40), eff: 4 });
      else add({ title: 'Nghe podcast BBC 6 Minute English', keys: ['podcast'], minutes: between(15, 30), eff: between(3, 4) });
    } else if (wd === 1 || wd === 3 || wd === 6) {
      add({ title: 'Chạy bộ 5km', keys: ['run'], minutes: between(30, 45), eff: between(4, 5) });
    }
    if ((wd === 2 || wd === 4) && ago <= 21) {
      add({ title: `Luyện SQL: ${SQL_TOPICS[sql++ % SQL_TOPICS.length]}`, keys: ['sql'], minutes: between(45, 90), eff: between(3, 5) });
    }
    if (ago <= 10 && ago > 0 && r() < 0.5) add({ title: 'Đi ngủ trước 23h', keys: ['sleep'] });
    if ([15, 8, 1].includes(ago)) add({ title: 'Buổi nói 1-1 với gia sư', keys: ['tutor'], minutes: 60, eff: 5, done: true });
    if ([9, 6, 3].includes(ago)) add({ title: 'Học 30 từ vựng IT', keys: ['itvocab', 'vocab'], minutes: 30, eff: 4 });
    if ([12, 5].includes(ago)) add({ title: 'Viết bài blog về Prisma + NestJS', keys: ['blog'], minutes: 90, eff: 4, done: true });
    if (ago === 8) add({ title: 'Mua khóa Power BI trên Udemy', keys: ['course'], minutes: 15, eff: 5, done: true });
    if (ago === 25) add({ title: 'Khám sức khỏe ở bệnh viện', keys: ['checkup'], minutes: 180, eff: 4, done: true });
    // Tài chính cá nhân: lần cuối 20 ngày trước → bị bỏ quên
    if ([27, 20].includes(ago)) add({ title: 'Đọc 2 chương sách Babylon', keys: ['babylon'], minutes: 40, eff: 4, done: true });
  }
  // Hôm nay: thêm việc dang dở + một việc đã xong
  out.push({ title: 'Ôn lại 50 từ khó', date: today, keys: ['vocab'], done: true, minutes: 20, eff: 3 });
  out.push({ title: 'Phác thảo dashboard chi tiêu', date: today, keys: ['dashboard'], done: false });
  return out;
}

// Chọn lựa chọn của thuộc tính select theo id mẫu; nếu người dùng đã đổi lựa chọn thì chọn theo mức (weight/thứ tự)
function optionId(def: PropertyDefinition, wanted: string, rank: 'max' | 'mid' | 'min'): string | null {
  const options = (def.options as unknown as { id: string; weight?: number }[] | null) ?? [];
  if (!options.length) return null;
  if (options.some((o) => o.id === wanted)) return wanted;
  const sorted = options.map((o, i) => ({ id: o.id, w: o.weight ?? i + 1 })).sort((a, b) => a.w - b.w);
  return rank === 'min' ? sorted[0].id : rank === 'max' ? sorted[sorted.length - 1].id : sorted[Math.floor(sorted.length / 2)].id;
}

async function primaryMindmap(userId: number) {
  const existing = await prisma.mindmap.findFirst({ where: { userId }, orderBy: { id: 'asc' } });
  if (existing) return existing;
  const title = 'Phát triển bản thân';
  return prisma.mindmap.create({
    data: {
      userId,
      title,
      nodes: { create: { title, parentId: null, orderIndex: 0 } },
      properties: {
        create: MINDMAP_TEMPLATES.growth.properties.map((p, i) => ({
          name: p.name,
          type: p.type,
          role: p.role,
          unit: p.type === 'number' ? p.unit : null,
          options: p.type === 'select' ? p.options : Prisma.DbNull,
          orderIndex: i,
        })),
      },
    },
  });
}

// Bản đồ cũ có thể thiếu thuộc tính có vai trò → gán vai trò cho thuộc tính trùng tên, hoặc tạo mới
async function ensureRoleProperties(mindmapId: number) {
  const byRole = new Map<string, PropertyDefinition>();
  for (const [i, tpl] of MINDMAP_TEMPLATES.growth.properties.entries()) {
    let def = await prisma.propertyDefinition.findFirst({ where: { mindmapId, role: tpl.role } });
    if (!def) {
      const sameName = await prisma.propertyDefinition.findFirst({ where: { mindmapId, name: tpl.name } });
      def = sameName && sameName.type === tpl.type
        ? await prisma.propertyDefinition.update({ where: { id: sameName.id }, data: { role: tpl.role } })
        : await prisma.propertyDefinition.create({
            data: {
              mindmapId,
              name: sameName ? `${tpl.name} (kế hoạch)` : tpl.name,
              type: tpl.type,
              role: tpl.role,
              unit: tpl.type === 'number' ? tpl.unit : null,
              options: tpl.type === 'select' ? tpl.options : Prisma.DbNull,
              orderIndex: 100 + i,
            },
          });
    }
    byRole.set(tpl.role, def);
  }
  return byRole;
}

async function clearSeed(userId: number, mindmapId: number) {
  const nodes = await prisma.mindmapNode.findMany({ where: { mindmapId }, select: { id: true, parentId: true, pageContent: true } });
  const root = nodes.find((n) => n.parentId === null);
  const seedAreas = nodes.filter((n) => n.parentId === root?.id && JSON.stringify(n.pageContent ?? '').includes(MARK));
  const ids = seedAreas.flatMap((a) => subtreeIds(nodes, a.id));
  if (!ids.length) return { areas: 0, todos: 0 };
  const todos = await prisma.todo.deleteMany({ where: { userId, nodes: { some: { nodeId: { in: ids } } } } });
  await prisma.mindmapNode.deleteMany({ where: { id: { in: seedAreas.map((a) => a.id) } } });
  return { areas: seedAreas.length, todos: todos.count };
}

async function main() {
  const username = process.env.ADMIN_USERNAME || 'admin';
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) throw new Error(`Không có user "${username}" — chạy npm run seed trước`);

  const mindmap = await primaryMindmap(user.id);
  const root = await prisma.mindmapNode.findFirstOrThrow({ where: { mindmapId: mindmap.id, parentId: null } });
  const cleared = await clearSeed(user.id, mindmap.id);
  if (cleared.areas) console.log(`✔ Xóa dữ liệu mẫu cũ: ${cleared.areas} lĩnh vực, ${cleared.todos} todo`);
  if (CLEAR) return;

  const props = await ensureRoleProperties(mindmap.id);
  const priority = props.get('priority')!;
  const difficulty = props.get('difficulty')!;
  const time = props.get('time')!;
  const cost = props.get('cost')!;
  const P_RANK = { high: 'max', medium: 'mid', low: 'min' } as const;
  const D_RANK = { easy: 'min', medium: 'mid', hard: 'max' } as const;

  // Lĩnh vực mẫu đứng sau các nhánh sẵn có của người dùng
  const { _max } = await prisma.mindmapNode.aggregate({ where: { mindmapId: mindmap.id, parentId: root.id }, _max: { orderIndex: true } });
  let areaOrder = (_max.orderIndex ?? -1) + 1;
  const ids = new Map<string, number>();
  let actionCount = 0;

  const createNode = async (n: SeedNode, parentId: number, orderIndex: number, isArea: boolean) => {
    const node = await prisma.mindmapNode.create({
      data: {
        mindmapId: mindmap.id,
        parentId,
        title: n.title,
        orderIndex,
        status: n.status ?? null,
        pageContent: isArea
          ? { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: `${MARK} Xóa bằng: npm run seed:growth -- --clear` }] }] }
          : undefined,
      },
    });
    if (n.key) ids.set(n.key, node.id);
    if (!isArea) actionCount++;
    const values: { propertyDefinitionId: number; value: Prisma.InputJsonValue }[] = [];
    const p = n.p && optionId(priority, n.p, P_RANK[n.p]);
    const d = n.d && optionId(difficulty, n.d, D_RANK[n.d]);
    if (p) values.push({ propertyDefinitionId: priority.id, value: p });
    if (d) values.push({ propertyDefinitionId: difficulty.id, value: d });
    if (n.h !== undefined) values.push({ propertyDefinitionId: time.id, value: n.h });
    if (n.c !== undefined) values.push({ propertyDefinitionId: cost.id, value: n.c });
    if (values.length) await prisma.nodePropertyValue.createMany({ data: values.map((v) => ({ ...v, nodeId: node.id })) });
    for (const [i, child] of (n.children ?? []).entries()) await createNode(child, node.id, i, false);
  };
  for (const area of AREAS) await createNode(area, root.id, areaOrder++, true);

  await prisma.nodeLink.createMany({
    data: LINKS.map(([s, t, kind, note]) => ({ mindmapId: mindmap.id, sourceNodeId: ids.get(s)!, targetNodeId: ids.get(t)!, kind, note: note ?? null })),
  });

  const today = todayVN();
  const todos = buildTodos(today);
  const orderOf = new Map<string, number>();
  for (const t of todos) {
    const orderIndex = orderOf.get(t.date) ?? 0;
    orderOf.set(t.date, orderIndex + 1);
    await prisma.todo.create({
      data: {
        userId: user.id,
        title: t.title,
        date: t.date,
        completed: t.done,
        completedAt: t.done ? new Date(`${t.date}T21:00:00+07:00`) : null,
        durationMinutes: t.minutes ?? null,
        effectiveness: t.eff ?? null,
        orderIndex,
        nodes: { create: t.keys.map((k) => ({ nodeId: ids.get(k)! })) },
      },
    });
  }

  console.log(`✔ Bản đồ "${mindmap.title}" (#${mindmap.id}) của ${username}`);
  console.log(`✔ ${AREAS.length} lĩnh vực, ${actionCount} hành động, ${LINKS.length} liên kết`);
  console.log(`✔ ${todos.length} todo từ ${addDaysStr(today, -34)} tới ${addDaysStr(today, 1)} (${todos.filter((t) => t.done).length} đã xong)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
