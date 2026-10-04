// Kiểm tra API module Mindmap với DB thật (PostgreSQL local).
// Tạo một user tạm với mật khẩu ngẫu nhiên; xóa user khi xong → mindmap/todo của user bị xóa theo (cascade).
//   npm run test:e2e -- mindmap
import { randomBytes, randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { setupApp } from '../src/app.setup';
import { PrismaService } from '../src/database/prisma.service';
import { hashPassword } from '../src/modules/auth/utils/password.util';
import { addDaysStr, todayVN } from '../src/common/utils/dates.util';

process.env.EMAIL_POLL_MINUTES = '0';

describe('Mindmap API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const username = `e2e_mm_${randomUUID().slice(0, 8)}`;
  let password = randomBytes(18).toString('base64url');
  let access = '';
  let mindmapId = 0;
  let rootId = 0;
  let branchA = 0;
  let branchB = 0;
  let leaf = 0;
  let todoId = 0;
  const today = todayVN();

  const api = () => request(app.getHttpServer());
  const authed = (method: 'get' | 'post' | 'patch' | 'put' | 'delete', url: string) => api()[method](url).set('Authorization', `Bearer ${access}`);
  const base = () => `/api/mindmap/mindmaps/${mindmapId}`;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    setupApp(app);
    await app.init();
    prisma = app.get(PrismaService);
    await prisma.user.create({ data: { username, passwordHash: await hashPassword(password) } });
    const r = await api().post('/api/auth/login').send({ username, password }).expect(200);
    access = r.body.data.access_token;
  });

  afterAll(async () => {
    await prisma?.user.deleteMany({ where: { username } });
    await app?.close();
  });

  it('chặn khi chưa đăng nhập', async () => {
    await api().get('/api/mindmap/mindmaps').expect(401);
  });

  it('tạo mindmap → có sẵn nút gốc; danh sách đếm số node', async () => {
    const r = await authed('post', '/api/mindmap/mindmaps').send({ title: '  Phát triển bản thân  ' }).expect(201);
    mindmapId = r.body.data.id;
    expect(r.body.data.title).toBe('Phát triển bản thân');
    const tree = (await authed('get', `${base()}/nodes`).expect(200)).body.data;
    expect(tree).toHaveLength(1);
    expect(tree[0]).toMatchObject({ parentId: null, title: 'Phát triển bản thân', hasPage: false, todoTotal: 0 });
    rootId = tree[0].id;
    const list = (await authed('get', '/api/mindmap/mindmaps').expect(200)).body.data;
    expect(list.find((m: { id: number }) => m.id === mindmapId)).toMatchObject({ nodeCount: 1 });
  });

  it('thêm nhánh: orderIndex tự tăng; node cha sai → 400', async () => {
    branchA = (await authed('post', `${base()}/nodes`).send({ parentId: rootId, title: 'Sức khỏe' }).expect(201)).body.data.id;
    const b = (await authed('post', `${base()}/nodes`).send({ parentId: rootId }).expect(201)).body.data;
    branchB = b.id;
    expect(b).toMatchObject({ title: 'Nhánh mới', orderIndex: 1 });
    leaf = (await authed('post', `${base()}/nodes`).send({ parentId: branchA, title: 'Chạy bộ' }).expect(201)).body.data.id;
    await authed('post', `${base()}/nodes`).send({ parentId: 999999999 }).expect(400);
  });

  it('đổi cha: chặn vòng lặp và di chuyển nút gốc; cho phép chuyển hợp lệ', async () => {
    const r = await authed('patch', `${base()}/nodes/${branchA}`).send({ parentId: leaf }).expect(400);
    expect(r.body.message).toBe('Không thể di chuyển nhánh vào nhánh con của chính nó');
    await authed('patch', `${base()}/nodes/${rootId}`).send({ parentId: branchA }).expect(400);
    const moved = await authed('patch', `${base()}/nodes/${leaf}`).send({ parentId: branchB, color: '#0ca678' }).expect(200);
    expect(moved.body.data).toMatchObject({ parentId: branchB, color: '#0ca678' });
  });

  it('trang của node: lưu TipTap JSON → hasPage', async () => {
    const doc = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Ghi chú' }] }] };
    await authed('patch', `${base()}/nodes/${leaf}`).send({ pageContent: doc }).expect(200);
    const d = (await authed('get', `${base()}/nodes/${leaf}`).expect(200)).body.data;
    expect(d).toMatchObject({ hasPage: true, pageContent: doc, propertyValues: [] });
  });

  it('thuộc tính: tạo, kiểm tra kiểu giá trị, xóa giá trị bằng null', async () => {
    await authed('post', `${base()}/properties`).send({ name: 'Độ khó', type: 'select' }).expect(400);
    const sel = (
      await authed('post', `${base()}/properties`)
        .send({ name: 'Độ khó', type: 'select', options: [{ id: 'hard', label: 'Khó', color: '#e03131' }] })
        .expect(201)
    ).body.data;
    const num = (await authed('post', `${base()}/properties`).send({ name: 'Điểm', type: 'number' }).expect(201)).body.data;
    expect(num.orderIndex).toBe(1);
    await authed('post', `${base()}/properties`).send({ name: 'Điểm', type: 'text' }).expect(400);

    await authed('put', `${base()}/nodes/${leaf}/properties`).send({ values: { [sel.id]: 'easy' } }).expect(400);
    const set = await authed('put', `${base()}/nodes/${leaf}/properties`).send({ values: { [sel.id]: 'hard', [num.id]: 8 } }).expect(200);
    expect(set.body.data).toHaveLength(2);
    const after = await authed('put', `${base()}/nodes/${leaf}/properties`).send({ values: { [num.id]: null } }).expect(200);
    expect(after.body.data).toEqual([{ propertyDefinitionId: sel.id, value: 'hard' }]);
    const tree = (await authed('get', `${base()}/nodes`).expect(200)).body.data;
    expect(tree.find((n: { id: number }) => n.id === leaf).propertyValues).toEqual([{ propertyDefinitionId: sel.id, value: 'hard' }]);
  });

  it('todo gắn nhánh: đếm trên canvas, lọc theo ngày/nhánh, thống kê tuần', async () => {
    const t = (await authed('post', '/api/mindmap/todos').send({ title: 'Chạy 5km', date: today, nodeIds: [leaf, leaf, branchB] }).expect(201)).body.data;
    todoId = t.id;
    expect(t.nodes.map((n: { id: number }) => n.id).sort()).toEqual([branchB, leaf].sort());
    await authed('post', '/api/mindmap/todos').send({ title: 'Ngoài ngày', date: addDaysStr(today, -10) }).expect(201);
    await authed('post', '/api/mindmap/todos').send({ title: 'x', date: today, nodeIds: [999999999] }).expect(400);

    await authed('patch', `/api/mindmap/todos/${todoId}`).send({ completed: true }).expect(200);
    const tree = (await authed('get', `${base()}/nodes`).expect(200)).body.data;
    expect(tree.find((n: { id: number }) => n.id === leaf)).toMatchObject({ todoTotal: 1, todoDone: 1 });

    const ofDay = (await authed('get', `/api/mindmap/todos?date=${today}`).expect(200)).body.data;
    expect(ofDay).toHaveLength(1);
    expect(ofDay[0]).toMatchObject({ completed: true, date: today });
    expect((await authed('get', `/api/mindmap/todos/by-node/${leaf}`).expect(200)).body.data).toHaveLength(1);

    const stats = (await authed('get', `/api/mindmap/todos/stats/weekly?start=${today}`).expect(200)).body.data;
    expect(stats.days).toHaveLength(7);
    expect(stats.days[0]).toEqual({ date: today, total: 1, done: 1 });
    expect(stats.totals).toEqual({ total: 1, done: 1 });
    expect(stats.byNode).toHaveLength(2);

    const options = (await authed('get', '/api/mindmap/todos/node-options').expect(200)).body.data;
    expect(options.filter((o: { mindmapId: number }) => o.mindmapId === mindmapId)).toHaveLength(4);
  });

  it('xóa nhánh → xóa cả cây con; không xóa được nút gốc', async () => {
    await authed('delete', `${base()}/nodes/${rootId}`).expect(400);
    const r = await authed('delete', `${base()}/nodes/${branchB}`).expect(200);
    expect(r.body.data).toEqual({ success: true, deletedCount: 2 });
    const tree = (await authed('get', `${base()}/nodes`).expect(200)).body.data;
    expect(tree.map((n: { id: number }) => n.id).sort()).toEqual([rootId, branchA].sort());
    // Todo vẫn còn, chỉ mất liên kết với nhánh đã xóa
    const todo = (await authed('get', `/api/mindmap/todos?date=${today}`).expect(200)).body.data[0];
    expect(todo.nodes).toEqual([]);
  });

  describe('mẫu "Phát triển bản thân"', () => {
    let gid = 0;
    let groot = 0;
    const gbase = () => `/api/mindmap/mindmaps/${gid}`;
    const props: Record<string, { id: number; type: string; unit: string | null }> = {};

    it('tạo từ mẫu → có sẵn 4 thuộc tính có vai trò; mẫu lạ → 400', async () => {
      await authed('post', '/api/mindmap/mindmaps').send({ title: 'X', template: 'khong-co' }).expect(400);
      gid = (await authed('post', '/api/mindmap/mindmaps').send({ title: 'Phát triển', template: 'growth' }).expect(201)).body.data.id;
      groot = (await authed('get', `${gbase()}/nodes`).expect(200)).body.data[0].id;
      const defs = (await authed('get', `${gbase()}/properties`).expect(200)).body.data;
      expect(defs.map((d: { role: string }) => d.role)).toEqual(['priority', 'difficulty', 'time', 'cost']);
      for (const d of defs) props[d.role] = d;
      expect(props.time.unit).toBe('hours');
      expect(props.cost.unit).toBe('money');
      expect(defs[0].options[0]).toMatchObject({ id: 'high', weight: 3 });
    });

    it('vai trò: trùng hoặc sai kiểu → 400; bỏ vai trò rồi gán lại được; đơn vị chỉ cho number', async () => {
      const dup = await authed('post', `${gbase()}/properties`).send({ name: 'Ưu tiên 2', type: 'select', role: 'priority', options: [{ id: 'a', label: 'A', color: '#000' }] }).expect(400);
      expect(dup.body.message).toContain('Ưu tiên');
      await authed('post', `${gbase()}/properties`).send({ name: 'Giờ', type: 'text', role: 'time' }).expect(400);
      await authed('post', `${gbase()}/properties`).send({ name: 'Ghi chú', type: 'text', unit: 'money' }).expect(400);
      await authed('patch', `${gbase()}/properties/${props.time.id}`).send({ role: null }).expect(200);
      const back = await authed('patch', `${gbase()}/properties/${props.time.id}`).send({ role: 'time', unit: null }).expect(200);
      expect(back.body.data).toMatchObject({ role: 'time', unit: null });
      await authed('patch', `${gbase()}/properties/${props.priority.id}`).send({ unit: 'hours' }).expect(400);
    });

    it('trạng thái node: đặt, trả về trong cây, giá trị lạ → 400, null = bỏ theo dõi', async () => {
      const area = (await authed('post', `${gbase()}/nodes`).send({ parentId: groot, title: 'Tiếng Anh' }).expect(201)).body.data.id;
      await authed('patch', `${gbase()}/nodes/${area}`).send({ status: 'doing' }).expect(200);
      await authed('patch', `${gbase()}/nodes/${area}`).send({ status: 'xong' }).expect(400);
      let tree = (await authed('get', `${gbase()}/nodes`).expect(200)).body.data;
      expect(tree.find((n: { id: number }) => n.id === area).status).toBe('doing');
      await authed('patch', `${gbase()}/nodes/${area}`).send({ status: null }).expect(200);
      tree = (await authed('get', `${gbase()}/nodes`).expect(200)).body.data;
      expect(tree.find((n: { id: number }) => n.id === area).status).toBeNull();
    });

    it('todo: số phút + hiệu quả, kiểm tra giới hạn, null để xóa', async () => {
      const t = (await authed('post', '/api/mindmap/todos').send({ title: 'Học 30 từ', date: today, durationMinutes: 30, effectiveness: 4 }).expect(201)).body.data;
      expect(t).toMatchObject({ durationMinutes: 30, effectiveness: 4 });
      await authed('patch', `/api/mindmap/todos/${t.id}`).send({ effectiveness: 6 }).expect(400);
      await authed('patch', `/api/mindmap/todos/${t.id}`).send({ durationMinutes: 2000 }).expect(400);
      const cleared = await authed('patch', `/api/mindmap/todos/${t.id}`).send({ durationMinutes: null }).expect(200);
      expect(cleared.body.data).toMatchObject({ durationMinutes: null, effectiveness: 4 });
      await authed('delete', `/api/mindmap/todos/${t.id}`).expect(200);
    });

    it('liên kết: tạo 3 loại, chặn tự nối / trùng / khác mindmap / vòng điều kiện; sửa, xóa; xóa node → mất liên kết', async () => {
      const mk = async (title: string) => (await authed('post', `${gbase()}/nodes`).send({ parentId: groot, title }).expect(201)).body.data.id as number;
      const a = await mk('SQL cơ bản');
      const b = await mk('Tối ưu query');
      const c = await mk('Thiết kế DB');
      const link = (k: string, s: number, t: number) => authed('post', `${gbase()}/links`).send({ sourceNodeId: s, targetNodeId: t, kind: k });

      const pre = (await link('prerequisite', a, b).expect(201)).body.data;
      expect(pre).toMatchObject({ sourceNodeId: a, targetNodeId: b, kind: 'prerequisite', note: null });
      await link('prerequisite', b, c).expect(201);
      const cyc = await link('prerequisite', c, a).expect(400);
      expect(cyc.body.message).toContain('vòng');
      await link('prerequisite', a, b).expect(400);
      await link('supports', a, a).expect(400);
      await link('supports', a, leaf).expect(400); // leaf thuộc mindmap khác (đã xóa) / không thuộc mindmap này
      const sup = (await link('supports', c, a).expect(201)).body.data; // bổ trợ được phép ngược chiều
      const rel = (await authed('post', `${gbase()}/links`).send({ sourceNodeId: a, targetNodeId: c, kind: 'related', note: '  cùng chủ đề  ' }).expect(201)).body.data;
      expect(rel.note).toBe('cùng chủ đề');

      // Đổi bổ trợ c→a thành điều kiện trước sẽ tạo vòng a→b→c→a
      await authed('patch', `${gbase()}/links/${sup.id}`).send({ kind: 'prerequisite' }).expect(400);
      const edited = await authed('patch', `${gbase()}/links/${rel.id}`).send({ note: null }).expect(200);
      expect(edited.body.data.note).toBeNull();

      expect((await authed('get', `${gbase()}/links`).expect(200)).body.data).toHaveLength(4);
      await authed('delete', `${gbase()}/links/${rel.id}`).expect(200);
      await authed('delete', `${gbase()}/nodes/${b}`).expect(200);
      const left = (await authed('get', `${gbase()}/links`).expect(200)).body.data;
      expect(left.map((l: { id: number }) => l.id)).toEqual([sup.id]);
      await authed('delete', `${gbase()}/links/${pre.id}`).expect(404);
    });
  });

  it('đổi mật khẩu: sai mật khẩu cũ → 400; đúng → token mới, đăng nhập bằng mật khẩu mới', async () => {
    await authed('post', '/api/auth/change-password').send({ currentPassword: 'sai', newPassword: 'mat-khau-moi-123' }).expect(400);
    const next = randomBytes(18).toString('base64url');
    const r = await authed('post', '/api/auth/change-password').send({ currentPassword: password, newPassword: next }).expect(200);
    expect(r.body.data.access_token).toBeTruthy();
    password = next;
    await api().post('/api/auth/login').send({ username, password }).expect(200);
  });

  it('mindmap của người khác / đã xóa → 404', async () => {
    await authed('delete', `/api/mindmap/mindmaps/${mindmapId}`).expect(200);
    await authed('get', `/api/mindmap/mindmaps/${mindmapId}`).expect(404);
    await authed('get', `${base()}/nodes`).expect(404);
  });
});
