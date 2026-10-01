// Kiểm tra toàn bộ API với DB thật (MySQL local), chỉ ĐỌC dữ liệu tài chính.
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
  const authed = (method: 'get' | 'post' | 'patch' | 'put', url: string) => api()[method](url).set('Authorization', `Bearer ${access}`);

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    setupApp(app);
    await app.init();
    prisma = app.get(PrismaService);
    await prisma.user.create({ data: { username, passwordHash: await hashPassword(password) } });
  });

  afterAll(async () => {
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

  it('cron/sync sai secret → 401', async () => {
    await api().get('/api/cron/sync?secret=sai').expect(401);
  });

  it('đăng xuất thu hồi refresh token', async () => {
    await api().post('/api/auth/logout').send({ refresh_token: refresh }).expect(200);
    await api().post('/api/auth/refresh-token').send({ refresh_token: refresh }).expect(401);
  });
});
