// Kiểm tra toàn bộ API với DB thật (PostgreSQL local), chỉ ĐỌC dữ liệu tài chính
// (riêng mục tiêu tiết kiệm: tạo một mục tiêu tạm rồi xóa ngay, không gắn giao dịch nào).
// Tạo một user tạm với mật khẩu ngẫu nhiên → không cần biết mật khẩu admin; xóa user khi xong.
//   npm run test:e2e
import { randomBytes, randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { setupApp } from '../src/app.setup';
import { PrismaService } from '../src/database/prisma.service';
import { hashPassword } from '../src/modules/auth/utils/password.util';
import { addMonths, currentMonthVN } from '../src/common/utils/dates.util';

process.env.EMAIL_POLL_MINUTES = '0'; // không tự đọc email trong test

const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

describe('Personal Finance API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const username = `e2e_${randomUUID().slice(0, 8)}`;
  const password = randomBytes(18).toString('base64url');
  let access = '';
  let refresh = '';

  const api = () => request(app.getHttpServer());
  const authed = (method: 'get' | 'post' | 'patch' | 'put' | 'delete', url: string) => api()[method](url).set('Authorization', `Bearer ${access}`);

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    setupApp(app);
    await app.init();
    prisma = app.get(PrismaService);
    await prisma.user.create({ data: { username, passwordHash: await hashPassword(password) } });
  });

  afterAll(async () => {
    await prisma?.savingsGoal.deleteMany({ where: { name: { startsWith: username } } });
    await prisma?.categoryGroup.deleteMany({ where: { name: { startsWith: username } } }); // hạn mức nhóm bị xóa theo
    await prisma?.category.deleteMany({ where: { name: { startsWith: username } } }); // hạn mức danh mục bị xóa theo
    await prisma?.account.deleteMany({ where: { name: { startsWith: username } } }); // giao dịch tạm bị xóa theo
    await prisma?.user.deleteMany({ where: { username } }); // refresh token bị xóa theo (cascade)
    await app?.close();
  });

  it('GET /health không cần đăng nhập', async () => {
    const r = await api().get('/health').expect(200);
    expect(r.body.status).toBe('ok');
  });

  it('chặn khi chưa đăng nhập, lỗi đúng định dạng', async () => {
    const r = await api().get('/api/accounts').expect(401);
    expect(r.body).toMatchObject({ statusCode: 401, message: 'Chưa đăng nhập', path: '/api/accounts' });
  });

  it('đăng nhập sai → 401, thiếu trường → 400', async () => {
    await api().post('/api/auth/login').send({ username, password: 'sai-mat-khau' }).expect(401);
    const r = await api().post('/api/auth/login').send({ username: '' }).expect(400);
    expect(r.body.message).toMatch(/^username:/);
  });

  it('đăng nhập đúng → access + refresh token', async () => {
    const r = await api().post('/api/auth/login').send({ username, password }).expect(200);
    expect(r.body).toMatchObject({ statusCode: 200, data: { user: { username } } });
    access = r.body.data.access_token;
    refresh = r.body.data.refresh_token;
    expect(access).toBeTruthy();
    expect(refresh).toBeTruthy();
  });

  it('GET /api/auth/me', async () => {
    const r = await authed('get', '/api/auth/me').expect(200);
    expect(r.body.data.username).toBe(username);
  });

  it('refresh token xoay vòng: token cũ không dùng lại được', async () => {
    const r = await api().post('/api/auth/refresh-token').send({ refresh_token: refresh }).expect(200);
    const old = refresh;
    access = r.body.data.access_token;
    refresh = r.body.data.refresh_token;
    await api().post('/api/auth/refresh-token').send({ refresh_token: old }).expect(401);
  });

  it.each([
    '/api/accounts',
    '/api/categories',
    '/api/rules',
    '/api/transactions?pageSize=10&sort=amount_desc',
    '/api/transfers/scan',
    '/api/budgets',
    '/api/budgets?month=2026-09',
    '/api/stats/dashboard?from=2026-09-01&to=2026-09-30',
    '/api/stats/report',
    '/api/email/status',
    '/api/goals',
    '/api/goals/linkable-transactions?direction=OUT',
  ])('GET %s → 200 + envelope', async (url) => {
    const r = await authed('get', url).expect(200);
    expect(r.body).toEqual(expect.objectContaining({ statusCode: 200, timestamp: expect.any(String), data: expect.anything() }));
  });

  it('GET /api/transactions trả đúng dạng phân trang', async () => {
    const r = await authed('get', '/api/transactions?pageSize=10').expect(200);
    expect(r.body.data).toEqual(
      expect.objectContaining({ items: expect.any(Array), total: expect.any(Number), page: 1, pageSize: 10 }),
    );
  });

  it.each(['/api/transactions/export', '/api/stats/report/export'])('GET %s → file Excel', async (url) => {
    const r = await authed('get', url).expect(200);
    expect(r.headers['content-type']).toContain(XLSX);
    expect(r.headers['content-disposition']).toMatch(/attachment; filename=".+\.xlsx"/);
  });

  it('kiểm tra tham số: khoảng ngày sai → 400', async () => {
    const r = await authed('get', '/api/stats/dashboard?from=2026-09-30&to=2026-09-01').expect(400);
    expect(r.body.message).toBe('Khoảng ngày không hợp lệ');
  });

  it("route 'bulk' không bị ':id' bắt nhầm", async () => {
    const r = await authed('patch', '/api/transactions/bulk').send({}).expect(400);
    expect(r.body.message).toMatch(/^ids:/);
  });

  describe('mục tiêu tiết kiệm', () => {
    const month = currentMonthVN();
    let goalId = 0;
    const view = async () => {
      const r = await authed('get', '/api/goals').expect(200);
      return r.body.data.goals.find((g: { id: number }) => g.id === goalId);
    };

    it('kiểm tra dữ liệu: số tiền mục tiêu phải > 0', async () => {
      const r = await authed('post', '/api/goals').send({ name: `${username} x`, targetAmount: 0 }).expect(400);
      expect(r.body.message).toMatch(/^targetAmount:/);
    });

    it('tạo mục tiêu có số tiền ban đầu → dự báo theo kế hoạch nạp', async () => {
      const r = await authed('post', '/api/goals')
        .send({ name: `${username} quỹ`, targetAmount: 10_000_000, initialAmount: 2_000_000, monthlyPlan: 1_000_000, deadline: addMonths(month, 11), interestRate: 0 })
        .expect(201);
      goalId = r.body.data.id;
      const page = (await authed('get', '/api/goals').expect(200)).body.data;
      expect(page.overview).toEqual(
        expect.objectContaining({ totalBalance: expect.any(Number), ongoing: expect.any(Object), health: expect.objectContaining({ factors: expect.any(Array) }) }),
      );
      const g = await view();
      expect(g).toMatchObject({ saved: 2_000_000, remaining: 8_000_000, projectedMonths: 8, projectedMonth: addMonths(month, 8), status: 'on_track', horizon: 'short', monthsLeft: 12, completedAt: null });
      expect(g.thisMonth.due).toBe(1_000_000);
    });

    it('nạp đủ kế hoạch tháng → hết nhắc; rút quá số đã có → 400', async () => {
      await authed('post', `/api/goals/${goalId}/contributions`).send({ kind: 'DEPOSIT', amount: 1_000_000 }).expect(201);
      expect((await view()).thisMonth).toMatchObject({ deposited: 1_000_000, due: 0 });
      const r = await authed('post', `/api/goals/${goalId}/contributions`).send({ kind: 'WITHDRAW', amount: 50_000_000 }).expect(400);
      expect(r.body.message).toBe('Số tiền rút lớn hơn số còn trong quỹ');
    });

    it('chạm mục tiêu → hoàn thành; rút bớt → bỏ hoàn thành', async () => {
      await authed('post', `/api/goals/${goalId}/contributions`).send({ kind: 'DEPOSIT', amount: 7_000_000 }).expect(201);
      let g = await view();
      expect(g.status).toBe('done');
      expect(g.completedAt).not.toBeNull();
      await authed('post', `/api/goals/${goalId}/contributions`).send({ kind: 'WITHDRAW', amount: 500_000 }).expect(201);
      g = await view();
      expect(g).toMatchObject({ saved: 9_500_000, completedAt: null });
      const list = await authed('get', `/api/goals/${goalId}/contributions`).expect(200);
      expect(list.body.data.map((c: { kind: string }) => c.kind)).toEqual(expect.arrayContaining(['OPENING', 'DEPOSIT', 'WITHDRAW']));
      await authed('delete', `/api/goals/contributions/${list.body.data[0].id}`).expect(200);
      expect((await view()).saved).toBe(10_000_000);
    });

    it('gắn giao dịch: loại khỏi thống kê, không gắn trùng, xóa lần nạp thì trả lại', async () => {
      // Tài khoản + giao dịch tạm (không đụng dữ liệu thật)
      const acc = await prisma.account.create({ data: { type: 'CASH', name: `${username} ví tạm` } });
      const txn = await prisma.transaction.create({
        data: { accountId: acc.id, source: 'MANUAL', direction: 'OUT', amount: 300_000n, content: 'e2e chuyen tiet kiem', transactionDate: new Date() },
      });
      await authed('post', `/api/goals/${goalId}/contributions`).send({ kind: 'DEPOSIT', transactionId: txn.id, excludeFromStats: true }).expect(201);
      expect((await prisma.transaction.findUniqueOrThrow({ where: { id: txn.id } })).excludeFromStats).toBe(true);
      const dup = await authed('post', `/api/goals/${goalId}/contributions`).send({ kind: 'DEPOSIT', transactionId: txn.id }).expect(400);
      expect(dup.body.message).toMatch(/đã được gắn/);
      const list = await authed('get', `/api/goals/${goalId}/contributions`).expect(200);
      const linked = list.body.data.find((c: { transactionId: number | null }) => c.transactionId === txn.id);
      expect(linked).toMatchObject({ amount: 300_000, excludedTxn: true });
      await authed('delete', `/api/goals/contributions/${linked.id}`).expect(200);
      expect((await prisma.transaction.findUniqueOrThrow({ where: { id: txn.id } })).excludeFromStats).toBe(false);
    });

    it('tiêu tiền của quỹ: vẫn hoàn thành, giảm số còn trong quỹ; tiêu quá số còn → 400', async () => {
      await authed('post', `/api/goals/${goalId}/contributions`).send({ kind: 'SPEND', amount: 4_000_000, note: 'Đã dùng' }).expect(201);
      let g = await view();
      expect(g).toMatchObject({ saved: 10_000_000, spent: 4_000_000, balance: 6_000_000, spendStatus: 'partial', status: 'done' });
      expect(g.completedAt).not.toBeNull();
      const r = await authed('post', `/api/goals/${goalId}/contributions`).send({ kind: 'SPEND', amount: 7_000_000 }).expect(400);
      expect(r.body.message).toBe('Số tiền tiêu lớn hơn số còn trong quỹ');
      await authed('post', `/api/goals/${goalId}/contributions`).send({ kind: 'SPEND', amount: 6_000_000 }).expect(201);
      g = await view();
      expect(g).toMatchObject({ balance: 0, spendStatus: 'spent', status: 'done' });
      // Hết tiền trong quỹ thì không rút được nữa
      await authed('post', `/api/goals/${goalId}/contributions`).send({ kind: 'WITHDRAW', amount: 1 }).expect(400);
    });

    it('quỹ duy trì: tiêu bớt thì quay lại tích lũy, nạp bù đầy thì hoàn thành lại', async () => {
      const r = await authed('post', '/api/goals')
        .send({ name: `${username} khẩn cấp`, jar: 'SAFETY', targetAmount: 1_000_000, initialAmount: 1_000_000 })
        .expect(201);
      const id = r.body.data.id;
      const get = async () => (await authed('get', '/api/goals').expect(200)).body.data.goals.find((g: { id: number }) => g.id === id);
      expect(await get()).toMatchObject({ ongoing: true, status: 'done', current: 1_000_000 });
      await authed('post', `/api/goals/${id}/contributions`).send({ kind: 'SPEND', amount: 400_000 }).expect(201);
      let g = await get();
      expect(g).toMatchObject({ saved: 1_000_000, current: 600_000, remaining: 400_000, completedAt: null });
      expect(g.status).not.toBe('done');
      await authed('post', `/api/goals/${id}/contributions`).send({ kind: 'DEPOSIT', amount: 400_000 }).expect(201);
      g = await get();
      expect(g).toMatchObject({ current: 1_000_000, status: 'done' });
      // Chuyển sang quỹ một lần: tiến độ tính theo số đã tích lũy (1,4tr) → vẫn hoàn thành
      await authed('patch', `/api/goals/${id}`).send({ ongoing: false }).expect(200);
      expect(await get()).toMatchObject({ ongoing: false, current: 1_400_000, status: 'done' });
      await authed('delete', `/api/goals/${id}`).expect(200);
    });

    it('lưu trữ rồi xóa mục tiêu', async () => {
      await authed('post', `/api/goals/${goalId}/archive`).send({ archived: true }).expect(200);
      expect((await view()).archivedAt).not.toBeNull();
      await authed('delete', `/api/goals/${goalId}`).expect(200);
      expect(await view()).toBeUndefined();
    });
  });

  describe('hạn mức theo nhóm', () => {
    let groupId = 0;
    let categoryId = 0;
    const groupOf = async () => {
      const r = await authed('get', '/api/budgets').expect(200);
      return r.body.data.groups.find((g: { groupId: number }) => g.groupId === groupId);
    };

    beforeAll(async () => {
      const g = await prisma.categoryGroup.create({ data: { name: `${username} nhóm`, kind: 'EXPENSE' } });
      const c = await prisma.category.create({ data: { name: `${username} di chuyển`, kind: 'EXPENSE', groupId: g.id } });
      groupId = g.id;
      categoryId = c.id;
    });

    it('đặt hạn mức mặc định cho nhóm → trang ngân sách trả về nhóm có hạn mức', async () => {
      await authed('put', '/api/budgets').send({ items: [{ groupId, month: '*', amount: 1_000_000 }] }).expect(200);
      const g = await groupOf();
      expect(g).toMatchObject({ amount: 1_000_000, source: 'DEFAULT', categoryIds: [categoryId], categoriesBudget: null });
    });

    it('hạn mức danh mục trong nhóm không được vượt hạn mức nhóm', async () => {
      const r = await authed('put', '/api/budgets').send({ items: [{ categoryId, month: '*', amount: 2_000_000 }] }).expect(400);
      expect(r.body.message).toMatch(/vượt hạn mức nhóm/);
      await authed('put', '/api/budgets').send({ items: [{ categoryId, month: '*', amount: 600_000 }] }).expect(200);
      expect((await groupOf()).categoriesBudget).toBe(600_000);
    });

    it('không hạ hạn mức nhóm xuống dưới tổng các danh mục; gửi cả hai khóa → 400', async () => {
      await authed('put', '/api/budgets').send({ items: [{ groupId, month: '*', amount: 500_000 }] }).expect(400);
      await authed('put', '/api/budgets').send({ items: [{ groupId, categoryId, month: '*', amount: 1 }] }).expect(400);
    });

    it('xóa hạn mức nhóm', async () => {
      await authed('put', '/api/budgets').send({ items: [{ groupId, month: '*', amount: null }] }).expect(200);
      expect((await groupOf()).amount).toBeNull();
    });
  });

  it('cron/sync sai secret → 401', async () => {
    await api().get('/api/cron/sync?secret=sai').expect(401);
  });

  it('đăng xuất thu hồi refresh token', async () => {
    await api().post('/api/auth/logout').send({ refresh_token: refresh }).expect(200);
    await api().post('/api/auth/refresh-token').send({ refresh_token: refresh }).expect(401);
  });
});
